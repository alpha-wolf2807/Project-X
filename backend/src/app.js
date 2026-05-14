/**
 * PROJECT-X — Express App Configuration
 *
 * Production-ready middleware architecture
 */

require('dotenv').config();
require('express-async-errors');

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const logger = require('./utils/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// ── Route Imports ───────────────────────────────────────────
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const orderRoutes = require('./routes/order.routes');
const paymentRoutes = require('./routes/payment.routes');
const adminRoutes = require('./routes/admin.routes');
const distributorRoutes = require('./routes/distributor.routes');
const deliveryRoutes = require('./routes/delivery.routes');
const supportRoutes = require('./routes/support.routes');
const notificationRoutes = require('./routes/notification.routes');
const complaintRoutes = require('./routes/complaint.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const chatRoutes = require('./routes/chat.routes');
const zoneRoutes = require('./routes/zone.routes');
const districtRoutes = require('./routes/district.routes');
const localityRoutes = require('./routes/locality.routes');
const couponRoutes = require('./routes/coupon.routes');
const categoryRoutes = require('./routes/category.routes');

const app = express();

// ── Helmet Security ─────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// ── CORS Configuration ──────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://cartex-dhy4.onrender.com',
  'https://project-x-j9go.onrender.com',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS policy violation'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
    ],
  })
);

// ── Rate Limiting ───────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs:
    parseInt(process.env.RATE_LIMIT_WINDOW_MS) ||
    15 * 60 * 1000,

  max:
    parseInt(process.env.RATE_LIMIT_MAX) ||
    100,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },

  skip: (req) =>
    req.path.startsWith('/api/v1/payments/webhook'),
});

app.use('/api', apiLimiter);

// ── Auth Limiter ────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,

  message: {
    success: false,
    message:
      'Too many authentication attempts. Try again later.',
  },
});

app.use('/api/v1/auth', authLimiter);

// ── Body Parsing ────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));

app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb',
  })
);

app.use(cookieParser(process.env.COOKIE_SECRET));

// ── Sanitization Middleware ─────────────────────────────────
app.use(mongoSanitize());
app.use(xss());

app.use(
  hpp({
    whitelist: ['price', 'rating', 'category', 'sort'],
  })
);

// ── Compression ─────────────────────────────────────────────
app.use(compression());

// ── Logging ─────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('combined', {
      stream: {
        write: (msg) => logger.info(msg.trim()),
      },

      skip: (req) => req.path === '/api/health',
    })
  );
}

// ── Root Route ──────────────────────────────────────────────
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'PROJECT-X Backend Running Successfully 🚀'
  });
});

// ── Health Check Route ──────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: require('../../package.json').version,
  });
});

// ── API Routes ──────────────────────────────────────────────
const API = '/api/v1';

app.use(`${API}/auth`, authRoutes);
app.use(`${API}/users`, userRoutes);
app.use(`${API}/products`, productRoutes);
app.use(`${API}/orders`, orderRoutes);
app.use(`${API}/payments`, paymentRoutes);
app.use(`${API}/admin`, adminRoutes);
app.use(`${API}/distributor`, distributorRoutes);
app.use(`${API}/delivery`, deliveryRoutes);
app.use(`${API}/support`, supportRoutes);
app.use(`${API}/notifications`, notificationRoutes);
app.use(`${API}/complaints`, complaintRoutes);
app.use(`${API}/analytics`, analyticsRoutes);
app.use(`${API}/chat`, chatRoutes);
app.use(`${API}/zones`, zoneRoutes);
app.use(`${API}/districts`, districtRoutes);
app.use(`${API}/localities`, localityRoutes);
app.use(`${API}/coupons`, couponRoutes);
app.use(`${API}/categories`, categoryRoutes);

// ── 404 Middleware ──────────────────────────────────────────
app.use(notFound);

// ── Global Error Handler ────────────────────────────────────
app.use(errorHandler);

module.exports = app;