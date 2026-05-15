/**
 * CARTEX — Admin Controller
 *
 * Platform-wide admin operations:
 * - User management (suspend, warn, remove)
 * - Distributor / Delivery Dude creation
 * - Platform settings
 * - Audit log access
 * - Complaint escalation
 */

const User = require('../models/User');
const Customer = require('../models/Customer');
const { AuditLog, Complaint, Notification, District, Locality, Zone } = require('../models/index');
const { createNotification } = require('../services/notification.service');
const { sendEmail } = require('../services/email.service');
const AppError = require('../utils/AppError');
const { generateTokenPair } = require('../middleware/auth');

// ── Create Distributor Account ────────────────────────────────
exports.createDistributor = async (req, res, next) => {
  const { name, email, phone, password, zoneId, districtId } = req.body;

  const exists = await User.findOne({ $or: [{ email }, { phone }] });
  if (exists) throw new AppError('User with this email/phone already exists.', 409);

  if (!zoneId && !districtId) {
    throw new AppError('Select a district or zone to assign this distributor.', 400);
  }

  let districtName;
  let assignedZone = null;

  if (districtId) {
    const district = await District.findById(districtId);
    if (!district) throw new AppError('District not found.', 404);
    districtName = district.name;
    if (!zoneId) {
      assignedZone = await Zone.findOne({ isActive: true, districts: districtName });
      if (!assignedZone) throw new AppError('No active zone found for selected district.', 404);
    }
  }

  if (zoneId && !assignedZone) {
    assignedZone = await Zone.findById(zoneId);
    if (!assignedZone) throw new AppError('Zone not found.', 404);
  }

  const user = await User.create({
    name,
    email,
    phone,
    password,
    role: 'distributor',
    zone: assignedZone?._id,
    district: districtName,
    isEmailVerified: true, // Admin-created accounts are pre-verified
    isPhoneVerified: true,
  });

  if (assignedZone) {
    await Zone.findByIdAndUpdate(assignedZone._id, { distributor: user._id });
  }

  // Send welcome email with credentials
  await sendEmail({
    to: email,
    subject: '🎉 You\'re now a CARTEX Distributor!',
    template: 'email_verify',
    data: { name, otp: 'Your account has been created. Use the password set by admin.' },
  });

  await AuditLog.create({
    action: 'user.distributor_created',
    resource: 'User',
    resourceId: user._id,
    performedBy: req.user._id,
    performedByRole: 'admin',
    ipAddress: req.ip,
    changes: { after: { name, email, role: 'distributor', zone: assignedZone?._id, district: districtName } },
  });

  res.status(201).json({
    success: true,
    message: `Distributor account created for ${name}.`,
    data: { user },
  });
};

// ── Create Delivery Dude Account ──────────────────────────────
exports.createDeliveryDude = async (req, res, next) => {
  const { name, email, phone, password, zoneId, districtId, localityId } = req.body;

  const exists = await User.findOne({ $or: [{ email }, { phone }] });
  if (exists) throw new AppError('User with this email/phone already exists.', 409);

  if (!zoneId && !districtId && !localityId) {
    throw new AppError('Select a district or locality to assign this delivery dude.', 400);
  }

  let districtName;
  let localityName;
  let assignedZone = null;

  if (localityId) {
    const locality = await Locality.findById(localityId).populate('district', 'name');
    if (!locality) throw new AppError('Locality not found.', 404);
    localityName = locality.name;
    districtName = locality.district?.name;
    if (!zoneId) {
      assignedZone = await Zone.findOne({ isActive: true, localities: localityName });
    }
  }

  if (!assignedZone && districtId) {
    const district = await District.findById(districtId);
    if (!district) throw new AppError('District not found.', 404);
    districtName = district.name;
    if (!zoneId) {
      assignedZone = await Zone.findOne({ isActive: true, districts: districtName });
    }
  }

  if (zoneId && !assignedZone) {
    assignedZone = await Zone.findById(zoneId);
    if (!assignedZone) throw new AppError('Zone not found.', 404);
  }

  if (!assignedZone) {
    throw new AppError('No active zone found for selected district or locality.', 404);
  }

  const user = await User.create({
    name,
    email,
    phone,
    password,
    role: 'delivery',
    zone: assignedZone._id,
    district: districtName,
    locality: localityName,
    isEmailVerified: true,
    isPhoneVerified: true,
  });

  await Zone.findByIdAndUpdate(assignedZone._id, { $addToSet: { deliveryDudes: user._id } });

  await AuditLog.create({
    action: 'user.delivery_created',
    resource: 'User',
    resourceId: user._id,
    performedBy: req.user._id,
    performedByRole: 'admin',
    ipAddress: req.ip,
    changes: { after: { name, email, role: 'delivery', zone: assignedZone._id, district: districtName, locality: localityName } },
  });

  res.status(201).json({ success: true, message: `Delivery dude account created.`, data: { user } });
};

// ── Suspend User ──────────────────────────────────────────────
exports.suspendUser = async (req, res, next) => {
  const { reason, durationDays } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found.', 404);
  if (user.role === 'admin') throw new AppError('Cannot suspend admin accounts.', 403);

  user.suspension = {
    isSuspended: true,
    reason,
    suspendedBy: req.user._id,
    suspendedAt: new Date(),
    expiresAt: durationDays ? new Date(Date.now() + durationDays * 86400000) : null,
  };
  // Invalidate their session
  user.refreshTokenHash = undefined;
  await user.save({ validateBeforeSave: false });

  await createNotification({
    recipient: user._id,
    type: 'account_suspended',
    title: '⚠️ Account Suspended',
    body: `Your account has been suspended. Reason: ${reason}`,
  });

  await AuditLog.create({
    action: 'user.suspended',
    resource: 'User',
    resourceId: user._id,
    performedBy: req.user._id,
    performedByRole: 'admin',
    ipAddress: req.ip,
    changes: { after: { suspension: user.suspension } },
  });

  res.json({ success: true, message: `User ${user.name} has been suspended.` });
};

// ── Unsuspend User ────────────────────────────────────────────
exports.unsuspendUser = async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found.', 404);

  user.suspension = { isSuspended: false };
  await user.save({ validateBeforeSave: false });

  await createNotification({
    recipient: user._id,
    type: 'account_reactivated',
    title: '✅ Account Reactivated',
    body: 'Your account has been reactivated. Welcome back!',
  });

  await AuditLog.create({
    action: 'user.unsuspended',
    resource: 'User',
    resourceId: user._id,
    performedBy: req.user._id,
    performedByRole: 'admin',
    ipAddress: req.ip,
  });

  res.json({ success: true, message: `User ${user.name} unsuspended.` });
};

// ── Send Warning (Red Envelope System) ───────────────────────
exports.sendWarning = async (req, res, next) => {
  const { message, severity = 'medium' } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found.', 404);

  user.warnings.push({ message, severity, issuedBy: req.user._id });
  await user.save({ validateBeforeSave: false });

  await createNotification({
    recipient: user._id,
    type: 'account_warning',
    title: '🔴 Warning Issued',
    body: message,
  });

  // Auto-suspend after 3 high-severity warnings
  const highSeverityCount = user.warnings.filter((w) => w.severity === 'high').length;
  if (highSeverityCount >= 3) {
    user.suspension = {
      isSuspended: true,
      reason: 'Automatic suspension: 3 high-severity warnings',
      suspendedBy: req.user._id,
      suspendedAt: new Date(),
    };
    await user.save({ validateBeforeSave: false });
  }

  res.json({ success: true, message: `Warning sent to ${user.name}.` });
};

// ── Delete User (Admin) ─────────────────────────────────────
exports.deleteUser = async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found.', 404);
  if (user.role === 'admin') throw new AppError('Cannot delete admin accounts.', 403);
  if (req.user._id.toString() === user._id.toString()) throw new AppError('You cannot delete your own account.', 403);

  if (user.role === 'distributor') {
    const { Zone } = require('../models/index');
    await Zone.updateMany({ distributor: user._id }, { $unset: { distributor: '' } });
  }

  if (user.role === 'delivery') {
    const { Zone } = require('../models/index');
    await Zone.updateMany({ deliveryDudes: user._id }, { $pull: { deliveryDudes: user._id } });
  }

  if (user.role === 'customer') {
    await Customer.findOneAndDelete({ user: user._id });
  }

  await User.findByIdAndDelete(user._id);

  await AuditLog.create({
    action: 'user.deleted',
    resource: 'User',
    resourceId: user._id,
    performedBy: req.user._id,
    performedByRole: 'admin',
    ipAddress: req.ip,
    changes: { before: { name: user.name, email: user.email, role: user.role } },
  });

  res.json({ success: true, message: `User ${user.name} has been deleted.` });
};

// ── Get All Users with Filters ────────────────────────────────
exports.getUsers = async (req, res, next) => {
  const { role, page = 1, limit = 20, search, status } = req.query;
  const filter = {};

  if (role) filter.role = role;
  if (status === 'suspended') filter['suspension.isSuspended'] = true;
  if (status === 'active') filter.isActive = true;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .populate('zone', 'name code')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('-refreshTokenHash -otpHash'),
    User.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      users,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    },
  });
};

// ── Get User Detail ───────────────────────────────────────────
exports.getUserDetail = async (req, res, next) => {
  const user = await User.findById(req.params.id)
    .populate('zone', 'name code')
    .populate('warnings.issuedBy', 'name');

  if (!user) throw new AppError('User not found.', 404);

  let profile = null;
  if (user.role === 'customer') {
    profile = await Customer.findOne({ user: user._id });
  }

  const recentOrders = await require('../models/Order').find({
    $or: [
      { customer: user._id },
      { distributor: user._id },
      { deliveryDude: user._id },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('orderNumber status pricing.totalAmount createdAt');

  res.json({ success: true, data: { user, profile, recentOrders } });
};

// ── Get Audit Logs ────────────────────────────────────────────
exports.getAuditLogs = async (req, res, next) => {
  const { page = 1, limit = 50, action, resource, userId } = req.query;
  const filter = {};

  if (action) filter.action = { $regex: action, $options: 'i' };
  if (resource) filter.resource = resource;
  if (userId) filter.performedBy = userId;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('performedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit)),
    AuditLog.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: { logs, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } },
  });
};

// ── Platform Announcement ─────────────────────────────────────
exports.broadcastAnnouncement = async (req, res, next) => {
  const { title, body, targetRoles = ['customer'] } = req.body;

  const users = await User.find({
    role: { $in: targetRoles },
    isActive: true,
  }).select('_id');

  // Bulk insert notifications
  const notifications = users.map((u) => ({
    recipient: u._id,
    type: 'system_announcement',
    title,
    body,
    channel: 'in_app',
  }));

  await Notification.insertMany(notifications, { ordered: false });

  res.json({ success: true, message: `Announcement sent to ${users.length} users.` });
};

// ── Refund Order (Admin) ──────────────────────────────────────
exports.processRefund = async (req, res, next) => {
  const { amount, reason } = req.body;
  const Order = require('../models/Order');
  const order = await Order.findById(req.params.orderId);
  if (!order) throw new AppError('Order not found.', 404);

  const { processRefund: razorpayRefund } = require('../services/payment.service');

  let refundId = null;
  if (order.payment.razorpayPaymentId) {
    const refund = await razorpayRefund(order.payment.razorpayPaymentId, amount, reason);
    refundId = refund.id;
  }

  order.payment.status = amount >= order.pricing.totalAmount ? 'refunded' : 'partially_refunded';
  order.payment.refundAmount = amount;
  order.payment.refundedAt = new Date();
  order.payment.refundReason = reason;
  order.payment.refundId = refundId;
  order.status = 'refunded';
  await order.save();

  // Credit to customer wallet as fallback
  if (!refundId) {
    await Customer.findOneAndUpdate(
      { user: order.customer },
      {
        $inc: { 'wallet.balance': amount },
        $push: {
          'wallet.transactions': {
            type: 'credit',
            amount,
            description: `Refund for order #${order.orderNumber}`,
            orderId: order._id,
          },
        },
      }
    );
  }

  await createNotification({
    recipient: order.customer,
    type: 'refund_completed',
    title: '💰 Refund Processed!',
    body: `₹${amount} refunded for order #${order.orderNumber}.`,
    data: { orderId: order._id },
  });

  res.json({ success: true, message: `Refund of ₹${amount} processed.` });
};

