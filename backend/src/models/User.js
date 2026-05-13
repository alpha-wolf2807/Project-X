/**
 * PROJECT-X — User Model
 *
 * Central user schema with role-based access control.
 * All roles (admin, distributor, delivery, customer, support) share
 * this base schema. Role-specific data lives in separate collections
 * but references this User document.
 *
 * Security features:
 * - Password hashed with bcrypt (never stored plain)
 * - Refresh tokens hashed before storage
 * - OTP hashed with expiry
 * - Login attempts tracking for lockout
 * - Audit trail for account changes
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  // ── Identity ──────────────────────────────────────────────
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format'],
    index: true,
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    match: [/^[6-9]\d{9}$/, 'Invalid Indian phone number'],
    index: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false, // Never returned in queries by default
  },
  avatar: {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
  },

  // ── Role & Status ─────────────────────────────────────────
  role: {
    type: String,
    enum: ['admin', 'distributor', 'delivery', 'customer', 'support'],
    required: true,
    index: true,
  },
  isActive: { type: Boolean, default: true, index: true },
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },

  // ── Zone Assignment (for distributor/delivery roles) ──────
  zone: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Zone',
  },

  // ── Security ──────────────────────────────────────────────
  refreshTokenHash: { type: String, select: false },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },

  // ── OTP (hashed) ──────────────────────────────────────────
  otpHash: { type: String, select: false },
  otpExpires: { type: Date },
  otpPurpose: {
    type: String,
    enum: ['email_verify', 'phone_verify', 'password_reset', 'login_2fa'],
  },

  // ── Metadata ──────────────────────────────────────────────
  lastLogin: { type: Date },
  lastLoginIP: { type: String },
  deviceTokens: [String], // FCM tokens for push notifications

  // ── Gamification ──────────────────────────────────────────
  rewardPoints: { type: Number, default: 0 },
  badges: [{
    name: String,
    icon: String,
    awardedAt: Date,
    description: String,
  }],

  // ── Warnings (Red Envelope System) ───────────────────────
  warnings: [{
    message: String,
    severity: { type: String, enum: ['low', 'medium', 'high'] },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    issuedAt: { type: Date, default: Date.now },
    acknowledged: { type: Boolean, default: false },
  }],

  // ── Suspension ───────────────────────────────────────────
  suspension: {
    isSuspended: { type: Boolean, default: false },
    reason: String,
    suspendedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    suspendedAt: Date,
    expiresAt: Date,
  },

  // ── Referral System ──────────────────────────────────────
  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  referralCount: { type: Number, default: 0 },

}, {
  timestamps: true,
  // Only expose safe fields by default
  toJSON: {
    transform: (doc, ret) => {
      delete ret.password;
      delete ret.refreshTokenHash;
      delete ret.otpHash;
      delete ret.loginAttempts;
      delete ret.__v;
      return ret;
    },
  },
});

// ── Indexes ──────────────────────────────────────────────────
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ zone: 1, role: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ referralCode: 1 }, { sparse: true });

// ── Virtual: isLocked ─────────────────────────────────────
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// ── Pre-save: Hash password ───────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  this.password = await bcrypt.hash(this.password, rounds);
  next();
});

// ── Pre-save: Generate referral code ─────────────────────
userSchema.pre('save', function (next) {
  if (this.isNew && !this.referralCode) {
    this.referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
  }
  next();
});

// ── Methods ──────────────────────────────────────────────────

// Compare password on login
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Increment login failures and implement lockout
userSchema.methods.incLoginAttempts = async function () {
  const MAX_ATTEMPTS = 5;
  const LOCK_TIME = 2 * 60 * 60 * 1000; // 2 hours

  if (this.lockUntil && this.lockUntil < Date.now()) {
    // Reset after lockout expires
    return this.updateOne({ $set: { loginAttempts: 1 }, $unset: { lockUntil: 1 } });
  }

  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= MAX_ATTEMPTS && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + LOCK_TIME };
  }
  return this.updateOne(updates);
};

// Store hashed OTP
userSchema.methods.setOTP = async function (otp, purpose) {
  const hash = await bcrypt.hash(otp, 10);
  this.otpHash = hash;
  this.otpExpires = new Date(Date.now() + (parseInt(process.env.OTP_EXPIRES_MINUTES) || 10) * 60000);
  this.otpPurpose = purpose;
  await this.save({ validateBeforeSave: false });
};

// Verify OTP
userSchema.methods.verifyOTP = async function (otp, purpose) {
  if (!this.otpHash || !this.otpExpires) return false;
  if (this.otpExpires < Date.now()) return false;
  if (this.otpPurpose !== purpose) return false;
  return bcrypt.compare(otp, this.otpHash);
};

// Clear OTP after use
userSchema.methods.clearOTP = async function () {
  this.otpHash = undefined;
  this.otpExpires = undefined;
  this.otpPurpose = undefined;
  await this.save({ validateBeforeSave: false });
};

module.exports = mongoose.model('User', userSchema);
