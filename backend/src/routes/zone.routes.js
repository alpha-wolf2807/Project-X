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

// Create zone — normalize district/locality IDs to names
r.post('/', protect, authorize('admin'), async (req, res) => {
  const body = { ...req.body };

  // Normalize districts: convert IDs to names if needed
  if (body.districts && Array.isArray(body.districts)) {
    const normalized = await Promise.all(
      body.districts.map(async (d) => {
        // If it's an ObjectId (looks like a Mongo ID), resolve it
        if (typeof d === 'string' && d.match(/^[0-9a-f]{24}$/i)) {
          const district = await District.findById(d);
          return district ? district.name : d;
        }
        return d;
      })
    );
    body.districts = normalized;
  }

  // Normalize localities: convert IDs to names if needed
  if (body.localities && Array.isArray(body.localities)) {
    const normalized = await Promise.all(
      body.localities.map(async (l) => {
        if (typeof l === 'string' && l.match(/^[0-9a-f]{24}$/i)) {
          const locality = await Locality.findById(l);
          return locality ? locality.name : l;
        }
        return l;
      })
    );
    body.localities = normalized;
  }

  const zone = await Zone.create(body);
  res.status(201).json({ success: true, data: { zone } });
});

// Update zone — normalize district/locality IDs to names, handle cascading deletes
r.put('/:id', protect, authorize('admin'), async (req, res) => {
  const zone = await Zone.findById(req.params.id);
  if (!zone) throw new AppError('Zone not found.', 404);

  const oldDistricts = zone.districts || [];
  const oldLocalities = zone.localities || [];

  const body = { ...req.body };

  // Normalize districts: convert IDs to names if needed
  if (body.districts && Array.isArray(body.districts)) {
    const normalized = await Promise.all(
      body.districts.map(async (d) => {
        if (typeof d === 'string' && d.match(/^[0-9a-f]{24}$/i)) {
          const district = await District.findById(d);
          return district ? district.name : d;
        }
        return d;
      })
    );
    body.districts = normalized;
  }

  // Normalize localities: convert IDs to names if needed
  if (body.localities && Array.isArray(body.localities)) {
    const normalized = await Promise.all(
      body.localities.map(async (l) => {
        if (typeof l === 'string' && l.match(/^[0-9a-f]{24}$/i)) {
          const locality = await Locality.findById(l);
          return locality ? locality.name : l;
        }
        return l;
      })
    );
    body.localities = normalized;
  }

  // Apply update to zone fields
  Object.assign(zone, body);
  const updated = await zone.save();

  // Only process deletions if client provided districts/localities in payload
  if (Object.prototype.hasOwnProperty.call(req.body, 'districts')) {
    const newDistricts = zone.districts || [];
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
    const newLocalities = zone.localities || [];
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
