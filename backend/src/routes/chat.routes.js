// chat.routes.js
const express = require('express');
const r = express.Router();
const { protect } = require('../middleware/auth');
const { Chat, Message } = require('../models/index');
const AppError = require('../utils/AppError');
r.use(protect);
r.get('/:roomId/messages', async (req, res, next) => {
  const { page = 1, limit = 50 } = req.query;
  const chat = await Chat.findOne({ roomId: req.params.roomId });
  if (!chat) throw new AppError('Chat room not found.', 404);
  const isParticipant = chat.participants.some((p) => p.user.toString() === req.user._id.toString()) || ['admin', 'support'].includes(req.user.role);
  if (!isParticipant) throw new AppError('Access denied.', 403);
  const messages = await Message.find({ chatRoom: req.params.roomId, deletedAt: null }).populate('sender', 'name avatar role').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(parseInt(limit));
  res.json({ success: true, data: { messages: messages.reverse() } });
});
module.exports = r;
