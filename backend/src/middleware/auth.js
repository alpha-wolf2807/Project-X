/**
 * CARTEX — JWT Authentication Middleware
 *
 * Uses dual-token strategy:
 * - Access token (15min): stateless, sent in Authorization header
 * - Refresh token (7 days): hashed & stored in DB, sent as httpOnly cookie
 *
 * Security:
 * - Access token never stored anywhere (stateless)
 * - Refresh token hashed with SHA-256 before DB storage
 * - Automatic rotation on refresh
 * - RBAC enforcement at middleware level
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const AppError = require('../utils/AppError');

// ── Token Generation ─────────────────────────────────────────

const signAccessToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  );
};

const signRefreshToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
  );
};

const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const generateTokenPair = (userId, role) => {
  const accessToken = signAccessToken(userId, role);
  const refreshToken = signRefreshToken(userId, role);
  return { accessToken, refreshToken, refreshTokenHash: hashToken(refreshToken) };
};

// ── Refresh Token Cookie Options ─────────────────────────────
const cookieOptions = {
  httpOnly: true,      // Prevents XSS access to cookie
  secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/',
};

// ── Middleware: Protect Routes ────────────────────────────────
const protect = async (req, res, next) => {
  try {
    // Extract token from header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return next(new AppError('Authentication required. Please log in.', 401));
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new AppError('Token expired. Please refresh your session.', 401));
      }
      return next(new AppError('Invalid token. Please log in again.', 401));
    }

    // Fetch user from DB (ensures user still exists and is active)
    const user = await User.findById(decoded.id).select('+suspension');
    if (!user) {
      return next(new AppError('User no longer exists.', 401));
    }

    if (!user.isActive) {
      return next(new AppError('Your account has been deactivated. Contact support.', 403));
    }

    if (user.suspension?.isSuspended) {
      const msg = user.suspension.expiresAt
        ? `Account suspended until ${user.suspension.expiresAt.toDateString()}.`
        : 'Account permanently suspended. Contact support.';
      return next(new AppError(msg, 403));
    }

    // Attach user to request
    req.user = user;
    next();

  } catch (err) {
    next(new AppError('Authentication failed.', 401));
  }
};

// ── Middleware: Role-Based Access Control ─────────────────────
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Role '${req.user.role}' is not authorized for this resource.`,
          403
        )
      );
    }
    next();
  };
};

// ── Middleware: Optional Auth (for public routes with user context) ─
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return next();

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.id);
    if (user && user.isActive) req.user = user;
  } catch {
    // Silent fail — route proceeds without user context
  }
  next();
};

module.exports = {
  protect,
  authorize,
  optionalAuth,
  signAccessToken,
  signRefreshToken,
  generateTokenPair,
  hashToken,
  cookieOptions,
};

