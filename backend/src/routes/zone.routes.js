// zone.routes.js
const express = require('express');
const r = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { Zone } = require('../models/index');
const AppError = require('../utils/AppError');
r.get('/', async (req, res) => { const zones = await Zone.find({ isActive: true }).populate('distributor', 'name phone'); res.json({ success: true, data: { zones } }); });
r.post('/', protect, authorize('admin'), async (req, res) => { const zone = await Zone.create(req.body); res.status(201).json({ success: true, data: { zone } }); });
r.put('/:id', protect, authorize('admin'), async (req, res) => { const zone = await Zone.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json({ success: true, data: { zone } }); });
r.delete('/:id', protect, authorize('admin'), async (req, res) => {
  const zone = await Zone.findById(req.params.id);
  if (!zone) throw new AppError('Zone not found.', 404);
  zone.isActive = false;
  zone.distributor = undefined;
  zone.deliveryDudes = [];
  await zone.save();
  res.json({ success: true, message: 'Zone removed.' });
});
module.exports = r;
