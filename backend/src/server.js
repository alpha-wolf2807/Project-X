/**
 * PROJECT-X — Express App Configuration
 */

require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const logger = require('./utils/logger');

// ── Middleware Imports ─────────────────────────────
const { notFound, errorHandler } = require('./middleware/errorHandler');

// ── Route Imports ─────────────────────────────────
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const orderRoutes = require('./routes/order.routes');

// ── Initialize App ────────────────────────────────
const app = express();

// ── Core Middleware ───────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── CORS Configuration ────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  })
);

// ── HTTP Request Logger ───────────────────────────
app.use(
  morgan('dev', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

// ── Health Check Route ────────────────────────────
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'PROJECT-X Backend Running Successfully 🚀',
    environment: process.env.NODE_ENV,
  });
});

// ── API Routes ────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// ── 404 Handler ───────────────────────────────────
app.use(notFound);

// ── Global Error Handler ──────────────────────────
app.use(errorHandler);

// ── Export App ────────────────────────────────────
module.exports = app;