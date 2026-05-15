/**
 * CARTEX — Customer Profile Model
 *
 * Extended profile for customers. Linked 1:1 to User document.
 * Tracks hostel info, addresses, preferences, cart, and purchase history.
 */

const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  label: { type: String, default: 'Hostel Room' }, // "Room 204 Block B"
  hostelName: { type: String, required: true },
  roomNumber: { type: String, required: true },
  block: String,
  floor: String,
  landmark: String,
  coordinates: {
    lat: Number,
    lng: Number,
  },
  isDefault: { type: Boolean, default: false },
}, { _id: true });

const cartItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1, max: 50 },
  priceAtAdd: Number, // Snapshot price when added (price may change)
  addedAt: { type: Date, default: Date.now },
}, { _id: false });

const customerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },

  // ── Hostel Info ───────────────────────────────────────────
  hostelName: { type: String, index: true },
  rollNumber: String,
  district: { type: String, index: true },
  locality: { type: String, index: true },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  isCollegeStudent: { type: Boolean, default: false },
  collegeName: String,
  isHosteller: { type: Boolean, default: false },
  onCampus: { type: Boolean, default: false },
  roomNumber: String,
  hostelLocation: String,
  department: String,
  yearOfStudy: { type: Number, min: 1, max: 6 },

  // ── Addresses ─────────────────────────────────────────────
  addresses: [addressSchema],
  defaultAddress: { type: mongoose.Schema.Types.ObjectId },

  // ── Cart ─────────────────────────────────────────────────
  cart: [cartItemSchema],
  savedForLater: [cartItemSchema],

  // ── Preferences ──────────────────────────────────────────
  preferences: {
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    dietaryFlags: [String], // 'vegan', 'vegetarian', 'gluten-free'
    notifications: {
      orderUpdates: { type: Boolean, default: true },
      promotions: { type: Boolean, default: true },
      flashDeals: { type: Boolean, default: true },
    },
  },

  // ── Wallet & Cashback ─────────────────────────────────────
  wallet: {
    balance: { type: Number, default: 0 },
    transactions: [{
      type: { type: String, enum: ['credit', 'debit'] },
      amount: Number,
      description: String,
      orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
      createdAt: { type: Date, default: Date.now },
    }],
  },

  // ── Stats ─────────────────────────────────────────────────
  stats: {
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    totalSaved: { type: Number, default: 0 }, // vs MRP
    cancelledOrders: { type: Number, default: 0 },
    averageOrderValue: { type: Number, default: 0 },
  },

  // ── Activity Tracking for Recommendations ────────────────
  recentlyViewed: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    viewedAt: { type: Date, default: Date.now },
  }],
  purchaseHistory: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    count: Number,
    lastPurchasedAt: Date,
  }],

  // ── Applied Coupons History ───────────────────────────────
  usedCoupons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' }],

  // ── Loyalty Tier ─────────────────────────────────────────
  loyaltyTier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum'],
    default: 'bronze',
  },

}, { timestamps: true });

// ── Indexes ──────────────────────────────────────────────────
customerSchema.index({ hostelName: 1 });
customerSchema.index({ 'stats.totalSpent': -1 });
customerSchema.index({ loyaltyTier: 1 });

// ── Method: Update loyalty tier based on spend ───────────────
customerSchema.methods.updateLoyaltyTier = function () {
  const spend = this.stats.totalSpent;
  if (spend >= 10000) this.loyaltyTier = 'platinum';
  else if (spend >= 5000) this.loyaltyTier = 'gold';
  else if (spend >= 2000) this.loyaltyTier = 'silver';
  else this.loyaltyTier = 'bronze';
};

module.exports = mongoose.model('Customer', customerSchema);

