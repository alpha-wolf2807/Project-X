/**
 * CARTEX — MongoDB Connection Configuration
 *
 * Uses Mongoose with production-grade options:
 * - Connection pooling for high concurrency
 * - Auto-reconnect on failure
 * - Index creation disabled in production (use migrations)
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  const options = {
    maxPoolSize: 10,          // Max concurrent connections
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4,                // Use IPv4 to avoid issues
    autoIndex: process.env.NODE_ENV !== 'production',
  };

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    isConnected = true;

    logger.info(`MongoDB Atlas connected: ${conn.connection.host}`);

    // Connection event handlers
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected — attempting reconnect...');
      isConnected = false;
      setTimeout(connectDB, 5000);
    });

  } catch (err) {
    logger.error('MongoDB initial connection failed:', err.message);
    throw err;
  }
};

module.exports = { connectDB };

