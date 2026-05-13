// category.routes.js
const express = require('express');
const r = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { Category } = require('../models/index');
r.get('/', async (req, res) => { const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1 }); res.json({ success: true, data: { categories } }); });
r.post('/', protect, authorize('admin'), async (req, res) => { const category = await Category.create(req.body); res.status(201).json({ success: true, data: { category } }); });
r.put('/:id', protect, authorize('admin'), async (req, res) => { const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json({ success: true, data: { category } }); });
r.delete('/:id', protect, authorize('admin'), async (req, res) => { await Category.findByIdAndUpdate(req.params.id, { isActive: false }); res.json({ success: true }); });
module.exports = r;

