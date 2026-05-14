// locality.routes.js
const express = require('express');
const r = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { Locality } = require('../models/index');
const AppError = require('../utils/AppError');

r.get('/', async (req, res) => {
  const localities = await Locality.find({ isActive: true })
    .populate('district', 'name code')
    .sort({ sortOrder: 1, name: 1 });
  res.json({ success: true, data: { localities } });
});

r.get('/by-district/:districtId', async (req, res) => {
  const localities = await Locality.find({
    district: req.params.districtId,
    isActive: true
  }).sort({ sortOrder: 1, name: 1 });
  res.json({ success: true, data: { localities } });
});

r.post('/', protect, authorize('admin'), async (req, res) => {
  const locality = await Locality.create(req.body);
  res.status(201).json({ success: true, data: { locality } });
});

r.put('/:id', protect, authorize('admin'), async (req, res) => {
  const locality = await Locality.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!locality) throw new AppError('Locality not found.', 404);
  res.json({ success: true, data: { locality } });
});

r.delete('/:id', protect, authorize('admin'), async (req, res) => {
  const locality = await Locality.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!locality) throw new AppError('Locality not found.', 404);
  res.json({ success: true, message: 'Locality removed.' });
});

module.exports = r;