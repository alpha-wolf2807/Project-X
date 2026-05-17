const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const Order = require('../models/Order');

let io = null;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'https://cartexx.onrender.com',
      credentials: true,
    },
  });

  // Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_ACCESS_SECRET
      );

      const user = await User.findById(decoded.id);

      if (!user) {
        return next(new Error('Unauthorized'));
      }

      socket.userId = user._id.toString();
      socket.userRole = user.role;
      socket.userName = user.name;

      next();

    } catch (error) {
      console.error('Socket Auth Error:', error.message);
      next(new Error('Invalid token'));
    }
  });

  // Connection
  io.on('connection', (socket) => {
    console.log(
      `✅ Socket Connected: ${socket.userName}`
    );

    // Personal room
    socket.join(`user-${socket.userId}`);

    // User online broadcast
    socket.broadcast.emit('user:online', {
      userId: socket.userId,
    });

    // Join Order Room
    socket.on('order:join', async ({ orderId }) => {
      try {
        const order = await Order.findById(orderId);

        if (!order) {
          return socket.emit('error', {
            message: 'Order not found',
          });
        }

        socket.join(`order-${orderId}`);

        socket.emit('order:joined', {
          success: true,
          orderId,
        });

      } catch (error) {
        console.error(
          'Order Join Error:',
          error.message
        );
      }
    });

    // Delivery Location Updates
    socket.on(
      'delivery:location',
      async ({ orderId, lat, lng }) => {
        try {
          await Order.findByIdAndUpdate(orderId, {
            currentLocation: {
              lat,
              lng,
              updatedAt: new Date(),
            },
          });

          io.to(`order-${orderId}`).emit(
            'delivery:location_update',
            {
              orderId,
              location: { lat, lng },
              timestamp: new Date(),
            }
          );

        } catch (error) {
          console.error(
            'Location Update Error:',
            error.message
          );
        }
      }
    );

    // Delivery Status
    socket.on(
      'delivery:status',
      ({ orderId, status }) => {
        io.to(`order-${orderId}`).emit(
          'delivery:status_update',
          {
            orderId,
            status,
            timestamp: new Date(),
          }
        );
      }
    );

    // Disconnect
    socket.on('disconnect', () => {
      console.log(
        `❌ Socket Disconnected: ${socket.userId}`
      );

      socket.broadcast.emit('user:offline', {
        userId: socket.userId,
      });
    });
  });

  console.log('🚀 Socket.io initialized');

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }

  return io;
};

const notifyUser = (userId, event, data) => {
  if (!io) return;

  io.to(`user-${userId}`).emit(event, data);
};

module.exports = {
  initSocket,
  getIO,
  notifyUser,
};