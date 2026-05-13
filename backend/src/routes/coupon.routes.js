// coupon.routes.js
const express = require('express');
const r = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { Coupon } = require('../models/index');
const AppError = require('../utils/AppError');

r.post('/validate', protect, authorize('customer'), async (req, res, next) => {
  const { code, orderAmount } = req.body;
  const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true, validUntil: { $gte: new Date() } });
  if (!coupon) throw new AppError('Invalid or expired coupon.', 400);
  if (coupon.minOrderAmount > orderAmount) throw new AppError(`Minimum order ₹${coupon.minOrderAmount} required.`, 400);
  let discount = 0;
  if (coupon.type === 'percentage') discount = Math.min((orderAmount * coupon.value) / 100, coupon.maxDiscountAmount || Infinity);
  else if (coupon.type === 'fixed') discount = Math.min(coupon.value, orderAmount);
  res.json({ success: true, data: { coupon: { code: coupon.code, type: coupon.type, value: coupon.value, discount: Math.round(discount) } } });
});

r.get('/', protect, authorize('admin'), async (req, res) => { const coupons = await Coupon.find().sort({ createdAt: -1 }); res.json({ success: true, data: { coupons } }); });
r.post('/', protect, authorize('admin'), async (req, res) => { const coupon = await Coupon.create({ ...req.body, createdBy: req.user._id }); res.status(201).json({ success: true, data: { coupon } }); });
r.patch('/:id', protect, authorize('admin'), async (req, res) => { const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json({ success: true, data: { coupon } }); });
r.delete('/:id', protect, authorize('admin'), async (req, res) => { await Coupon.findByIdAndUpdate(req.params.id, { isActive: false }); res.json({ success: true }); });
module.exports = r;
