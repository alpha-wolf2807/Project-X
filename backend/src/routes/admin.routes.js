/**
 * PROJECT-X — Admin Routes
 */
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/admin.controller');

router.use(protect, authorize('admin'));

router.post('/distributors', ctrl.createDistributor);
router.post('/delivery-dudes', ctrl.createDeliveryDude);
router.get('/users', ctrl.getUsers);
router.get('/users/:id', ctrl.getUserDetail);
router.post('/users/:id/suspend', ctrl.suspendUser);
router.post('/users/:id/unsuspend', ctrl.unsuspendUser);
router.post('/users/:id/warn', ctrl.sendWarning);
router.delete('/users/:id', ctrl.deleteUser);
router.post('/announce', ctrl.broadcastAnnouncement);
router.post('/orders/:orderId/refund', ctrl.processRefund);
router.get('/audit-logs', ctrl.getAuditLogs);

module.exports = router;
