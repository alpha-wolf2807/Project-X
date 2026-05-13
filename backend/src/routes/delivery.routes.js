// delivery.routes.js
const express = require('express');
const r = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Order = require('../models/Order');
r.use(protect, authorize('delivery', 'admin'));
r.get('/my-deliveries', async (req, res) => {
  const { status } = req.query;
  const filter = { deliveryDude: req.user._id };
  if (status) filter.status = status;
  const orders = await Order.find(filter).populate('customer', 'name phone').populate('distributor', 'name phone').sort({ createdAt: -1 }).limit(50);
  res.json({ success: true, data: { orders } });
});
r.get('/stats', async (req, res) => {
  const [totalDelivered, todayDeliveries, avgRating] = await Promise.all([
    Order.countDocuments({ deliveryDude: req.user._id, status: 'delivered' }),
    Order.countDocuments({ deliveryDude: req.user._id, status: 'delivered', deliveredAt: { $gte: new Date(new Date().setHours(0,0,0,0)) } }),
    Order.aggregate([{ $match: { deliveryDude: req.user._id, 'rating.score': { $exists: true } } }, { $group: { _id: null, avg: { $avg: '$rating.score' } } }]),
  ]);
  res.json({ success: true, data: { totalDelivered, todayDeliveries, averageRating: avgRating[0]?.avg || 0, rewardPoints: req.user.rewardPoints } });
});
module.exports = r;
