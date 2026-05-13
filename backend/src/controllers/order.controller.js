/**
 * PROJECT-X — Order Controller
 *
 * Handles the complete order lifecycle:
 * Place → Confirm → Assign → Pick Up → Deliver → Verify OTP
 *
 * Real-time updates pushed via Socket.io on every status change.
 */

const Order = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const User = require('../models/User');
const { Coupon, Notification, Chat } = require('../models/index');
const { getIO } = require('../socket');
const { createNotification } = require('../services/notification.service');
const { verifyRazorpayPayment } = require('../services/payment.service');
const { autoAssignDelivery } = require('../services/assignment.service');
const AppError = require('../utils/AppError');

// ── Place Order ───────────────────────────────────────────────
exports.placeOrder = async (req, res, next) => {
  const { items, deliveryAddressId, paymentMethod, couponCode, walletAmount } = req.body;

  // 1. Fetch customer profile
  const customer = await Customer.findOne({ user: req.user._id }).populate('addresses');
  if (!customer) throw new AppError('Customer profile not found.', 404);

  const deliveryAddress = customer.addresses.id(deliveryAddressId);
  if (!deliveryAddress) throw new AppError('Delivery address not found.', 400);

  // 2. Validate products and calculate pricing
  const orderItems = [];
  let subtotal = 0;
  let mrpTotal = 0;

  for (const item of items) {
    const product = await Product.findById(item.productId);
    if (!product) throw new AppError(`Product not found: ${item.productId}`, 404);
    if (!product.isActive) throw new AppError(`${product.name} is no longer available.`, 400);
    if (product.isOutOfStock || product.stock < item.quantity) {
      throw new AppError(`${product.name} - insufficient stock.`, 400);
    }

    const unitPrice = product.effectivePrice;
    const itemTotal = unitPrice * item.quantity;
    subtotal += itemTotal;
    mrpTotal += product.mrp * item.quantity;

    orderItems.push({
      product: product._id,
      productSnapshot: {
        name: product.name,
        image: product.images[0]?.url || '',
        mrp: product.mrp,
        price: unitPrice,
        brand: product.brand,
      },
      quantity: item.quantity,
      unitPrice,
      totalPrice: itemTotal,
      savingsVsMRP: (product.mrp - unitPrice) * item.quantity,
    });
  }

  // 3. Apply coupon
  let couponDiscount = 0;
  let appliedCoupon = null;
  if (couponCode) {
    const coupon = await Coupon.findOne({
      code: couponCode.toUpperCase(),
      isActive: true,
      validUntil: { $gte: new Date() },
    });

    if (!coupon) throw new AppError('Invalid or expired coupon code.', 400);
    if (coupon.minOrderAmount > subtotal) {
      throw new AppError(`Minimum order amount ₹${coupon.minOrderAmount} required for this coupon.`, 400);
    }

    const alreadyUsed = await Order.countDocuments({
      customer: req.user._id,
      'coupon.couponId': coupon._id,
      status: { $nin: ['cancelled'] },
    });
    if (alreadyUsed >= coupon.perUserLimit) {
      throw new AppError('You have already used this coupon.', 400);
    }

    if (coupon.type === 'percentage') {
      couponDiscount = Math.min((subtotal * coupon.value) / 100, coupon.maxDiscountAmount || Infinity);
    } else if (coupon.type === 'fixed') {
      couponDiscount = Math.min(coupon.value, subtotal);
    }

    appliedCoupon = { code: coupon.code, couponId: coupon._id, discount: couponDiscount };
  }

  // 4. Calculate total
  const deliveryFee = subtotal >= 199 ? 0 : 19; // Free delivery above ₹199
  const platformFee = 2; // Flat ₹2 platform fee
  const cashbackApplied = 0; // Future: loyalty cashback
  const walletDeducted = Math.min(walletAmount || 0, customer.wallet.balance);
  const totalAmount = Math.max(0, subtotal + deliveryFee + platformFee - couponDiscount - walletDeducted);

  // 5. Create order
  const order = await Order.create({
    customer: req.user._id,
    items: orderItems,
    deliveryAddress: {
      hostelName: deliveryAddress.hostelName,
      roomNumber: deliveryAddress.roomNumber,
      block: deliveryAddress.block,
      floor: deliveryAddress.floor,
      landmark: deliveryAddress.landmark,
      coordinates: deliveryAddress.coordinates,
      district: customer.district,
      locality: customer.locality,
    },
    pricing: {
      subtotal,
      mrpTotal,
      totalSavings: mrpTotal - subtotal,
      deliveryFee,
      platformFee,
      couponDiscount,
      cashbackApplied,
      walletDeducted,
      totalAmount,
    },
    coupon: appliedCoupon,
    payment: {
      method: paymentMethod,
      status: paymentMethod === 'cod' ? 'pending' : 'pending',
    },
    statusHistory: [{
      status: 'pending',
      updatedBy: req.user._id,
      updatedByRole: 'customer',
      note: 'Order placed by customer',
    }],
  });

  // 6. Deduct wallet if used
  if (walletDeducted > 0) {
    await Customer.findByIdAndUpdate(customer._id, {
      $inc: { 'wallet.balance': -walletDeducted },
      $push: {
        'wallet.transactions': {
          type: 'debit',
          amount: walletDeducted,
          description: `Order #${order.orderNumber}`,
          orderId: order._id,
        },
      },
    });
  }

  // 7. Mark coupon used
  if (appliedCoupon) {
    await Coupon.findByIdAndUpdate(appliedCoupon.couponId, { $inc: { usedCount: 1 } });
    await Customer.findByIdAndUpdate(customer._id, {
      $addToSet: { usedCoupons: appliedCoupon.couponId },
    });
  }

  res.status(201).json({
    success: true,
    message: 'Order placed successfully!',
    data: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      totalAmount: order.pricing.totalAmount,
      paymentMethod,
    },
  });
};

// ── Verify Payment & Confirm Order ────────────────────────────
exports.confirmPayment = async (req, res, next) => {
  const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Order not found.', 404);
  if (order.customer.toString() !== req.user._id.toString()) {
    throw new AppError('Unauthorized.', 403);
  }

  if (order.payment.method === 'razorpay') {
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new AppError('Missing Razorpay payment details.', 400);
    }

    const isValid = verifyRazorpayPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      order.payment.status = 'failed';
      await order.save();
      throw new AppError('Payment verification failed. Please contact support.', 400);
    }

    order.payment.razorpayOrderId = razorpayOrderId;
    order.payment.razorpayPaymentId = razorpayPaymentId;
    order.payment.razorpaySignature = razorpaySignature;
    order.payment.paidAt = new Date();
    order.payment.status = 'paid';
    order.status = 'confirmed';
    order.confirmedAt = new Date();
    order.statusHistory.push({
      status: 'confirmed',
      updatedBy: req.user._id,
      updatedByRole: 'customer',
      note: 'Payment confirmed via Razorpay',
    });
  } else if (order.payment.method === 'cod') {
    order.payment.status = 'paid';
    order.payment.paidAt = new Date();
    order.status = 'confirmed';
    order.confirmedAt = new Date();
    order.statusHistory.push({
      status: 'confirmed',
      updatedBy: req.user._id,
      updatedByRole: 'customer',
      note: 'Payment confirmed via Cash on Delivery',
    });
  } else {
    throw new AppError('Unsupported payment method.', 400);
  }

  await order.save();

  // Deduct stock
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: {
        stock: -item.quantity,
        'analytics.orderCount': 1,
        'analytics.revenue': item.totalPrice,
      },
    });
    // Check and update out-of-stock flag
    const product = await Product.findById(item.product);
    if (product && product.stock <= 0) {
      product.isOutOfStock = true;
      await product.save();
    }
  }

  // Update customer stats
  await Customer.findOneAndUpdate(
    { user: req.user._id },
    {
      $inc: {
        'stats.totalOrders': 1,
        'stats.totalSpent': order.pricing.totalAmount,
        'stats.totalSaved': order.pricing.totalSavings,
      },
    }
  );

  // Auto-assign to distributor
  await autoAssignDelivery(order);

  // Create chat room for order
  const chatExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h
  const Chat_Model = require('../models/index').Chat;
  const chatRoom = await Chat_Model.create({
    roomId: `order-${order._id}`,
    order: order._id,
    participants: [{ user: req.user._id, role: 'customer' }],
    expiresAt: chatExpiresAt,
  });

  order.chatRoomId = chatRoom.roomId;
  order.chatExpiresAt = chatExpiresAt;
  await order.save();

  // Notifications
  await createNotification({
    recipient: req.user._id,
    type: 'order_confirmed',
    title: '✅ Order Confirmed!',
    body: `Order #${order.orderNumber} confirmed. Delivery OTP: ${order.deliveryOTP.code}`,
    data: { orderId: order._id },
  });

  // Real-time update
  const io = getIO();
  io.to(`user-${req.user._id}`).emit('order:confirmed', {
    orderId: order._id,
    orderNumber: order.orderNumber,
    deliveryOTP: order.deliveryOTP.code,
  });

  res.json({
    success: true,
    message: 'Payment confirmed! Order is being processed.',
    data: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      deliveryOTP: order.deliveryOTP.code,
      chatRoomId: chatRoom.roomId,
    },
  });
};

// ── Admin / Support: Get All Orders ─────────────────────────────
exports.getOrders = async (req, res, next) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const filter = {};

  if (status) filter.status = status;

  if (search) {
    const regex = new RegExp(search.trim(), 'i');
    const matchingUsers = await User.find({
      $or: [
        { name: regex },
        { email: regex },
        { phone: regex },
      ],
    }).select('_id');
    const customerIds = matchingUsers.map((user) => user._id);

    filter.$or = [
      { orderNumber: regex },
      { 'deliveryAddress.hostelName': regex },
      { customer: { $in: customerIds } },
    ];
  }

  const orders = await Order.find(filter)
    .populate('customer', 'name email phone')
    .populate('distributor', 'name phone')
    .populate('deliveryDude', 'name phone')
    .sort({ createdAt: -1 })
    .skip((page - 1) * parseInt(limit))
    .limit(parseInt(limit));

  const total = await Order.countDocuments(filter);

  res.json({
    success: true,
    data: {
      orders,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    },
  });
};

// ── Get My Orders ─────────────────────────────────────────────
exports.getMyOrders = async (req, res, next) => {
  const { page = 1, limit = 10, status } = req.query;
  const filter = { customer: req.user._id };

  if (status) filter.status = status;

  const orders = await Order.find(filter)
    .populate('items.product', 'name images mrp price')
    .sort({ createdAt: -1 })
    .skip((page - 1) * parseInt(limit))
    .limit(parseInt(limit));

  const total = await Order.countDocuments(filter);

  res.json({
    success: true,
    data: {
      orders,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    },
  });
};

// ── Get Order By ID ────────────────────────────────────────────
exports.getOrderById = async (req, res, next) => {
  const order = await Order.findById(req.params.id)
    .populate('items.product', 'name images mrp price')
    .populate('customer', 'name phone email')
    .populate('distributor', 'name phone')
    .populate('deliveryDude', 'name phone avatar');

  if (!order) throw new AppError('Order not found.', 404);

  // Check authorization
  const isOwner = order.customer._id.toString() === req.user._id.toString();
  const isAssigned =
    order.distributor?._id.toString() === req.user._id.toString() ||
    order.deliveryDude?._id.toString() === req.user._id.toString();
  const isAdminOrSupport = ['admin', 'support'].includes(req.user.role);

  if (!isOwner && !isAssigned && !isAdminOrSupport) {
    throw new AppError('Access denied.', 403);
  }

  res.json({ success: true, data: { order } });
};

// ── Update Order Status (Distributor/Delivery) ────────────────
exports.updateOrderStatus = async (req, res, next) => {
  const { status, note, location } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found.', 404);

  // Validate status transition
  const validTransitions = {
    distributor: {
      confirmed: 'distributor_ordered',
      distributor_ordered: 'picked_up',
    },
    delivery: {
      picked_up: 'out_for_delivery',
      out_for_delivery: 'failed_delivery',
    },
    admin: ['cancelled', 'refund_initiated'],
  };

  const allowedNext = validTransitions[req.user.role]?.[order.status];
  if (typeof allowedNext === 'string' && allowedNext !== status) {
    throw new AppError(`Cannot transition from '${order.status}' to '${status}'.`, 400);
  }

  order.status = status;
  order.statusHistory.push({
    status,
    updatedBy: req.user._id,
    updatedByRole: req.user.role,
    note,
    location,
  });

  // Set timestamps
  const timestampMap = {
    distributor_ordered: 'distributorAssignedAt',
    picked_up: 'pickedUpAt',
    delivered: 'deliveredAt',
    cancelled: 'cancelledAt',
  };
  if (timestampMap[status]) order[timestampMap[status]] = new Date();

  await order.save();

  // Real-time update to customer
  const io = getIO();
  io.to(`user-${order.customer}`).emit('order:status_update', {
    orderId: order._id,
    status,
    timestamp: new Date(),
    note,
  });

  // Notify customer
  const statusMessages = {
    distributor_ordered: { title: '🛒 Order Placed!', body: 'Your items are being procured.' },
    picked_up: { title: '📦 Items Picked Up!', body: 'Your delivery is on the way.' },
    out_for_delivery: { title: '🏃 Out for Delivery!', body: 'Delivery dude is near your hostel.' },
    delivered: { title: '✅ Delivered!', body: 'Enjoy your order. Leave a review!' },
    failed_delivery: { title: '❌ Delivery Failed', body: 'We could not deliver. Please contact support.' },
  };

  if (statusMessages[status]) {
    await createNotification({
      recipient: order.customer,
      type: `order_${status}`.replace('_', '') || 'order_confirmed',
      ...statusMessages[status],
      data: { orderId: order._id },
    });
  }

  res.json({
    success: true,
    message: `Order status updated to '${status}'.`,
    data: { order },
  });
};

// ── Verify Delivery OTP ───────────────────────────────────────
exports.verifyDeliveryOTP = async (req, res, next) => {
  const { otp } = req.body;
  const order = await Order.findById(req.params.id).select('+deliveryOTP.code');

  if (!order) throw new AppError('Order not found.', 404);
  if (order.status !== 'out_for_delivery') {
    throw new AppError('Order is not out for delivery.', 400);
  }

  // Check OTP expiry
  if (order.deliveryOTP.expiresAt < new Date()) {
    throw new AppError('Delivery OTP has expired. Please contact support.', 400);
  }

  // Limit OTP attempts
  if (order.deliveryOTP.attempts >= 5) {
    throw new AppError('Too many incorrect OTP attempts. Contact support.', 400);
  }

  if (order.deliveryOTP.code !== otp) {
    order.deliveryOTP.attempts += 1;
    await order.save();
    const remaining = 5 - order.deliveryOTP.attempts;
    throw new AppError(`Incorrect OTP. ${remaining} attempts remaining.`, 400);
  }

  // OTP verified — mark delivered
  order.status = 'delivered';
  order.deliveredAt = new Date();
  order.deliveryOTP.verifiedAt = new Date();
  order.statusHistory.push({
    status: 'delivered',
    updatedBy: req.user._id,
    updatedByRole: req.user.role,
    note: 'Delivery OTP verified successfully',
  });

  await order.save();

  // Close chat after delivery (set shorter expiry)
  await require('../models/index').Chat.findOneAndUpdate(
    { order: order._id },
    { expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) } // 2h post-delivery
  );

  // Update delivery dude earnings/stats
  await User.findByIdAndUpdate(order.deliveryDude, {
    $inc: { rewardPoints: 10 },
  });

  const io = getIO();
  io.to(`user-${order.customer}`).emit('order:delivered', { orderId: order._id });
  io.to(`user-${order.deliveryDude}`).emit('order:verified', { orderId: order._id });

  await createNotification({
    recipient: order.customer,
    type: 'order_delivered',
    title: '🎉 Order Delivered!',
    body: 'Your order was delivered. How was your experience?',
    data: { orderId: order._id },
  });

  res.json({
    success: true,
    message: 'Delivery confirmed! Enjoy your order.',
    data: { orderId: order._id },
  });
};

// ── Cancel Order ──────────────────────────────────────────────
exports.cancelOrder = async (req, res, next) => {
  const { reason } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) throw new AppError('Order not found.', 404);

  const cancellable = ['pending', 'confirmed'];
  if (!cancellable.includes(order.status)) {
    throw new AppError('Order cannot be cancelled at this stage.', 400);
  }

  order.status = 'cancelled';
  order.cancelledAt = new Date();
  order.cancellationReason = reason;
  order.cancelledBy = req.user._id;
  order.statusHistory.push({
    status: 'cancelled',
    updatedBy: req.user._id,
    updatedByRole: req.user.role,
    note: `Cancelled: ${reason}`,
  });

  // Initiate refund if paid
  if (order.payment.status === 'paid') {
    order.status = 'refund_initiated';
    order.payment.status = 'refunded';
    // TODO: Call Razorpay refund API
  }

  await order.save();

  // Restore stock
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: item.quantity },
      $set: { isOutOfStock: false },
    });
  }

  // Restore wallet deduction if any
  if (order.pricing.walletDeducted > 0) {
    await Customer.findOneAndUpdate(
      { user: order.customer },
      {
        $inc: { 'wallet.balance': order.pricing.walletDeducted },
        $push: {
          'wallet.transactions': {
            type: 'credit',
            amount: order.pricing.walletDeducted,
            description: `Refund for cancelled order #${order.orderNumber}`,
            orderId: order._id,
          },
        },
      }
    );
  }

  // Update cancellation stats
  await Customer.findOneAndUpdate(
    { user: req.user._id },
    { $inc: { 'stats.cancelledOrders': 1 } }
  );

  res.json({
    success: true,
    message: 'Order cancelled successfully.',
    data: { orderId: order._id, refundInitiated: order.payment.status === 'refunded' },
  });
};
