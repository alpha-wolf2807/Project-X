/**
 * CARTEX — Payment Service (Razorpay)
 *
 * Handles Razorpay order creation and payment verification.
 * Webhook signature verification for server-side confirmation.
 */

const Razorpay = require('razorpay');
const crypto = require('crypto');
const AppError = require('../utils/AppError');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Create a Razorpay order
 * Must be called before showing payment UI to customer
 */
const createRazorpayOrder = async ({ amount, currency = 'INR', orderId, receipt }) => {
  const options = {
    amount: Math.round(amount * 100), // Razorpay expects paise
    currency,
    receipt: receipt || `rcpt_${orderId}`,
    notes: { orderId: orderId.toString() },
  };

  try {
    const order = await razorpay.orders.create(options);
    return order;
  } catch (err) {
    throw new AppError(`Razorpay order creation failed: ${err.message}`, 500);
  }
};

/**
 * Verify payment signature (CRITICAL — prevents payment bypass)
 * Formula: HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, secret)
 */
const verifyRazorpayPayment = (razorpayOrderId, razorpayPaymentId, signature) => {
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );
  } catch (err) {
    return false;
  }
};

/**
 * Verify webhook signature
 * Called when Razorpay sends server-to-server event
 */
const verifyWebhookSignature = (body, signature) => {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(JSON.stringify(body))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature)
  );
};

/**
 * Process refund via Razorpay
 */
const processRefund = async (paymentId, amount, reason) => {
  try {
    const refund = await razorpay.payments.refund(paymentId, {
      amount: Math.round(amount * 100), // paise
      notes: { reason },
    });
    return refund;
  } catch (err) {
    throw new AppError(`Refund failed: ${err.message}`, 500);
  }
};

module.exports = {
  razorpay,
  createRazorpayOrder,
  verifyRazorpayPayment,
  verifyWebhookSignature,
  processRefund,
};

