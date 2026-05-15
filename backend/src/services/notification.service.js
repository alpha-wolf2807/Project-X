/**
 * CARTEX — Notification Service
 */

const { Notification } = require('../models/index');
const { notifyUser } = require('../socket');

const createNotification = async ({ recipient, type, title, body, data, channel = 'in_app' }) => {
  try {
    const notification = await Notification.create({
      recipient,
      type,
      title,
      body,
      data,
      channel,
    });

    // Push via Socket.io (real-time in-app notification)
    notifyUser(recipient.toString(), 'notification:new', {
      _id: notification._id,
      id: notification._id,
      type,
      title,
      body,
      data,
      createdAt: notification.createdAt,
    });

    return notification;
  } catch (err) {
    // Notifications should never crash the main flow
    require('../utils/logger').error('Notification creation failed:', err);
  }
};

module.exports = { createNotification };

