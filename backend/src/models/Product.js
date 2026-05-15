/**
 * CARTEX — Product Model
 *
 * Full-featured product schema with:
 * - MRP vs platform price (auto strikethrough logic)
 * - Flash sales with scheduling
 * - Inventory management
 * - SEO-friendly slugs
 * - Rating aggregation
 * - Bulk pricing tiers
 */

const mongoose = require('mongoose');
const slugify = require('../utils/slugify');

const imageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: String,
  alt: String,
  isPrimary: { type: Boolean, default: false },
}, { _id: true });

const variantSchema = new mongoose.Schema({
  name: String,      // e.g. "500ml", "Pack of 3"
  sku: String,
  mrp: Number,
  price: Number,
  stock: Number,
  weight: String,
}, { _id: true });

const flashSaleSchema = new mongoose.Schema({
  isActive: { type: Boolean, default: false },
  salePrice: Number,
  discountPercent: Number,
  startTime: Date,
  endTime: Date,
  totalSlots: Number,
  soldSlots: { type: Number, default: 0 },
}, { _id: false });

const productSchema = new mongoose.Schema({
  // ── Core Info ─────────────────────────────────────────────
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters'],
    index: 'text', // Full-text search
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    index: true,
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },
  shortDescription: {
    type: String,
    maxlength: [200, 'Short description cannot exceed 200 characters'],
  },
  brand: { type: String, trim: true },
  sku: { type: String, unique: true, sparse: true },

  // ── Category ──────────────────────────────────────────────
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true,
  },
  tags: [{ type: String, lowercase: true, trim: true }],

  // ── Pricing ──────────────────────────────────────────────
  mrp: {
    type: Number,
    required: [true, 'MRP is required'],
    min: [0, 'MRP cannot be negative'],
  },
  price: {
    type: Number,
    required: [true, 'Platform price is required'],
    min: [0, 'Price cannot be negative'],
    validate: {
      validator: function (v) { return v <= this.mrp; },
      message: 'Platform price cannot exceed MRP',
    },
  },
  costPrice: {  // What distributor pays — used for profit calculation
    type: Number,
    min: 0,
    select: false, // Only admins/distributors can see this
  },

  // ── Discount ─────────────────────────────────────────────
  // Auto-calculated, not stored (virtual)
  // discountPercent = Math.round((mrp - price) / mrp * 100)

  // ── Flash Sale ────────────────────────────────────────────
  flashSale: flashSaleSchema,

  // ── Scheduled Discounts ───────────────────────────────────
  scheduledDiscount: {
    isScheduled: { type: Boolean, default: false },
    discountPrice: Number,
    startDate: Date,
    endDate: Date,
  },

  // ── Images ───────────────────────────────────────────────
  images: {
    type: [imageSchema],
    validate: [arr => arr.length <= 8, 'Maximum 8 images allowed'],
  },

  // ── Variants ─────────────────────────────────────────────
  variants: [variantSchema],
  hasVariants: { type: Boolean, default: false },

  // ── Inventory ─────────────────────────────────────────────
  stock: {
    type: Number,
    default: 0,
    min: [0, 'Stock cannot be negative'],
    index: true,
  },
  lowStockThreshold: { type: Number, default: 10 },
  isOutOfStock: { type: Boolean, default: false, index: true },
  trackInventory: { type: Boolean, default: true },

  // ── Status Flags ──────────────────────────────────────────
  isActive: { type: Boolean, default: true, index: true },
  isFeatured: { type: Boolean, default: false, index: true },
  isNewArrival: { type: Boolean, default: true },

  // ── Zone Availability ────────────────────────────────────
  availableZones: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Zone' }],
  availableHostels: [String], // Specific hostel names

  // ── Product Details ───────────────────────────────────────
  weight: String, // "250g", "1kg"
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    unit: { type: String, default: 'cm' },
  },
  expiryInfo: {
    hasExpiry: { type: Boolean, default: false },
    durationMonths: Number,
    currentBatchExpiry: Date,
  },
  nutritionInfo: mongoose.Schema.Types.Mixed,
  ingredients: String,

  // ── Ratings ───────────────────────────────────────────────
  ratings: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 },
    distribution: {
      5: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      1: { type: Number, default: 0 },
    },
  },

  // ── Analytics ─────────────────────────────────────────────
  analytics: {
    viewCount: { type: Number, default: 0 },
    cartAddCount: { type: Number, default: 0 },
    orderCount: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
  },

  // ── Created By ────────────────────────────────────────────
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ── Indexes ──────────────────────────────────────────────────
productSchema.index({ name: 'text', description: 'text', brand: 'text', tags: 'text' });
productSchema.index({ category: 1, isActive: 1, stock: 1 });
productSchema.index({ price: 1 });
productSchema.index({ 'ratings.average': -1 });
productSchema.index({ isFeatured: 1, isActive: 1 });
productSchema.index({ 'flashSale.isActive': 1, 'flashSale.endTime': 1 });
productSchema.index({ tags: 1 });
productSchema.index({ createdAt: -1 });

// ── Virtual: discountPercent ─────────────────────────────────
productSchema.virtual('discountPercent').get(function () {
  if (!this.mrp || this.mrp === this.price) return 0;
  return Math.round(((this.mrp - this.price) / this.mrp) * 100);
});

// ── Virtual: effectivePrice ───────────────────────────────────
// Returns flash sale price if active and valid
productSchema.virtual('effectivePrice').get(function () {
  const now = new Date();
  if (
    this.flashSale?.isActive &&
    this.flashSale.startTime <= now &&
    this.flashSale.endTime >= now &&
    this.flashSale.soldSlots < this.flashSale.totalSlots
  ) {
    return this.flashSale.salePrice;
  }
  if (
    this.scheduledDiscount?.isScheduled &&
    this.scheduledDiscount.startDate <= now &&
    this.scheduledDiscount.endDate >= now
  ) {
    return this.scheduledDiscount.discountPrice;
  }
  return this.price;
});

// ── Virtual: isLowStock ──────────────────────────────────────
productSchema.virtual('isLowStock').get(function () {
  return this.stock > 0 && this.stock <= this.lowStockThreshold;
});

// ── Pre-save: Generate slug ─────────────────────────────────
productSchema.pre('save', async function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = await generateUniqueSlug(this.name, this.constructor);
  }
  // Auto-update stock status
  if (this.isModified('stock')) {
    this.isOutOfStock = this.stock <= 0;
  }
  next();
});

async function generateUniqueSlug(name, Model) {
  const base = slugify(name);
  let slug = base;
  let counter = 0;
  while (await Model.findOne({ slug })) {
    counter++;
    slug = `${base}-${counter}`;
  }
  return slug;
}

module.exports = mongoose.model('Product', productSchema);

