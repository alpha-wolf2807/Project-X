const logger = require('../utils/logger');

async function connectRedis() {
  try {
    // Skip Redis if URL not provided
    if (!process.env.REDIS_URL) {
      logger.warn('REDIS_URL not set — running without cache layer');
      return null;
    }

    // Dynamic import for redis package
    const { createClient } = require('redis');

    const client = createClient({
      url: process.env.REDIS_URL,
    });

    client.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    await client.connect();

    logger.info('✅ Redis connected');

    return client;

  } catch (err) {
    logger.error('Redis connection failed:', err);

    // Prevent app crash
    return null;
  }
}

module.exports = {
  connectRedis,
};