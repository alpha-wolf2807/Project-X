// complaint.routes.js
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { uploadComplaint } = require('../config/cloudinary');
const { Complaint } = require('../models/index');
const { createNotification } = require('../services/notification.service');
const AppError = require('../utils/AppError');

router.use(protect);

router.post('/', authorize('customer'), uploadComplaint.array('proofImages', 5), async (req, res, next) => {
  const { orderId, category, subject, description } = req.body;
  const proofImages = req.files?.map(f => ({ url: f.path, publicId: f.filename })) || [];
  const complaint = await Complaint.create({ customer: req.user._id, order: orderId, category, subject, description, proofImages });
  const User = require('../models/User');
  const supportUsers = await User.find({ role: 'support', isActive: true });
  for (const s of supportUsers) {
    await createNotification({ recipient: s._id, type: 'complaint_update', title: '🎫 New Complaint', body: `Ticket #${complaint.ticketNumber}: ${subject}`, data: { complaintId: complaint._id } });
  }
  res.status(201).json({ success: true, data: { complaint } });
});

router.get('/my', authorize('customer'), async (req, res, next) => {
  const complaints = await Complaint.find({ customer: req.user._id }).populate('assignedTo', 'name').sort({ createdAt: -1 });
  res.json({ success: true, data: { complaints } });
});

router.get('/', authorize('support', 'admin'), async (req, res, next) => {
  const { page = 1, limit = 20, status, priority } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  const complaints = await Complaint.find(filter).populate('customer', 'name email phone').populate('order', 'orderNumber').populate('assignedTo', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
  const total = await Complaint.countDocuments(filter);
  res.json({ success: true, data: { complaints, pagination: { total, page: parseInt(page) } } });
});

router.patch('/:id', authorize('support', 'admin'), async (req, res, next) => {
  const { status, priority, assignedTo, response, internalNote, resolution } = req.body;
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) throw new AppError('Complaint not found.', 404);
  if (status) complaint.status = status;
  if (priority) complaint.priority = priority;
  if (assignedTo) complaint.assignedTo = assignedTo;
  if (!complaint.firstResponseAt && response) complaint.firstResponseAt = new Date();
  if (response) {
    complaint.thread.push({ message: response, sentBy: req.user._id, sentByRole: req.user.role });
    await createNotification({ recipient: complaint.customer, type: 'complaint_update', title: '📬 Complaint Update', body: `Your ticket #${complaint.ticketNumber} has been updated.`, data: { complaintId: complaint._id } });
  }
  if (internalNote) complaint.internalNotes.push({ note: internalNote, addedBy: req.user._id });
  if (resolution) { complaint.resolution = { ...resolution, resolvedAt: new Date(), resolvedBy: req.user._id }; complaint.resolvedAt = new Date(); complaint.status = 'resolved'; }
  await complaint.save();
  res.json({ success: true, data: { complaint } });
});

module.exports = router;
