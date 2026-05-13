/**
 * PROJECT-X — Main Server Entry Point
 *
 * Architecture: Express.js with modular middleware stack, Socket.io for
 * real-time features, and graceful shutdown handling.
 *
 * Scalability: Cluster-ready (PM2), stateless JWT auth, Redis session store.
 */

require('dotenv').config();
require('express-async-errors');

const http = require('http');
const app = require('./app');
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { initSocket } = require('./socket');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();
    logger.info('✅ MongoDB connected');

    // Connect to Redis (optional caching layer)
    await connectRedis();
    logger.info('✅ Redis connected');

    // Create HTTP server and attach Socket.io
    const server = http.createServer(app);
    initSocket(server);
    logger.info('✅ Socket.io initialized');

    server.listen(PORT, () => {
      logger.info(`🚀 PROJECT-X server running on port ${PORT} [${process.env.NODE_ENV}]`);
    });

    // ── Graceful Shutdown ──────────────────────────────
    const shutdown = async (signal) => {
      logger.info(`${signal} received — shutting down gracefully...`);
      server.close(async () => {
        const mongoose = require('mongoose');
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle unhandled promise rejections (prevent crash)
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
