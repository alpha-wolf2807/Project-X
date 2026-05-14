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
    console.log('STEP 1 → Starting server');

    // MongoDB
    console.log('STEP 2 → Connecting MongoDB');
    await connectDB();
    console.log('✅ MongoDB connected');

    // Redis
    console.log('STEP 3 → Connecting Redis');
    await connectRedis();
    console.log('✅ Redis step completed');

    // Create Server
    console.log('STEP 4 → Creating HTTP server');
    const server = http.createServer(app);

    // Socket.io
    console.log('STEP 5 → Initializing Socket');
    initSocket(server);
    console.log('✅ Socket initialized');

    // Listen
    console.log('STEP 6 → Starting listener');

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    process.on('SIGTERM', () => {
      console.log('SIGTERM received');
      process.exit(0);
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received');
      process.exit(0);
    });

    process.on('unhandledRejection', (err) => {
      console.error('UNHANDLED REJECTION:', err);
    });

  } catch (err) {
    console.error('SERVER START FAILED:', err);
    process.exit(1);
  }
}

startServer();