/**
 * PROJECT-X — Socket.io Client Service
 *
 * Singleton socket instance with auto-reconnect.
 * Connects with JWT access token for authentication.
 */

import { io } from 'socket.io-client';
import { useAuthStore } from '@store/authStore';

const rawSocketUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'https://project-x-j9go.onrender.com';
const SOCKET_URL = rawSocketUrl.replace(/\/$/, '');

let socket = null;

export const connectSocket = () => {
  const { accessToken } = useAuthStore.getState();
  if (!accessToken) return null;

  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token: accessToken },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000,
  });

  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.warn('⚠️ Socket disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('❌ Socket error:', err.message);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;

export const joinOrderRoom = (orderId) => {
  if (socket?.connected) {
    socket.emit('order:join', { orderId });
  }
};

export const sendChatMessage = (chatRoomId, content, type = 'text') => {
  if (socket?.connected) {
    socket.emit('chat:send', { chatRoomId, content, type });
  }
};

export const sendTyping = (chatRoomId, isTyping) => {
  if (socket?.connected) {
    socket.emit('chat:typing', { chatRoomId, isTyping });
  }
};

export const updateDeliveryLocation = (orderId, lat, lng) => {
  if (socket?.connected) {
    socket.emit('delivery:location', { orderId, lat, lng });
  }
};

export const subscribeToZone = (zoneId) => {
  if (socket?.connected) {
    socket.emit('zone:subscribe', { zoneId });
  }
};

export default { connectSocket, disconnectSocket, getSocket, joinOrderRoom, sendChatMessage, sendTyping, updateDeliveryLocation, subscribeToZone };
