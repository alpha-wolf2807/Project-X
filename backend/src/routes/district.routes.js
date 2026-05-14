// district.routes.js
const express = require('express');
const r = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { District } = require('../models/index');
const AppError = require('../utils/AppError');

r.get('/', async (req, res) => {
  const districts = await District.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
  res.json({ success: true, data: { districts } });
});

r.post('/', protect, authorize('admin'), async (req, res) => {
  const district = await District.create(req.body);
  res.status(201).json({ success: true, data: { district } });
});

r.put('/:id', protect, authorize('admin'), async (req, res) => {
  const district = await District.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!district) throw new AppError('District not found.', 404);
  res.json({ success: true, data: { district } });
});

r.delete('/:id', protect, authorize('admin'), async (req, res) => {
  const district = await District.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!district) throw new AppError('District not found.', 404);
  res.json({ success: true, message: 'District removed.' });
});

module.exports = r;