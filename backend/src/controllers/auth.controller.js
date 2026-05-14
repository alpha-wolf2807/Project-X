/**
 * PROJECT-X — Authentication Controller
 *
 * Handles: registration, login, token refresh, OTP, logout, password reset
 * Pattern: thin controllers → fat services
 */

const User = require('../models/User');
const Customer = require('../models/Customer');
const { AuditLog, District, Locality } = require('../models/index');
const {
  generateTokenPair,
  hashToken,
  cookieOptions,
} = require('../middleware/auth');
const { sendEmail } = require('../services/email.service');
const { sendSMS } = require('../services/sms.service');
const { createNotification } = require('../services/notification.service');
const AppError = require('../utils/AppError');
const { generateOTP } = require('../utils/helpers');

// ── Register ──────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  const {
    name,
    email,
    phone,
    password,
    hostelName,
    rollNumber,
    district,
    locality,
    gender,
    collegeStudent,
    collegeName,
    isHosteller,
    onCampus,
    roomNumber,
    hostelLocation,
    referralCode,
  } = req.body;

  // Check for existing user
  const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
  if (existingUser) {
    const field = existingUser.email === email ? 'email' : 'phone number';
    throw new AppError(`An account with this ${field} already exists.`, 409);
  }

  // Validate referral code (optional)
  let referredBy = null;
  if (referralCode) {
    const referrer = await User.findOne({ referralCode, isActive: true });
    if (referrer) {
      referredBy = referrer._id;
    }
  }

  // Look up district and locality names
  let districtName = district;
  let localityName = locality;

  if (district) {
    const districtDoc = await District.findById(district);
    if (districtDoc) districtName = districtDoc.name;
  }

  if (locality) {
    const localityDoc = await Locality.findById(locality);
    if (localityDoc) localityName = localityDoc.name;
  }

  // Create user
  const user = await User.create({
    name,
    email,
    phone,
    password,
    role: 'customer',
    referredBy,
  });

  // Create customer profile
  await Customer.create({
    user: user._id,
    hostelName,
    rollNumber,
    district: districtName,
    locality: localityName,
    gender,
    isCollegeStudent: !!collegeStudent,
    collegeName,
    isHosteller: !!isHosteller,
    onCampus: !!onCampus,
    roomNumber,
    hostelLocation,
  });

  // Award referral points to referrer
  if (referredBy) {
    await User.findByIdAndUpdate(referredBy, {
      $inc: { rewardPoints: 50, referralCount: 1 },
    });
  }

  // Generate login OTP (since email not integrated yet)
  const otp = generateOTP();
  await user.setOTP(otp, 'login_otp');

  // Audit log
  await AuditLog.create({
    action: 'user.registered',
    resource: 'User',
    resourceId: user._id,
    performedBy: user._id,
    performedByRole: 'customer',
    ipAddress: req.ip,
  });

  // Return OTP for immediate login
  res.status(201).json({
    success: true,
    message: 'Account created! Use the OTP to login.',
    data: {
      userId: user._id,
      email,
      otp, // Return OTP for development
      requiresOTPLogin: true,
    },
  });
};

// ── Verify Email OTP ──────────────────────────────────────────
exports.verifyEmail = async (req, res, next) => {
  const { userId, otp } = req.body;

  const user = await User.findById(userId).select('+otpHash +otpExpires +otpPurpose');
  if (!user) throw new AppError('Invalid verification request.', 400);

  const isValid = await user.verifyOTP(otp, 'email_verify');
  if (!isValid) throw new AppError('Invalid or expired OTP.', 400);

  await user.clearOTP();
  user.isEmailVerified = true;
  await user.save({ validateBeforeSave: false });

  // Generate token pair on first verification
  const { accessToken, refreshToken, refreshTokenHash } = generateTokenPair(user._id, user.role);
  user.refreshTokenHash = refreshTokenHash;
  user.lastLogin = new Date();
  user.lastLoginIP = req.ip;
  await user.save({ validateBeforeSave: false });

  // Create welcome notification
  await createNotification({
    recipient: user._id,
    type: 'system_announcement',
    title: 'Welcome to Project-X! 🚀',
    body: 'Your account is verified. Start shopping hassle-free from your hostel!',
  });

  // Set refresh token as httpOnly cookie
  res.cookie('refreshToken', refreshToken, cookieOptions);

  res.json({
    success: true,
    message: 'Email verified successfully!',
    data: {
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      accessToken,
    },
  });
};

// ── Login ─────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  const { email, password, otp } = req.body;

  const user = await User.findOne({ email }).select('+password +refreshTokenHash +loginAttempts +lockUntil +otpHash +otpExpires +otpPurpose');
  if (!user) throw new AppError('Invalid email or password.', 401);

  // Check account lock
  if (user.isLocked) {
    const lockMins = Math.ceil((user.lockUntil - Date.now()) / 60000);
    throw new AppError(`Account temporarily locked. Try again in ${lockMins} minutes.`, 423);
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    await user.incLoginAttempts();
    throw new AppError('Invalid email or password.', 401);
  }

  // Check active status
  if (!user.isActive) throw new AppError('Account deactivated. Contact support.', 403);
  if (user.suspension?.isSuspended) {
    throw new AppError('Account suspended. Contact support.', 403);
  }

  // For new users (not email verified), require OTP
  if (!user.isEmailVerified) {
    if (!otp) {
      throw new AppError('OTP required for new accounts. Please check your registration response.', 401);
    }
    const isValidOTP = await user.verifyOTP(otp, 'login_otp');
    if (!isValidOTP) {
      throw new AppError('Invalid or expired OTP.', 401);
    }
    // Mark as verified and clear OTP
    user.isEmailVerified = true;
    await user.clearOTP();
  }

  // Reset login attempts on success
  if (user.loginAttempts > 0) {
    await user.updateOne({ $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } });
  }

  // Generate tokens
  const { accessToken, refreshToken, refreshTokenHash } = generateTokenPair(user._id, user.role);
  user.refreshTokenHash = refreshTokenHash;
  user.lastLogin = new Date();
  user.lastLoginIP = req.ip;
  await user.save({ validateBeforeSave: false });

  res.cookie('refreshToken', refreshToken, cookieOptions);

  res.json({
    success: true,
    message: 'Login successful!',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        rewardPoints: user.rewardPoints,
      },
      accessToken,
    },
  });
};

// ── Refresh Token ─────────────────────────────────────────────
exports.refreshToken = async (req, res, next) => {
  const token = req.cookies.refreshToken;
  if (!token) throw new AppError('No refresh token found.', 401);

  const jwt = require('jsonwebtoken');
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw new AppError('Invalid or expired refresh token.', 401);
  }

  const tokenHash = hashToken(token);
  const user = await User.findOne({
    _id: decoded.id,
    refreshTokenHash: tokenHash,
    isActive: true,
  }).select('+refreshTokenHash');

  if (!user) throw new AppError('Refresh token revoked or invalid.', 401);

  // Token rotation: issue new pair, invalidate old
  const { accessToken, refreshToken: newRefreshToken, refreshTokenHash } = generateTokenPair(user._id, user.role);
  user.refreshTokenHash = refreshTokenHash;
  await user.save({ validateBeforeSave: false });

  res.cookie('refreshToken', newRefreshToken, cookieOptions);

  res.json({
    success: true,
    data: { accessToken },
  });
};

// ── Logout ────────────────────────────────────────────────────
exports.logout = async (req, res, next) => {
  const token = req.cookies.refreshToken;

  if (token && req.user) {
    // Invalidate refresh token in DB
    await User.findByIdAndUpdate(req.user._id, {
      $unset: { refreshTokenHash: 1 },
    });
  }

  res.clearCookie('refreshToken', { ...cookieOptions, maxAge: 0 });

  res.json({ success: true, message: 'Logged out successfully.' });
};

// ── Forgot Password ───────────────────────────────────────────
exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    // Don't reveal whether email exists — security best practice
    return res.json({
      success: true,
      message: 'If that email exists, a reset OTP has been sent.',
    });
  }

  const otp = generateOTP();
  await user.setOTP(otp, 'password_reset');
  await sendEmail({
    to: email,
    subject: '🔐 Project-X Password Reset OTP',
    template: 'password_reset',
    data: { name: user.name, otp },
  });

  res.json({
    success: true,
    message: 'If that email exists, a reset OTP has been sent.',
  });
};

// ── Reset Password ────────────────────────────────────────────
exports.resetPassword = async (req, res, next) => {
  const { email, otp, newPassword } = req.body;

  const user = await User.findOne({ email }).select('+otpHash +otpExpires +otpPurpose');
  if (!user) throw new AppError('Invalid reset request.', 400);

  const isValid = await user.verifyOTP(otp, 'password_reset');
  if (!isValid) throw new AppError('Invalid or expired OTP.', 400);

  await user.clearOTP();
  user.password = newPassword;
  // Invalidate all existing sessions
  user.refreshTokenHash = undefined;
  await user.save();

  res.json({ success: true, message: 'Password reset successful. Please log in.' });
};

// ── Get Me (current user) ─────────────────────────────────────
exports.getMe = async (req, res, next) => {
  const user = await User.findById(req.user._id);

  let profileData = {};
  if (req.user.role === 'customer') {
    const customer = await Customer.findOne({ user: req.user._id })
      .populate('cart.product', 'name images price mrp isOutOfStock');
    profileData.customerProfile = customer;
  }

  res.json({
    success: true,
    data: { user, ...profileData },
  });
};
