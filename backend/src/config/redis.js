/**
 * PROJECT-X — Redis Configuration
 *
 * Used for:
 * - OTP storage with TTL
 * - Rate limiting counters
 * - Session caching
 * - Pub/Sub for Socket.io scaling (multi-server)
 * - Product/category caching (reduce DB load)
 */

const { createClient } = require('redis');
const logger = require('../utils/logger');

let redisClient = null;

const connectRedis = async () => {
  // Graceful degradation: Redis is optional, app works without it
  if (!process.env.REDIS_URL) {
    logger.warn('REDIS_URL not set — running without cache layer');
    return;
  }

  try {
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
      },
    });

    redisClient.on('error', (err) => logger.error('Redis error:', err));
    redisClient.on('reconnecting', () => logger.warn('Redis reconnecting...'));

    await redisClient.connect();
  } catch (err) {
    logger.warn('Redis connection failed — continuing without cache:', err.message);
    redisClient = null;
  }
};

const getRedis = () => redisClient;

// Cache helper with JSON serialization
const cacheSet = async (key, value, ttlSeconds = 3600) => {
  if (!redisClient) return false;
  try {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
    return true;
  } catch { return false; }
};

const cacheGet = async (key) => {
  if (!redisClient) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
};

const cacheDel = async (key) => {
  if (!redisClient) return false;
  try {
    await redisClient.del(key);
    return true;
  } catch { return false; }
};

const cacheDelPattern = async (pattern) => {
  if (!redisClient) return false;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length) await redisClient.del(keys);
    return true;
  } catch { return false; }
};

module.exports = { connectRedis, getRedis, cacheSet, cacheGet, cacheDel, cacheDelPattern };
