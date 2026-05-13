/**
 * PROJECT-X — Express App Configuration
 *
 * Security-first middleware stack:
 * helmet → rate limiting → CORS → sanitization → body parsing → routes
 *
 * Every middleware is justified for production use.
 */

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

const { errorHandler, notFound } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

// Route imports
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
const couponRoutes = require('./routes/coupon.routes');
const categoryRoutes = require('./routes/category.routes');

const app = express();

// ── Security Headers (Helmet) ────────────────────────────────
// Sets 15+ HTTP headers to prevent common attacks
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ── CORS Configuration ──────────────────────────────────────
// Strict origin control; credentials allowed for cookie-based refresh tokens
const corsOptions = {
  origin: (origin, callback) => {
    const whitelist = [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ];
    if (!origin || whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
app.use(cors(corsOptions));

// ── Global Rate Limiting ────────────────────────────────────
// Prevents brute force, DDoS, and API abuse
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
  skip: (req) => req.path.startsWith('/api/payments/webhook'), // Skip webhooks
});
app.use('/api', globalLimiter);

// Stricter limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts, please wait 15 minutes.' },
});
app.use('/api/auth', authLimiter);

// ── Body Parsing ────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// ── Data Sanitization ───────────────────────────────────────
// Prevents NoSQL injection (strips $ and . from req.body/params/query)
app.use(mongoSanitize());
// Prevents XSS attacks (sanitizes HTML in input)
app.use(xss());
// Prevents HTTP Parameter Pollution
app.use(hpp({ whitelist: ['price', 'rating', 'category', 'sort'] }));

// ── Compression ─────────────────────────────────────────────
// Reduces response size ~70% for text-based responses
app.use(compression());

// ── Logging ─────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
    skip: (req) => req.path === '/api/health',
  }));
}

// ── Health Check ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
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
app.use(`${API}/coupons`, couponRoutes);
app.use(`${API}/categories`, categoryRoutes);

// ── 404 Handler ─────────────────────────────────────────────
app.use(notFound);

// ── Global Error Handler ────────────────────────────────────
app.use(errorHandler);

module.exports = app;
