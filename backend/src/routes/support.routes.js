// support.routes.js
const express = require('express');
const r = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { Complaint } = require('../models/index');
r.use(protect, authorize('support', 'admin'));
r.get('/stats', async (req, res) => {
  const [open, resolved, avgResTime] = await Promise.all([
    Complaint.countDocuments({ status: { $in: ['open', 'assigned', 'in_progress'] } }),
    Complaint.countDocuments({ status: 'resolved' }),
    Complaint.aggregate([{ $match: { status: 'resolved', resolvedAt: { $exists: true } } }, { $project: { t: { $subtract: ['$resolvedAt', '$createdAt'] } } }, { $group: { _id: null, avg: { $avg: '$t' } } }]),
  ]);
  res.json({ success: true, data: { openComplaints: open, resolvedComplaints: resolved, avgResolutionHours: avgResTime[0] ? Math.round(avgResTime[0].avg / 3600000) : 0 } });
});
module.exports = r;
