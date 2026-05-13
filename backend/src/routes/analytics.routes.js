/**
 * PROJECT-X — Analytics Routes
 */
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/analytics.controller');

router.use(protect, authorize('admin'));

router.get('/dashboard', ctrl.getDashboardStats);
router.get('/revenue', ctrl.getRevenueAnalytics);
router.get('/orders', ctrl.getOrderAnalytics);
router.get('/products', ctrl.getProductAnalytics);
router.get('/customers', ctrl.getCustomerAnalytics);
router.get('/refunds', ctrl.getRefundAnalytics);
router.get('/fraud', ctrl.getFraudSummary);

module.exports = router;
