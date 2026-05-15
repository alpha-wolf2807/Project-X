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

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

r.post('/', protect, authorize('admin'), async (req, res) => {
  const { name } = req.body;
  if (!name) throw new AppError('Name is required.', 400);

  const regex = { $regex: `^${escapeRegex(name.trim())}$`, $options: 'i' };
  const existing = await District.findOne({ name: regex });

  if (existing) {
    if (existing.isActive) {
      throw new AppError(`Name '${existing.name}' already exists.`, 409);
    }

    // Reactivate and update fields
    existing.isActive = true;
    existing.code = req.body.code || existing.code;
    existing.description = req.body.description || existing.description;
    existing.sortOrder = typeof req.body.sortOrder !== 'undefined' ? req.body.sortOrder : existing.sortOrder;
    await existing.save();

    return res.status(200).json({ success: true, message: 'District reactivated.', data: { district: existing } });
  }

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