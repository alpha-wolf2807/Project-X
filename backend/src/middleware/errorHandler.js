/**
 * CARTEX — Error Handling Middleware
 *
 * Centralized error handling with:
 * - Operational vs programmer errors distinction
 * - Mongoose error transformation
 * - Development vs production error verbosity
 * - Never leaks stack traces in production
 */

const logger = require('../utils/logger');

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Expected errors we handle gracefully
    Error.captureStackTrace(this, this.constructor);
  }
}

const notFound = (req, res, next) => {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404));
};

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // ── Transform Mongoose-specific errors ──────────────────

  // CastError: Invalid MongoDB ObjectId
  if (err.name === 'CastError') {
    error = new AppError(`Invalid ${err.path}: ${err.value}`, 400);
  }

  // ValidationError: Mongoose schema validation failed
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    error = new AppError(messages.join('. '), 400);
  }

  // Duplicate key error (unique constraint)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    error = new AppError(
      `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists.`,
      409
    );
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token. Please log in again.', 401);
  }
  if (err.name === 'TokenExpiredError') {
    error = new AppError('Token expired. Please log in again.', 401);
  }

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = new AppError('File too large. Maximum size allowed.', 400);
  }

  // Log server errors (not operational errors like 404, validation)
  if (!error.isOperational || error.statusCode >= 500) {
    logger.error({
      message: error.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userId: req.user?._id,
    });
  }

  // Development: full error details
  if (process.env.NODE_ENV === 'development') {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      stack: err.stack,
      error: err,
    });
  }

  // Production: only operational error messages to client
  if (error.isOperational) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
    });
  }

  // Unexpected programmer error — don't leak details
  return res.status(500).json({
    success: false,
    message: 'Something went wrong. Please try again later.',
  });
};

module.exports = { AppError, errorHandler, notFound };

