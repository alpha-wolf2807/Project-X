/**
 * PROJECT-X — Supporting Models
 *
 * Contains: Category, Zone, Coupon, Complaint, Notification, Chat, Message, AuditLog
 */

const mongoose = require('mongoose');

// ════════════════════════════════════════════════════════════
// CATEGORY MODEL
// ════════════════════════════════════════════════════════════
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, required: true, unique: true, lowercase: true },
  description: String,
  icon: String,       // Emoji or icon class
  image: {
    url: String,
    publicId: String,
  },
  parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  isActive: { type: Boolean, default: true, index: true },
  sortOrder: { type: Number, default: 0 },
  productCount: { type: Number, default: 0 },
}, { timestamps: true });

categorySchema.index({ parentCategory: 1, isActive: 1 });

const Category = mongoose.model('Category', categorySchema);


// ════════════════════════════════════════════════════════════
// ZONE MODEL
// ════════════════════════════════════════════════════════════
const zoneSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true },
  description: String,
  hostels: [{ type: String }], // Hostel names in this zone
  districts: [{ type: String }], // District names for location routing
  localities: [{ type: String }], // Locality/area names for location routing
  boundaries: {
    type: Object,
    default: null,
  },
  isActive: { type: Boolean, default: true },
  distributor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deliveryDudes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  stats: {
    totalOrders: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
  },
}, { timestamps: true });

zoneSchema.index({ boundaries: '2dsphere' });
zoneSchema.index({ districts: 1 });
zoneSchema.index({ localities: 1 });

const Zone = mongoose.model('Zone', zoneSchema);


// ════════════════════════════════════════════════════════════
// COUPON MODEL
// ════════════════════════════════════════════════════════════
const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  type: {
    type: String,
    enum: ['percentage', 'fixed', 'free_delivery', 'cashback'],
    required: true,
  },
  value: { type: Number, required: true },         // % or ₹ amount
  minOrderAmount: { type: Number, default: 0 },
  maxDiscountAmount: Number,                        // Cap for percentage coupons
  usageLimit: { type: Number, default: null },      // null = unlimited
  usedCount: { type: Number, default: 0 },
  perUserLimit: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },
  applicableFor: {
    type: String,
    enum: ['all', 'new_users', 'specific_users', 'specific_categories'],
    default: 'all',
  },
  specificUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  specificCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
  validFrom: { type: Date, default: Date.now },
  validUntil: { type: Date, required: true },
  description: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

couponSchema.index({ code: 1, isActive: 1 });
couponSchema.index({ validUntil: 1 });

const Coupon = mongoose.model('Coupon', couponSchema);


// ════════════════════════════════════════════════════════════
// COMPLAINT MODEL
// ════════════════════════════════════════════════════════════
const complaintSchema = new mongoose.Schema({
  ticketNumber: { type: String, unique: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  category: {
    type: String,
    enum: ['wrong_item', 'missing_item', 'damaged', 'late_delivery', 'payment', 'rude_delivery', 'other'],
    required: true,
  },
  subject: { type: String, required: true, maxlength: 200 },
  description: { type: String, required: true, maxlength: 2000 },
  proofImages: [{
    url: String,
    publicId: String,
  }],

  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true,
  },
  status: {
    type: String,
    enum: ['open', 'assigned', 'in_progress', 'waiting_customer', 'resolved', 'closed'],
    default: 'open',
    index: true,
  },

  resolution: {
    action: String,
    refundAmount: Number,
    resolvedAt: Date,
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customerRating: { type: Number, min: 1, max: 5 },
  },

  // Internal notes (not visible to customer)
  internalNotes: [{
    note: String,
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    addedAt: { type: Date, default: Date.now },
  }],

  // Customer-visible conversation thread
  thread: [{
    message: String,
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sentByRole: String,
    sentAt: { type: Date, default: Date.now },
    attachments: [String],
  }],

  // AI suggested responses
  aiSuggestions: [String],

  firstResponseAt: Date,
  resolvedAt: Date,
  slaBreached: { type: Boolean, default: false },

}, { timestamps: true });

complaintSchema.pre('save', function (next) {
  if (!this.ticketNumber) {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 90000) + 10000;
    this.ticketNumber = `TKT-${year}-${random}`;
  }
  next();
});

complaintSchema.index({ customer: 1, status: 1 });
complaintSchema.index({ status: 1, priority: 1, createdAt: -1 });
complaintSchema.index({ assignedTo: 1, status: 1 });

const Complaint = mongoose.model('Complaint', complaintSchema);


// ════════════════════════════════════════════════════════════
// NOTIFICATION MODEL
// ════════════════════════════════════════════════════════════
const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: {
    type: String,
    enum: [
      'order_placed', 'order_confirmed', 'order_assigned',
      'order_picked_up', 'out_for_delivery', 'order_delivered',
      'order_cancelled', 'payment_success', 'payment_failed',
      'refund_initiated', 'refund_completed',
      'complaint_update', 'complaint_resolved',
      'new_offer', 'flash_sale', 'low_stock',
      'account_warning', 'account_suspended', 'account_reactivated',
      'reward_earned', 'badge_earned', 'level_up',
      'system_announcement',
    ],
    required: true,
  },
  title: { type: String, required: true },
  body: { type: String, required: true },
  data: mongoose.Schema.Types.Mixed, // Extra payload (orderId, etc.)
  isRead: { type: Boolean, default: false, index: true },
  readAt: Date,
  channel: {
    type: String,
    enum: ['in_app', 'push', 'email', 'sms'],
    default: 'in_app',
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal',
  },
}, { timestamps: true });

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);


// ════════════════════════════════════════════════════════════
// CHAT / MESSAGE MODELS
// ════════════════════════════════════════════════════════════
const chatSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true, index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  participants: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: String,
    joinedAt: { type: Date, default: Date.now },
  }],
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date, required: true, index: true }, // TTL: auto-delete after delivery
  lastMessage: {
    text: String,
    sentAt: Date,
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
}, { timestamps: true });

// TTL index: MongoDB auto-deletes chat documents 24h after expiry
chatSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });

const Chat = mongoose.model('Chat', chatSchema);


const messageSchema = new mongoose.Schema({
  chatRoom: { type: String, required: true, index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderRole: String,
  content: { type: String, required: true, maxlength: 1000 },
  type: {
    type: String,
    enum: ['text', 'image', 'system', 'location'],
    default: 'text',
  },
  mediaUrl: String,
  isRead: { type: Boolean, default: false },
  readAt: Date,
  deletedAt: Date, // Soft delete
}, { timestamps: true });

messageSchema.index({ chatRoom: 1, createdAt: 1 });

const Message = mongoose.model('Message', messageSchema);


// ════════════════════════════════════════════════════════════
// AUDIT LOG MODEL
// ════════════════════════════════════════════════════════════
const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true }, // 'user.suspended', 'product.priceChanged'
  resource: { type: String, required: true }, // Collection name
  resourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  performedByRole: String,
  ipAddress: String,
  userAgent: String,
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed,
  },
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ createdAt: -1 }, { expireAfterSeconds: 365 * 24 * 3600 }); // Keep 1 year

const AuditLog = mongoose.model('AuditLog', auditLogSchema);


// ════════════════════════════════════════════════════════════
// REVIEW MODEL
// ════════════════════════════════════════════════════════════
const reviewSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: String,
  body: String,
  images: [String],
  isVerifiedPurchase: { type: Boolean, default: true },
  helpfulVotes: { type: Number, default: 0 },
  isApproved: { type: Boolean, default: false }, // Moderation
}, { timestamps: true });

reviewSchema.index({ product: 1, isApproved: 1 });
reviewSchema.index({ customer: 1 });
// Ensure one review per order per product
reviewSchema.index({ order: 1, product: 1, customer: 1 }, { unique: true });

const Review = mongoose.model('Review', reviewSchema);


module.exports = {
  Category,
  Zone,
  Coupon,
  Complaint,
  Notification,
  Chat,
  Message,
  AuditLog,
  Review,
};
