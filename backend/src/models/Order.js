/**
 * CARTEX — Order Model
 *
 * The central business entity. Tracks the complete lifecycle of an order:
 * Customer → Distributor → Delivery Dude → Customer
 *
 * Features:
 * - Immutable order items (snapshot pricing)
 * - Full audit trail with timestamps
 * - OTP-based delivery verification
 * - Multi-status workflow
 * - Refund tracking
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  // Snapshot of product at time of order (immutable)
  productSnapshot: {
    name: String,
    image: String,
    mrp: Number,
    price: Number,
    brand: String,
    category: String,
  },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  savingsVsMRP: Number,
}, { _id: true });

const statusHistorySchema = new mongoose.Schema({
  status: String,
  timestamp: { type: Date, default: Date.now },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedByRole: String,
  note: String,
  location: {
    lat: Number,
    lng: Number,
  },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  // ── Order Identity ────────────────────────────────────────
  orderNumber: {
    type: String,
    unique: true,
    index: true,
  }, // PX-2024-001234

  // ── Parties ───────────────────────────────────────────────
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  distributor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  deliveryDude: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  zone: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Zone',
  },

  // ── Items ─────────────────────────────────────────────────
  items: {
    type: [orderItemSchema],
    validate: [arr => arr.length > 0, 'Order must have at least one item'],
  },

  // ── Delivery Address ──────────────────────────────────────
  deliveryAddress: {
    hostelName: { type: String, required: true },
    roomNumber: { type: String, required: true },
    block: String,
    floor: String,
    landmark: String,
    district: String,
    locality: String,
    coordinates: {
      lat: Number,
      lng: Number,
    },
  },

  // ── Pricing Breakdown ────────────────────────────────────
  pricing: {
    subtotal: { type: Number, required: true },       // Sum of item prices
    mrpTotal: { type: Number, required: true },        // Sum of MRPs
    totalSavings: { type: Number, default: 0 },        // MRP - subtotal
    deliveryFee: { type: Number, default: 0 },
    platformFee: { type: Number, default: 0 },
    couponDiscount: { type: Number, default: 0 },
    cashbackApplied: { type: Number, default: 0 },
    walletDeducted: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },     // Final payable
    profitMargin: { type: Number, select: false },     // Internal metric
  },

  // ── Coupon ────────────────────────────────────────────────
  coupon: {
    code: String,
    couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
    discount: Number,
  },

  // ── Payment ───────────────────────────────────────────────
  payment: {
    method: {
      type: String,
      enum: ['razorpay', 'cod', 'wallet'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending',
      index: true,
    },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    paidAt: Date,
    refundId: String,
    refundAmount: Number,
    refundedAt: Date,
    refundReason: String,
  },

  // ── Order Status Workflow ─────────────────────────────────
  // pending → confirmed → distributor_ordered → picked_up
  // → out_for_delivery → delivered | failed | cancelled
  status: {
    type: String,
    enum: [
      'pending',           // Order placed, payment pending
      'confirmed',         // Payment done, waiting for distributor
      'distributor_ordered', // Distributor placed procurement order
      'picked_up',         // Delivery dude picked up the items
      'out_for_delivery',  // En route to hostel
      'delivered',         // OTP verified, delivered
      'failed_delivery',   // Delivery failed (customer absent, etc.)
      'cancelled',         // Cancelled by customer/admin
      'refund_initiated',  // Refund started
      'refunded',          // Refund completed
    ],
    default: 'pending',
    index: true,
  },

  // ── Status History (Full Audit Trail) ────────────────────
  statusHistory: [statusHistorySchema],

  // ── Delivery Verification OTP ─────────────────────────────
  deliveryOTP: {
    code: { type: String, select: false }, // NOT hashed intentionally (6-digit display to customer)
    expiresAt: Date,
    verifiedAt: Date,
    attempts: { type: Number, default: 0 },
  },

  // ── Estimated Delivery ────────────────────────────────────
  estimatedDelivery: {
    minMinutes: Number,
    maxMinutes: Number,
    estimatedAt: Date,
  },

  // ── Actual Timestamps ─────────────────────────────────────
  confirmedAt: Date,
  distributorAssignedAt: Date,
  pickedUpAt: Date,
  deliveredAt: Date,
  cancelledAt: Date,
  cancellationReason: String,
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // ── Delivery Attempt Tracking ────────────────────────────
  deliveryAttempts: [{
    attemptedAt: Date,
    reason: String,
    location: { lat: Number, lng: Number },
  }],

  // ── Live Tracking ────────────────────────────────────────
  currentLocation: {
    lat: Number,
    lng: Number,
    updatedAt: Date,
  },

  // ── Rating ────────────────────────────────────────────────
  rating: {
    score: { type: Number, min: 1, max: 5 },
    review: String,
    ratedAt: Date,
  },

  // ── Internal Notes ────────────────────────────────────────
  internalNotes: [{
    note: String,
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    addedAt: { type: Date, default: Date.now },
  }],

  // ── Fraud Flags ──────────────────────────────────────────
  fraudFlags: [{
    type: { type: String },
    detectedAt: Date,
    resolved: { type: Boolean, default: false },
  }],

  // ── Chat Room ────────────────────────────────────────────
  chatRoomId: String, // Socket.io room ID (temporary)
  chatExpiresAt: Date, // Auto-delete chat after delivery

}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// ── Indexes ──────────────────────────────────────────────────
orderSchema.index({ customer: 1, status: 1, createdAt: -1 });
orderSchema.index({ distributor: 1, status: 1 });
orderSchema.index({ deliveryDude: 1, status: 1 });
orderSchema.index({ zone: 1, status: 1 });
orderSchema.index({ 'payment.status': 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ 'deliveryAddress.hostelName': 1 });

// ── Pre-save: Generate order number ──────────────────────────
orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 900000) + 100000;
    this.orderNumber = `PX-${year}-${random}`;
  }
  // Auto-generate delivery OTP when order is confirmed
  if (this.isModified('status') && this.status === 'confirmed' && !this.deliveryOTP?.code) {
    this.deliveryOTP = {
      code: Math.floor(100000 + Math.random() * 900000).toString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      attempts: 0,
    };
  }
  next();
});

// ── Virtual: isDeliverable ────────────────────────────────────
orderSchema.virtual('isDeliverable').get(function () {
  return ['confirmed', 'distributor_ordered', 'picked_up'].includes(this.status);
});

module.exports = mongoose.model('Order', orderSchema);

