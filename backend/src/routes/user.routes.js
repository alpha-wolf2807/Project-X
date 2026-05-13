// user.routes.js
const express = require('express');
const r = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { uploadAvatar } = require('../config/cloudinary');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');

r.use(protect);

r.patch('/profile', async (req, res, next) => {
  const allowed = ['name'];
  const updates = {};
  allowed.forEach((f) => { if (req.body[f]) updates[f] = req.body[f]; });
  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  res.json({ success: true, data: { user } });
});

r.post('/avatar', uploadAvatar.single('avatar'), async (req, res, next) => {
  if (!req.file) throw new AppError('No file uploaded.', 400);
  const user = await User.findByIdAndUpdate(req.user._id, { avatar: { url: req.file.path, publicId: req.file.filename } }, { new: true });
  res.json({ success: true, data: { avatar: user.avatar } });
});

r.patch('/change-password', async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  const isValid = await user.comparePassword(currentPassword);
  if (!isValid) throw new AppError('Current password incorrect.', 400);
  user.password = newPassword;
  user.refreshTokenHash = undefined;
  await user.save();
  res.json({ success: true, message: 'Password changed. Please log in again.' });
});

// Cart
r.get('/cart', authorize('customer'), async (req, res, next) => {
  const customer = await Customer.findOne({ user: req.user._id }).populate('cart.product', 'name images price mrp isOutOfStock stock slug effectivePrice');
  res.json({ success: true, data: { cart: customer?.cart || [] } });
});

r.post('/cart', authorize('customer'), async (req, res, next) => {
  const { productId, quantity } = req.body;
  const product = await Product.findById(productId);
  if (!product || !product.isActive) throw new AppError('Product not available.', 404);
  const customer = await Customer.findOne({ user: req.user._id });
  const idx = customer.cart.findIndex((i) => i.product.toString() === productId);
  if (idx > -1) { customer.cart[idx].quantity = quantity; }
  else { customer.cart.push({ product: productId, quantity, priceAtAdd: product.price }); }
  if (quantity <= 0) customer.cart.splice(idx, 1);
  await customer.save();
  await Product.findByIdAndUpdate(productId, { $inc: { 'analytics.cartAddCount': 1 } });
  res.json({ success: true, data: { cartCount: customer.cart.length } });
});

r.delete('/cart/:productId', authorize('customer'), async (req, res, next) => {
  await Customer.findOneAndUpdate({ user: req.user._id }, { $pull: { cart: { product: req.params.productId } } });
  res.json({ success: true });
});

r.delete('/cart', authorize('customer'), async (req, res, next) => {
  await Customer.findOneAndUpdate({ user: req.user._id }, { $set: { cart: [] } });
  res.json({ success: true });
});

r.get('/wishlist', authorize('customer'), async (req, res, next) => {
  const customer = await Customer.findOne({ user: req.user._id }).populate('savedForLater.product', 'name images price mrp slug isOutOfStock');
  res.json({ success: true, data: { items: customer?.savedForLater || [] } });
});

r.post('/wishlist', authorize('customer'), async (req, res, next) => {
  const { productId } = req.body;
  const product = await Product.findById(productId);
  if (!product || !product.isActive) throw new AppError('Product not available.', 404);
  const customer = await Customer.findOne({ user: req.user._id });
  const idx = customer.savedForLater.findIndex((item) => item.product.toString() === productId);
  if (idx > -1) {
    customer.savedForLater.splice(idx, 1);
  } else {
    customer.savedForLater.push({ product: productId, quantity: 1, priceAtAdd: product.price });
  }
  await customer.save();
  res.status(201).json({ success: true, data: { wishlist: customer.savedForLater } });
});

r.delete('/wishlist/:productId', authorize('customer'), async (req, res, next) => {
  await Customer.findOneAndUpdate({ user: req.user._id }, { $pull: { savedForLater: { product: req.params.productId } } });
  res.json({ success: true });
});

// Addresses
r.post('/addresses', authorize('customer'), async (req, res, next) => {
  const customer = await Customer.findOne({ user: req.user._id });
  if (req.body.isDefault) customer.addresses.forEach((a) => (a.isDefault = false));
  customer.addresses.push(req.body);
  await customer.save();
  res.status(201).json({ success: true, data: { addresses: customer.addresses } });
});

r.put('/addresses/:addressId', authorize('customer'), async (req, res, next) => {
  const customer = await Customer.findOne({ user: req.user._id });
  const address = customer.addresses.id(req.params.addressId);
  if (!address) throw new AppError('Address not found.', 404);
  Object.assign(address, req.body);
  await customer.save();
  res.json({ success: true, data: { addresses: customer.addresses } });
});

r.delete('/addresses/:addressId', authorize('customer'), async (req, res, next) => {
  await Customer.findOneAndUpdate({ user: req.user._id }, { $pull: { addresses: { _id: req.params.addressId } } });
  res.json({ success: true });
});

// Recently viewed
r.post('/recently-viewed/:productId', authorize('customer'), async (req, res, next) => {
  await Customer.findOneAndUpdate(
    { user: req.user._id },
    { $pull: { recentlyViewed: { product: req.params.productId } } }
  );
  await Customer.findOneAndUpdate(
    { user: req.user._id },
    { $push: { recentlyViewed: { $each: [{ product: req.params.productId }], $slice: -20 } } }
  );
  res.json({ success: true });
});

r.get('/recently-viewed', authorize('customer'), async (req, res, next) => {
  const customer = await Customer.findOne({ user: req.user._id }).populate('recentlyViewed.product', 'name images price mrp slug');
  res.json({ success: true, data: { items: customer?.recentlyViewed?.slice(-10).reverse() || [] } });
});

// Wallet
r.get('/wallet', authorize('customer'), async (req, res, next) => {
  const customer = await Customer.findOne({ user: req.user._id }).select('wallet');
  res.json({ success: true, data: { wallet: customer?.wallet || { balance: 0, transactions: [] } } });
});

module.exports = r;
