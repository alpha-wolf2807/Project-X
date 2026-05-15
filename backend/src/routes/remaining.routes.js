/**
 * CARTEX — Complaint Routes
 */
const express = require('express');
const complaintRouter = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { uploadComplaint } = require('../config/cloudinary');
const { Complaint } = require('../models/index');
const { createNotification } = require('../services/notification.service');
const AppError = require('../utils/AppError');

complaintRouter.use(protect);

// Customer: raise complaint
complaintRouter.post('/', authorize('customer'), uploadComplaint.array('proofImages', 5), async (req, res, next) => {
  const { orderId, category, subject, description } = req.body;
  const proofImages = req.files?.map(f => ({ url: f.path, publicId: f.filename })) || [];

  const complaint = await Complaint.create({
    customer: req.user._id,
    order: orderId,
    category,
    subject,
    description,
    proofImages,
  });

  // Route complaints to the region's support agents
  const User = require('../models/User');
  const Customer = require('../models/Customer');
  const customerProfile = await Customer.findOne({ user: req.user._id }).select('district locality');

  const supportFilter = { role: 'support', isActive: true };
  if (customerProfile?.locality) {
    supportFilter.locality = customerProfile.locality;
  } else if (customerProfile?.district) {
    supportFilter.district = customerProfile.district;
  }

  let supportUsers = await User.find(supportFilter);
  if (!supportUsers.length && customerProfile?.district) {
    supportUsers = await User.find({ role: 'support', isActive: true, district: customerProfile.district });
  }
  if (!supportUsers.length) {
    supportUsers = await User.find({ role: 'support', isActive: true });
  }

  if (supportUsers.length > 0) {
    complaint.assignedTo = supportUsers[0]._id;
    complaint.status = 'assigned';
    await complaint.save();
  }

  for (const s of supportUsers) {
    await createNotification({
      recipient: s._id,
      type: 'complaint_update',
      title: '🎫 New Complaint',
      body: `Ticket #${complaint.ticketNumber}: ${subject}`,
      data: { complaintId: complaint._id },
    });
  }

  res.status(201).json({ success: true, data: { complaint } });
});

// Customer: get own complaints
complaintRouter.get('/my', authorize('customer'), async (req, res, next) => {
  const complaints = await Complaint.find({ customer: req.user._id })
    .populate('assignedTo', 'name')
    .sort({ createdAt: -1 });
  res.json({ success: true, data: { complaints } });
});

// Support / Admin: get all complaints
complaintRouter.get('/', authorize('support', 'admin'), async (req, res, next) => {
  const { page = 1, limit = 20, status, priority } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (priority) filter.priority = priority;

  const complaints = await Complaint.find(filter)
    .populate('customer', 'name email phone')
    .populate('order', 'orderNumber')
    .populate('assignedTo', 'name')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await Complaint.countDocuments(filter);
  res.json({ success: true, data: { complaints, pagination: { total, page: parseInt(page) } } });
});

// Support: update complaint
complaintRouter.patch('/:id', authorize('support', 'admin'), async (req, res, next) => {
  const { status, priority, assignedTo, response, internalNote, resolution } = req.body;
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) throw new AppError('Complaint not found.', 404);

  if (status) complaint.status = status;
  if (priority) complaint.priority = priority;
  if (assignedTo) complaint.assignedTo = assignedTo;
  if (!complaint.firstResponseAt && response) complaint.firstResponseAt = new Date();
  if (response) {
    complaint.thread.push({ message: response, sentBy: req.user._id, sentByRole: req.user.role });
    await createNotification({
      recipient: complaint.customer,
      type: 'complaint_update',
      title: '📬 Complaint Update',
      body: `Your ticket #${complaint.ticketNumber} has been updated.`,
      data: { complaintId: complaint._id },
    });
  }
  if (internalNote) complaint.internalNotes.push({ note: internalNote, addedBy: req.user._id });
  if (resolution) {
    complaint.resolution = { ...resolution, resolvedAt: new Date(), resolvedBy: req.user._id };
    complaint.resolvedAt = new Date();
    complaint.status = 'resolved';
  }

  await complaint.save();
  res.json({ success: true, data: { complaint } });
});

module.exports = complaintRouter;

/**
 * CARTEX — Notification Routes
 */
const notifRouter = express.Router();
const { Notification } = require('../models/index');

notifRouter.use(protect);

notifRouter.get('/', async (req, res, next) => {
  const { page = 1, limit = 20, unreadOnly } = req.query;
  const filter = { recipient: req.user._id };
  if (unreadOnly === 'true') filter.isRead = false;

  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
  res.json({ success: true, data: { notifications, unreadCount } });
});

notifRouter.patch('/read-all', async (req, res, next) => {
  await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true, readAt: new Date() });
  res.json({ success: true, message: 'All notifications marked as read.' });
});

notifRouter.patch('/:id/read', async (req, res, next) => {
  await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { isRead: true, readAt: new Date() }
  );
  res.json({ success: true });
});

/**
 * CARTEX — Chat Routes
 */
const chatRouter = express.Router();
const { Chat, Message } = require('../models/index');

chatRouter.use(protect);

chatRouter.get('/:roomId/messages', async (req, res, next) => {
  const { page = 1, limit = 50 } = req.query;
  const chat = await Chat.findOne({ roomId: req.params.roomId });
  if (!chat) throw new AppError('Chat room not found.', 404);

  const isParticipant = chat.participants.some((p) => p.user.toString() === req.user._id.toString())
    || ['admin', 'support'].includes(req.user.role);
  if (!isParticipant) throw new AppError('Access denied.', 403);

  const messages = await Message.find({ chatRoom: req.params.roomId, deletedAt: null })
    .populate('sender', 'name avatar role')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  res.json({ success: true, data: { messages: messages.reverse() } });
});

/**
 * CARTEX — Zone Routes
 */
const zoneRouter = express.Router();
const { Zone } = require('../models/index');

zoneRouter.get('/', async (req, res, next) => {
  const zones = await Zone.find({ isActive: true }).populate('distributor', 'name phone');
  res.json({ success: true, data: { zones } });
});

zoneRouter.post('/', protect, authorize('admin'), async (req, res, next) => {
  const zone = await Zone.create(req.body);
  res.status(201).json({ success: true, data: { zone } });
});

zoneRouter.put('/:id', protect, authorize('admin'), async (req, res, next) => {
  const zone = await Zone.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, data: { zone } });
});

/**
 * CARTEX — Coupon Routes
 */
const couponRouter = express.Router();
const { Coupon } = require('../models/index');

couponRouter.post('/validate', protect, authorize('customer'), async (req, res, next) => {
  const { code, orderAmount } = req.body;
  const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true, validUntil: { $gte: new Date() } });
  if (!coupon) throw new AppError('Invalid or expired coupon.', 400);
  if (coupon.minOrderAmount > orderAmount) throw new AppError(`Min order ₹${coupon.minOrderAmount} required.`, 400);

  let discount = 0;
  if (coupon.type === 'percentage') discount = Math.min((orderAmount * coupon.value) / 100, coupon.maxDiscountAmount || Infinity);
  else if (coupon.type === 'fixed') discount = Math.min(coupon.value, orderAmount);
  else if (coupon.type === 'free_delivery') discount = 0; // Handled in checkout

  res.json({ success: true, data: { coupon: { code: coupon.code, type: coupon.type, value: coupon.value, discount } } });
});

couponRouter.get('/', protect, authorize('admin'), async (req, res, next) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.json({ success: true, data: { coupons } });
});

couponRouter.post('/', protect, authorize('admin'), async (req, res, next) => {
  const coupon = await Coupon.create({ ...req.body, createdBy: req.user._id });
  res.status(201).json({ success: true, data: { coupon } });
});

couponRouter.patch('/:id', protect, authorize('admin'), async (req, res, next) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, data: { coupon } });
});

couponRouter.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  await Coupon.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ success: true, message: 'Coupon deactivated.' });
});

/**
 * CARTEX — Category Routes
 */
const categoryRouter = express.Router();
const { Category } = require('../models/index');

categoryRouter.get('/', async (req, res, next) => {
  const categories = await Category.find({ isActive: true, parentCategory: null })
    .sort({ sortOrder: 1 });
  res.json({ success: true, data: { categories } });
});

categoryRouter.post('/', protect, authorize('admin'), async (req, res, next) => {
  const category = await Category.create(req.body);
  res.status(201).json({ success: true, data: { category } });
});

categoryRouter.put('/:id', protect, authorize('admin'), async (req, res, next) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, data: { category } });
});

/**
 * CARTEX — Distributor Routes
 */
const distributorRouter = express.Router();
const Order = require('../models/Order');

distributorRouter.use(protect, authorize('distributor', 'admin'));

distributorRouter.get('/orders', async (req, res, next) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = { distributor: req.user._id };
  if (status) filter.status = status;

  const orders = await Order.find(filter)
    .populate('customer', 'name phone')
    .populate('deliveryDude', 'name phone')
    .populate('items.product', 'name images')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await Order.countDocuments(filter);
  res.json({ success: true, data: { orders, pagination: { total, page: parseInt(page) } } });
});

distributorRouter.patch('/orders/:id/assign-delivery', async (req, res, next) => {
  const { deliveryDudeId } = req.body;
  const order = await Order.findOne({ _id: req.params.id, distributor: req.user._id });
  if (!order) throw new AppError('Order not found.', 404);

  order.deliveryDude = deliveryDudeId;
  await order.save();

  await createNotification({
    recipient: deliveryDudeId,
    type: 'order_assigned',
    title: '🛵 Delivery Assigned!',
    body: `You have a new delivery for order #${order.orderNumber}`,
    data: { orderId: order._id },
  });

  res.json({ success: true, message: 'Delivery dude manually reassigned.' });
});

distributorRouter.get('/delivery-dudes', async (req, res, next) => {
  const { Zone } = require('../models/index');
  const zone = await Zone.findOne({ distributor: req.user._id }).populate('deliveryDudes', 'name phone avatar rewardPoints isActive');
  if (!zone) return res.json({ success: true, data: { deliveryDudes: [] } });

  // Get active order count per dude
  const dudeIds = zone.deliveryDudes.map((d) => d._id);
  const workloads = await Order.aggregate([
    { $match: { deliveryDude: { $in: dudeIds }, status: { $in: ['picked_up', 'out_for_delivery'] } } },
    { $group: { _id: '$deliveryDude', activeOrders: { $sum: 1 } } },
  ]);

  const workloadMap = {};
  workloads.forEach((w) => workloadMap[w._id.toString()] = w.activeOrders);

  const deliveryDudes = zone.deliveryDudes.map((d) => ({
    ...d.toObject(),
    activeOrders: workloadMap[d._id.toString()] || 0,
  }));

  res.json({ success: true, data: { deliveryDudes } });
});

/**
 * CARTEX — Delivery Dude Routes
 */
const deliveryRouter = express.Router();

deliveryRouter.use(protect, authorize('delivery', 'admin'));

deliveryRouter.get('/my-deliveries', async (req, res, next) => {
  const { status } = req.query;
  const filter = { deliveryDude: req.user._id };
  if (status) filter.status = status;

  const orders = await Order.find(filter)
    .populate('customer', 'name phone')
    .populate('distributor', 'name phone')
    .sort({ createdAt: -1 })
    .limit(50);

  res.json({ success: true, data: { orders } });
});

deliveryRouter.get('/stats', async (req, res, next) => {
  const [totalDelivered, todayDeliveries, avgRating] = await Promise.all([
    Order.countDocuments({ deliveryDude: req.user._id, status: 'delivered' }),
    Order.countDocuments({
      deliveryDude: req.user._id,
      status: 'delivered',
      deliveredAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    }),
    Order.aggregate([
      { $match: { deliveryDude: req.user._id, 'rating.score': { $exists: true } } },
      { $group: { _id: null, avg: { $avg: '$rating.score' } } },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      totalDelivered,
      todayDeliveries,
      averageRating: avgRating[0]?.avg || 0,
      rewardPoints: req.user.rewardPoints,
    },
  });
});

/**
 * CARTEX — Support Routes
 */
const supportRouter = express.Router();

supportRouter.use(protect, authorize('support', 'admin'));

supportRouter.get('/stats', async (req, res, next) => {
  const { Complaint } = require('../models/index');
  const [open, resolved, avgResolutionTime] = await Promise.all([
    Complaint.countDocuments({ status: { $in: ['open', 'assigned', 'in_progress'] } }),
    Complaint.countDocuments({ status: 'resolved' }),
    Complaint.aggregate([
      { $match: { status: 'resolved', resolvedAt: { $exists: true } } },
      {
        $project: {
          resolutionTime: { $subtract: ['$resolvedAt', '$createdAt'] },
        },
      },
      { $group: { _id: null, avgMs: { $avg: '$resolutionTime' } } },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      openComplaints: open,
      resolvedComplaints: resolved,
      avgResolutionHours: avgResolutionTime[0] ? Math.round(avgResolutionTime[0].avgMs / 3600000) : 0,
    },
  });
});

/**
 * CARTEX — User Routes
 */
const userRouter = express.Router();
const { uploadAvatar } = require('../config/cloudinary');

userRouter.use(protect);

userRouter.patch('/profile', async (req, res, next) => {
  const allowedUpdates = ['name', 'phone'];
  const updates = {};
  allowedUpdates.forEach((f) => { if (req.body[f]) updates[f] = req.body[f]; });

  const user = await require('../models/User').findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  res.json({ success: true, data: { user } });
});

userRouter.post('/avatar', uploadAvatar.single('avatar'), async (req, res, next) => {
  if (!req.file) throw new AppError('No file uploaded.', 400);
  const user = await require('../models/User').findByIdAndUpdate(
    req.user._id,
    { avatar: { url: req.file.path, publicId: req.file.filename } },
    { new: true }
  );
  res.json({ success: true, data: { avatar: user.avatar } });
});

userRouter.patch('/change-password', async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const user = await require('../models/User').findById(req.user._id).select('+password');
  const isValid = await user.comparePassword(currentPassword);
  if (!isValid) throw new AppError('Current password is incorrect.', 400);
  user.password = newPassword;
  user.refreshTokenHash = undefined; // Invalidate all sessions
  await user.save();
  res.json({ success: true, message: 'Password changed. Please log in again.' });
});

// Customer: Cart management
userRouter.get('/cart', authorize('customer'), async (req, res, next) => {
  const customer = await Customer.findOne({ user: req.user._id })
    .populate('cart.product', 'name images price mrp isOutOfStock stock slug');
  res.json({ success: true, data: { cart: customer?.cart || [] } });
});

userRouter.post('/cart', authorize('customer'), async (req, res, next) => {
  const { productId, quantity } = req.body;
  const product = await Product.findById(productId);
  if (!product || !product.isActive) throw new AppError('Product not available.', 404);

  const customer = await Customer.findOne({ user: req.user._id });
  const existingIdx = customer.cart.findIndex((i) => i.product.toString() === productId);

  if (existingIdx > -1) {
    customer.cart[existingIdx].quantity = quantity;
  } else {
    customer.cart.push({ product: productId, quantity, priceAtAdd: product.effectivePrice });
  }

  await customer.save();
  await Product.findByIdAndUpdate(productId, { $inc: { 'analytics.cartAddCount': 1 } });

  res.json({ success: true, message: 'Cart updated.', data: { cartCount: customer.cart.length } });
});

userRouter.delete('/cart/:productId', authorize('customer'), async (req, res, next) => {
  await Customer.findOneAndUpdate(
    { user: req.user._id },
    { $pull: { cart: { product: req.params.productId } } }
  );
  res.json({ success: true, message: 'Item removed from cart.' });
});

userRouter.delete('/cart', authorize('customer'), async (req, res, next) => {
  await Customer.findOneAndUpdate({ user: req.user._id }, { $set: { cart: [] } });
  res.json({ success: true, message: 'Cart cleared.' });
});

// Customer: Addresses
userRouter.post('/addresses', authorize('customer'), async (req, res, next) => {
  const customer = await Customer.findOne({ user: req.user._id });
  if (req.body.isDefault) customer.addresses.forEach((a) => (a.isDefault = false));
  customer.addresses.push(req.body);
  await customer.save();
  res.status(201).json({ success: true, data: { addresses: customer.addresses } });
});

userRouter.delete('/addresses/:addressId', authorize('customer'), async (req, res, next) => {
  await Customer.findOneAndUpdate(
    { user: req.user._id },
    { $pull: { addresses: { _id: req.params.addressId } } }
  );
  res.json({ success: true });
});

// Missing imports for user routes
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const { createNotification } = require('../services/notification.service');
const AppError = require('../utils/AppError');
const { authorize } = require('../middleware/auth');

module.exports = {
  complaintRoutes: complaintRouter,
  notificationRoutes: notifRouter,
  chatRoutes: chatRouter,
  zoneRoutes: zoneRouter,
  couponRoutes: couponRouter,
  categoryRoutes: categoryRouter,
  distributorRoutes: distributorRouter,
  deliveryRoutes: deliveryRouter,
  supportRoutes: supportRouter,
  userRoutes: userRouter,
};

