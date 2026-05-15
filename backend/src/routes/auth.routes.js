/**
 * CARTEX — Auth Routes
 */
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/auth.controller');

router.post('/register', [
  body('name').trim().isLength({ min: 2, max: 50 }),
  body('email').isEmail().normalizeEmail(),
  body('phone').matches(/^[6-9]\d{9}$/),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('hostelName').notEmpty(),
  body('district').notEmpty(),
  body('locality').notEmpty(),
  body('gender').isIn(['male', 'female', 'other']),
  body('collegeStudent').optional().isBoolean(),
  body('isHosteller').optional().isBoolean(),
  body('onCampus').optional().isBoolean(),
  validate,
], ctrl.register);

router.post('/verify-email', [
  body('userId').notEmpty(),
  body('otp').isLength({ min: 6, max: 6 }),
  validate,
], ctrl.verifyEmail);

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate,
], ctrl.login);

router.post('/refresh-token', ctrl.refreshToken);
router.post('/logout', protect, ctrl.logout);
router.post('/forgot-password', [body('email').isEmail(), validate], ctrl.forgotPassword);
router.post('/reset-password', [
  body('email').isEmail(),
  body('otp').isLength({ min: 6, max: 6 }),
  body('newPassword').isLength({ min: 8 }),
  validate,
], ctrl.resetPassword);

router.get('/me', protect, ctrl.getMe);

module.exports = router;

