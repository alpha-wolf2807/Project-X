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

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

r.post('/', protect, authorize('admin'), async (req, res) => {
  const { name, district } = req.body;
  if (!name) throw new AppError('Name is required.', 400);

  const regex = { $regex: `^${escapeRegex(name.trim())}$`, $options: 'i' };
  const existing = await Locality.findOne({ name: regex });

  if (existing) {
    if (existing.isActive) {
      throw new AppError(`Name '${existing.name}' already exists.`, 409);
    }

    // Reactivate and update fields (allow changing district on reactivate)
    existing.isActive = true;
    if (district) existing.district = district;
    existing.code = req.body.code || existing.code;
    existing.description = req.body.description || existing.description;
    existing.sortOrder = typeof req.body.sortOrder !== 'undefined' ? req.body.sortOrder : existing.sortOrder;
    await existing.save();

    return res.status(200).json({ success: true, message: 'Locality reactivated.', data: { locality: existing } });
  }

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