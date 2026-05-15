// zone.routes.js
const express = require('express');
const r = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { Zone, District, Locality } = require('../models/index');
const AppError = require('../utils/AppError');

// List zones
r.get('/', async (req, res) => {
  const zones = await Zone.find({ isActive: true }).populate('distributor', 'name phone');
  res.json({ success: true, data: { zones } });
});

// Create zone
r.post('/', protect, authorize('admin'), async (req, res) => {
  const zone = await Zone.create(req.body);
  res.status(201).json({ success: true, data: { zone } });
});

// Update zone — if districts/localities are removed from the zone document,
// also remove the corresponding District and Locality documents from the DB.
r.put('/:id', protect, authorize('admin'), async (req, res) => {
  const zone = await Zone.findById(req.params.id);
  if (!zone) throw new AppError('Zone not found.', 404);

  const oldDistricts = zone.districts || [];
  const oldLocalities = zone.localities || [];

  // Apply update to zone fields
  Object.assign(zone, req.body);
  const updated = await zone.save();

  // Only process deletions if client provided districts/localities in payload
  if (Object.prototype.hasOwnProperty.call(req.body, 'districts')) {
    const newDistricts = req.body.districts || [];
    const removedDistricts = oldDistricts.filter((d) => !newDistricts.includes(d));
    if (removedDistricts.length) {
      // Find district docs by name, delete localities under them then delete districts
      const districtsToDelete = await District.find({ name: { $in: removedDistricts } });
      const districtIds = districtsToDelete.map((d) => d._id);
      if (districtIds.length) {
        await Locality.deleteMany({ district: { $in: districtIds } });
        await District.deleteMany({ _id: { $in: districtIds } });
      }
    }
  }

  if (Object.prototype.hasOwnProperty.call(req.body, 'localities')) {
    const newLocalities = req.body.localities || [];
    const removedLocalities = oldLocalities.filter((l) => !newLocalities.includes(l));
    if (removedLocalities.length) {
      await Locality.deleteMany({ name: { $in: removedLocalities } });
    }
  }

  res.json({ success: true, data: { zone: updated } });
});

// Soft-delete zone
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
