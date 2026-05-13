// distributor.routes.js
const express = require('express');
const r = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Order = require('../models/Order');
const { Zone } = require('../models/index');
const { createNotification } = require('../services/notification.service');
const AppError = require('../utils/AppError');

r.use(protect, authorize('distributor', 'admin'));

r.get('/orders', async (req, res, next) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = { distributor: req.user._id };
  if (status) filter.status = status;
  const orders = await Order.find(filter).populate('customer', 'name phone').populate('deliveryDude', 'name phone').populate('items.product', 'name images').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
  const total = await Order.countDocuments(filter);
  res.json({ success: true, data: { orders, pagination: { total, page: parseInt(page) } } });
});

r.patch('/orders/:id/assign-delivery', async (req, res, next) => {
  const { deliveryDudeId } = req.body;
  const order = await Order.findOne({ _id: req.params.id, distributor: req.user._id });
  if (!order) throw new AppError('Order not found.', 404);
  order.deliveryDude = deliveryDudeId;
  await order.save();
  await createNotification({ recipient: deliveryDudeId, type: 'order_assigned', title: '🛵 Delivery Assigned!', body: `New delivery for order #${order.orderNumber}`, data: { orderId: order._id } });
  res.json({ success: true, message: 'Delivery dude reassigned.' });
});

r.get('/delivery-dudes', async (req, res, next) => {
  const zone = await Zone.findOne({ distributor: req.user._id }).populate('deliveryDudes', 'name phone avatar rewardPoints isActive');
  if (!zone) return res.json({ success: true, data: { deliveryDudes: [] } });
  const dudeIds = zone.deliveryDudes.map((d) => d._id);
  const workloads = await Order.aggregate([{ $match: { deliveryDude: { $in: dudeIds }, status: { $in: ['picked_up', 'out_for_delivery'] } } }, { $group: { _id: '$deliveryDude', activeOrders: { $sum: 1 } } }]);
  const workloadMap = {};
  workloads.forEach((w) => (workloadMap[w._id.toString()] = w.activeOrders));
  const deliveryDudes = zone.deliveryDudes.map((d) => ({ ...d.toObject(), activeOrders: workloadMap[d._id.toString()] || 0 }));
  res.json({ success: true, data: { deliveryDudes } });
});

r.get('/zone-stats', async (req, res, next) => {
  const zone = await Zone.findOne({ distributor: req.user._id });
  if (!zone) return res.json({ success: true, data: {} });
  const stats = await Order.aggregate([
    { $match: { zone: zone._id } },
    { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$pricing.totalAmount' } } },
  ]);
  res.json({ success: true, data: { zone, stats } });
});

module.exports = r;
