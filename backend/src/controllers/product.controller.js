/**
 * CARTEX — Product Controller
 *
 * Full product management: CRUD, bulk upload, flash sales, recommendations.
 * Admin-only mutations; public read with caching.
 */

const Product = require('../models/Product');
const { Category, AuditLog } = require('../models/index');
const { cacheGet, cacheSet, cacheDelPattern } = require('../config/redis');
const AppError = require('../utils/AppError');
const { cloudinary } = require('../config/cloudinary');

// ── Get All Products (Public) ─────────────────────────────────
exports.getProducts = async (req, res, next) => {
  const {
    page = 1, limit = 20, category, search, minPrice, maxPrice,
    sort = '-createdAt', featured, flashSale, hostel, zone, inStock,
  } = req.query;

  const filter = { isActive: true };

  if (category) filter.category = category;
  if (featured === 'true') filter.isFeatured = true;
  if (inStock === 'true') filter.isOutOfStock = false;

  // Flash sale active filter
  if (flashSale === 'true') {
    const now = new Date();
    filter['flashSale.isActive'] = true;
    filter['flashSale.startTime'] = { $lte: now };
    filter['flashSale.endTime'] = { $gte: now };
  }

  // Price range
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = parseFloat(minPrice);
    if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
  }

  // Full-text search
  if (search) {
    filter.$text = { $search: search };
  }

  // Zone/hostel availability
  if (zone) filter.availableZones = zone;
  if (hostel) filter.availableHostels = hostel;

  const sortOptions = {};
  if (search) {
    sortOptions.score = { $meta: 'textScore' };
  }
  sort.split(',').forEach((field) => {
    const dir = field.startsWith('-') ? -1 : 1;
    sortOptions[field.replace('-', '')] = dir;
  });

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name slug icon')
      .select('-costPrice -__v')
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean({ virtuals: true }),
    Product.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      products,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit),
        hasMore: page * limit < total,
      },
    },
  });
};

// ── Get Single Product ────────────────────────────────────────
exports.getProductBySlug = async (req, res, next) => {
  const { slug } = req.params;

  const cacheKey = `product:slug:${slug}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json({ success: true, data: { product: cached } });

  const product = await Product.findOne({ slug, isActive: true })
    .populate('category', 'name slug')
    .lean({ virtuals: true });

  if (!product) throw new AppError('Product not found.', 404);

  // Track view
  await Product.findByIdAndUpdate(product._id, { $inc: { 'analytics.viewCount': 1 } });

  // Get related products
  const related = await Product.find({
    category: product.category._id,
    _id: { $ne: product._id },
    isActive: true,
    isOutOfStock: false,
  })
    .select('name images price mrp slug ratings')
    .limit(8)
    .lean({ virtuals: true });

  await cacheSet(cacheKey, { ...product, related }, 600); // Cache 10 min

  res.json({ success: true, data: { product: { ...product, related } } });
};

// ── Create Product (Admin) ────────────────────────────────────
exports.createProduct = async (req, res, next) => {
  const productData = { ...req.body, createdBy: req.user._id };

  // Handle uploaded images from multer/cloudinary
  if (req.files?.length) {
    productData.images = req.files.map((file, idx) => ({
      url: file.path,
      publicId: file.filename,
      alt: req.body.name,
      isPrimary: idx === 0,
    }));
  }

  const product = await Product.create(productData);
  await cacheDelPattern('products:*');

  // Update category product count
  await Category.findByIdAndUpdate(product.category, { $inc: { productCount: 1 } });

  await AuditLog.create({
    action: 'product.created',
    resource: 'Product',
    resourceId: product._id,
    performedBy: req.user._id,
    performedByRole: req.user.role,
    ipAddress: req.ip,
    changes: { after: { name: product.name, price: product.price, mrp: product.mrp } },
  });

  res.status(201).json({
    success: true,
    message: 'Product created successfully.',
    data: { product },
  });
};

// ── Update Product (Admin) ────────────────────────────────────
exports.updateProduct = async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError('Product not found.', 404);

  const before = { name: product.name, price: product.price, mrp: product.mrp, stock: product.stock };

  // Handle new images
  if (req.files?.length) {
    const newImages = req.files.map((file, idx) => ({
      url: file.path,
      publicId: file.filename,
      alt: req.body.name || product.name,
      isPrimary: idx === 0 && !product.images.some(img => img.isPrimary),
    }));
    req.body.images = [...(product.images || []), ...newImages];
  }

  Object.assign(product, req.body);
  product.updatedBy = req.user._id;
  await product.save();

  // Invalidate cache
  await cacheDelPattern(`product:*`);

  await AuditLog.create({
    action: 'product.updated',
    resource: 'Product',
    resourceId: product._id,
    performedBy: req.user._id,
    performedByRole: req.user.role,
    ipAddress: req.ip,
    changes: { before, after: { name: product.name, price: product.price, mrp: product.mrp, stock: product.stock } },
  });

  res.json({ success: true, message: 'Product updated.', data: { product } });
};

// ── Delete Product (Admin) ────────────────────────────────────
exports.deleteProduct = async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError('Product not found.', 404);

  // Soft delete — just mark inactive
  product.isActive = false;
  product.updatedBy = req.user._id;
  await product.save();

  // Delete images from Cloudinary
  for (const img of product.images) {
    if (img.publicId) {
      await cloudinary.uploader.destroy(img.publicId).catch(() => {});
    }
  }

  await Category.findByIdAndUpdate(product.category, { $inc: { productCount: -1 } });
  await cacheDelPattern('product:*');

  res.json({ success: true, message: 'Product deleted (soft).' });
};

// ── Delete Product Image ──────────────────────────────────────
exports.deleteProductImage = async (req, res, next) => {
  const { id, imageId } = req.params;
  const product = await Product.findById(id);
  if (!product) throw new AppError('Product not found.', 404);

  const image = product.images.id(imageId);
  if (!image) throw new AppError('Image not found.', 404);

  if (image.publicId) {
    await cloudinary.uploader.destroy(image.publicId);
  }
  product.images.pull(imageId);
  await product.save();

  res.json({ success: true, message: 'Image deleted.' });
};

// ── Bulk Upload Products ──────────────────────────────────────
exports.bulkUploadProducts = async (req, res, next) => {
  const { products } = req.body;

  if (!Array.isArray(products) || products.length === 0) {
    throw new AppError('No products provided for bulk upload.', 400);
  }

  if (products.length > 500) {
    throw new AppError('Bulk upload limit is 500 products per request.', 400);
  }

  const results = { created: 0, failed: [], errors: [] };

  for (const productData of products) {
    try {
      await Product.create({ ...productData, createdBy: req.user._id });
      results.created++;
    } catch (err) {
      results.failed.push(productData.name || 'Unknown');
      results.errors.push(err.message);
    }
  }

  await cacheDelPattern('product:*');

  res.json({
    success: true,
    message: `Bulk upload complete. Created: ${results.created}, Failed: ${results.failed.length}`,
    data: results,
  });
};

// ── Toggle Flash Sale ─────────────────────────────────────────
exports.toggleFlashSale = async (req, res, next) => {
  const { salePrice, discountPercent, startTime, endTime, totalSlots } = req.body;
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError('Product not found.', 404);

  const isActivating = !product.flashSale?.isActive;

  if (isActivating) {
    if (!salePrice || !startTime || !endTime || !totalSlots) {
      throw new AppError('Flash sale requires: salePrice, startTime, endTime, totalSlots.', 400);
    }
    if (salePrice >= product.price) {
      throw new AppError('Flash sale price must be less than regular price.', 400);
    }
    product.flashSale = {
      isActive: true,
      salePrice,
      discountPercent: discountPercent || Math.round(((product.price - salePrice) / product.price) * 100),
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      totalSlots,
      soldSlots: 0,
    };
  } else {
    product.flashSale.isActive = false;
  }

  await product.save();
  await cacheDelPattern('product:*');

  res.json({
    success: true,
    message: `Flash sale ${isActivating ? 'activated' : 'deactivated'}.`,
    data: { product },
  });
};

// ── Mark Out of Stock (One-Click) ─────────────────────────────
exports.toggleOutOfStock = async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError('Product not found.', 404);

  product.isOutOfStock = !product.isOutOfStock;
  if (product.isOutOfStock) product.stock = 0;
  await product.save();
  await cacheDelPattern('product:*');

  res.json({
    success: true,
    message: `Product marked as ${product.isOutOfStock ? 'out of stock' : 'in stock'}.`,
  });
};

// ── Get Trending Products ─────────────────────────────────────
exports.getTrending = async (req, res, next) => {
  const cacheKey = 'products:trending';
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json({ success: true, data: { products: cached } });

  const products = await Product.find({ isActive: true, isOutOfStock: false })
    .sort({ 'analytics.orderCount': -1, 'ratings.average': -1 })
    .limit(12)
    .select('name images price mrp slug ratings analytics category')
    .populate('category', 'name')
    .lean({ virtuals: true });

  await cacheSet(cacheKey, products, 1800); // 30 min cache
  res.json({ success: true, data: { products } });
};

// ── Personalized Recommendations ─────────────────────────────
exports.getRecommendations = async (req, res, next) => {
  const Customer = require('../models/Customer');
  const customer = await Customer.findOne({ user: req.user._id });

  let products;

  if (customer?.purchaseHistory?.length) {
    // Get categories from purchase history
    const purchasedProductIds = customer.purchaseHistory.map((p) => p.product);
    const purchasedProducts = await Product.find({ _id: { $in: purchasedProductIds } }).select('category');
    const categoryIds = [...new Set(purchasedProducts.map((p) => p.category.toString()))];

    products = await Product.find({
      category: { $in: categoryIds },
      _id: { $nin: purchasedProductIds },
      isActive: true,
      isOutOfStock: false,
    })
      .sort({ 'ratings.average': -1, 'analytics.orderCount': -1 })
      .limit(12)
      .select('name images price mrp slug ratings category')
      .lean({ virtuals: true });
  }

  // Fallback to trending if no purchase history
  if (!products?.length) {
    products = await Product.find({ isActive: true, isOutOfStock: false })
      .sort({ 'analytics.orderCount': -1 })
      .limit(12)
      .select('name images price mrp slug ratings category')
      .lean({ virtuals: true });
  }

  res.json({ success: true, data: { products } });
};

// ── Submit Review ─────────────────────────────────────────────
exports.submitReview = async (req, res, next) => {
  const { orderId, rating, title, body } = req.body;
  const { Review } = require('../models/index');
  const Order = require('../models/Order');

  const order = await Order.findOne({
    _id: orderId,
    customer: req.user._id,
    status: 'delivered',
  });
  if (!order) throw new AppError('Order not found or not delivered yet.', 404);

  // Check if product was in order
  const orderItem = order.items.find((i) => i.product.toString() === req.params.id);
  if (!orderItem) throw new AppError('Product not found in this order.', 400);

  const review = await Review.create({
    product: req.params.id,
    order: orderId,
    customer: req.user._id,
    rating,
    title,
    body,
    isVerifiedPurchase: true,
    isApproved: true,
  });

  // Update product rating aggregation
  const allReviews = await Review.find({ product: req.params.id, isApproved: true });
  const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  allReviews.forEach((r) => dist[r.rating]++);

  await Product.findByIdAndUpdate(req.params.id, {
    'ratings.average': Math.round(avgRating * 10) / 10,
    'ratings.count': allReviews.length,
    'ratings.distribution': dist,
  });

  res.status(201).json({ success: true, message: 'Review submitted!', data: { review } });
};

// ── Get Product Reviews ───────────────────────────────────────
exports.getReviews = async (req, res, next) => {
  const { Review } = require('../models/index');
  const { page = 1, limit = 10, sort = '-createdAt' } = req.query;

  const reviews = await Review.find({ product: req.params.id, isApproved: true })
    .populate('customer', 'name avatar')
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(parseInt(limit));

  const total = await Review.countDocuments({ product: req.params.id, isApproved: true });

  res.json({
    success: true,
    data: {
      reviews,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    },
  });
};

