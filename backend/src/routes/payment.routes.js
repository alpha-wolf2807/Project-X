/**
 * CARTEX — Payment Routes
 */
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { createRazorpayOrder, verifyWebhookSignature } = require('../services/payment.service');
const Order = require('../models/Order');
const AppError = require('../utils/AppError');

// Create Razorpay order (called before showing payment UI)
router.post('/create-order', protect, authorize('customer'), async (req, res, next) => {
  const { orderId } = req.body;
  const order = await Order.findById(orderId);
  if (!order) throw new AppError('Order not found.', 404);
  if (order.customer.toString() !== req.user._id.toString()) throw new AppError('Unauthorized.', 403);

  const rzpOrder = await createRazorpayOrder({
    amount: order.pricing.totalAmount,
    orderId: order._id,
  });

  // Store razorpay order id
  order.payment.razorpayOrderId = rzpOrder.id;
  await order.save();

  res.json({
    success: true,
    data: {
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    },
  });
});

// Razorpay webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];

  const isValid = verifyWebhookSignature(req.body, signature);
  if (!isValid) return res.status(400).json({ error: 'Invalid webhook signature' });

  const event = JSON.parse(req.body);

  if (event.event === 'payment.failed') {
    const razorpayOrderId = event.payload.payment.entity.order_id;
    await Order.findOneAndUpdate(
      { 'payment.razorpayOrderId': razorpayOrderId },
      { 'payment.status': 'failed', status: 'cancelled' }
    );
  }

  res.json({ status: 'ok' });
});

module.exports = router;

