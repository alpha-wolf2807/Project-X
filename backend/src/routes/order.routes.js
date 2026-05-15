/**
 * CARTEX — Order Routes
 */
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/order.controller');

router.use(protect);

// Customer
router.post('/', authorize('customer'), ctrl.placeOrder);
router.post('/confirm-payment', authorize('customer'), ctrl.confirmPayment);
router.get('/my-orders', authorize('customer'), ctrl.getMyOrders);
router.post('/:id/cancel', authorize('customer', 'admin'), ctrl.cancelOrder);

// Admin / Support
router.get('/', authorize('admin', 'support'), ctrl.getOrders);

// All authenticated roles
router.get('/:id', ctrl.getOrderById);

// Distributor + Delivery + Admin
router.patch('/:id/status', authorize('distributor', 'delivery', 'admin'), ctrl.updateOrderStatus);

// Delivery dude only — OTP verify
router.post('/:id/verify-otp', authorize('delivery'), ctrl.verifyDeliveryOTP);

module.exports = router;

/**
 * CARTEX — Payment Routes (separate file inline for brevity)
 */
// payment.routes.js

