const logger = require('../utils/logger');
let redisClient = null;

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
    redisClient = client;

    logger.info('✅ Redis connected');

    return client;

  } catch (err) {
    logger.error('Redis connection failed:', err);
    redisClient = null;

    // Prevent app crash
    return null;
  }
}

const cacheGet = async (key) => {
  if (!redisClient) return null;
  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (err) {
    logger.error('Redis cacheGet failed:', err);
    return null;
  }
};

const cacheSet = async (key, value, ttl = 0) => {
  if (!redisClient) return null;
  try {
    const payload = JSON.stringify(value);
    if (ttl > 0) {
      await redisClient.setEx(key, ttl, payload);
    } else {
      await redisClient.set(key, payload);
    }
  } catch (err) {
    logger.error('Redis cacheSet failed:', err);
    return null;
  }
};

const cacheDelPattern = async (pattern) => {
  if (!redisClient) return null;
  try {
    const keys = await redisClient.keys(pattern);
    if (!keys.length) return 0;
    return await redisClient.del(keys);
  } catch (err) {
    logger.error('Redis cacheDelPattern failed:', err);
    return null;
  }
};

module.exports = {
  connectRedis,
  cacheGet,
  cacheSet,
  cacheDelPattern,
};