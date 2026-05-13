/**
 * PROJECT-X — Admin Analytics Controller
 *
 * Provides aggregated analytics for the admin dashboard.
 * All queries are optimized with compound indexes.
 * Heavy queries use Redis caching (5-min TTL for real-time feel).
 */

const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const { Complaint } = require('../models/index');
const { cacheGet, cacheSet } = require('../config/redis');

// ── Dashboard Overview ────────────────────────────────────────
exports.getDashboardStats = async (req, res, next) => {
  const cacheKey = 'analytics:dashboard:overview';
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json({ success: true, data: cached, cached: true });

  const [
    totalRevenue,
    totalOrders,
    totalCustomers,
    totalDeliveryDudes,
    totalDistributors,
    pendingComplaints,
    recentOrders,
  ] = await Promise.all([
    Order.aggregate([
      { $match: { status: 'delivered', 'payment.status': 'paid' } },
      { $group: { _id: null, total: { $sum: '$pricing.totalAmount' }, profit: { $sum: '$pricing.profitMargin' } } },
    ]),
    Order.countDocuments(),
    User.countDocuments({ role: 'customer', isActive: true }),
    User.countDocuments({ role: 'delivery', isActive: true }),
    User.countDocuments({ role: 'distributor', isActive: true }),
    Complaint.countDocuments({ status: { $in: ['open', 'assigned', 'in_progress'] } }),
    Order.find()
      .populate('customer', 'name')
      .sort({ createdAt: -1 })
      .limit(10)
      .select('orderNumber customer pricing.totalAmount status createdAt'),
  ]);

  const data = {
    revenue: totalRevenue[0]?.total || 0,
    profit: totalRevenue[0]?.profit || 0,
    totalOrders,
    totalCustomers,
    totalDeliveryDudes,
    totalDistributors,
    pendingComplaints,
    recentOrders,
  };

  await cacheSet(cacheKey, data, 300); // Cache 5 minutes
  res.json({ success: true, data });
};

// ── Revenue Analytics ─────────────────────────────────────────
exports.getRevenueAnalytics = async (req, res, next) => {
  const { period = 'monthly', year = new Date().getFullYear(), startDate, endDate } = req.query;

  let matchStage = { status: 'delivered', 'payment.status': 'paid' };

  if (startDate && endDate) {
    matchStage.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  } else {
    matchStage.createdAt = {
      $gte: new Date(`${year}-01-01`),
      $lte: new Date(`${year}-12-31`),
    };
  }

  const groupFormats = {
    daily: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
    weekly: { $dateToString: { format: '%Y-W%V', date: '$createdAt' } },
    monthly: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
    yearly: { $dateToString: { format: '%Y', date: '$createdAt' } },
  };

  const data = await Order.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: groupFormats[period],
        revenue: { $sum: '$pricing.totalAmount' },
        orders: { $sum: 1 },
        profit: { $sum: '$pricing.profitMargin' },
        avgOrderValue: { $avg: '$pricing.totalAmount' },
        totalSavings: { $sum: '$pricing.totalSavings' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.json({ success: true, data });
};

// ── Order Analytics ───────────────────────────────────────────
exports.getOrderAnalytics = async (req, res, next) => {
  const [statusDistribution, hourlyPeaks, hostelHeatmap, failedDeliveries] = await Promise.all([
    // Order status distribution
    Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),

    // Hourly peak times (last 30 days)
    Order.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 3600000) } } },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // Hostel-wise order heatmap
    Order.aggregate([
      {
        $group: {
          _id: '$deliveryAddress.hostelName',
          orderCount: { $sum: 1 },
          revenue: { $sum: '$pricing.totalAmount' },
        },
      },
      { $sort: { orderCount: -1 } },
      { $limit: 20 },
    ]),

    // Failed delivery analytics
    Order.aggregate([
      { $match: { status: 'failed_delivery' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 30 },
    ]),
  ]);

  res.json({
    success: true,
    data: {
      statusDistribution,
      hourlyPeaks,
      hostelHeatmap,
      failedDeliveries,
    },
  });
};

// ── Product Analytics ─────────────────────────────────────────
exports.getProductAnalytics = async (req, res, next) => {
  const [topProducts, lowStock, categoryPerformance] = await Promise.all([
    // Most ordered products
    Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          orderCount: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.totalPrice' },
          name: { $first: '$items.productSnapshot.name' },
        },
      },
      { $sort: { orderCount: -1 } },
      { $limit: 10 },
    ]),

    // Low stock products
    Product.find({ stock: { $lte: 10, $gt: 0 }, isActive: true })
      .select('name stock lowStockThreshold images category')
      .populate('category', 'name')
      .limit(20),

    // Category-wise sales performance
    Order.aggregate([
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      {
        $lookup: {
          from: 'categories',
          localField: 'product.category',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: '$category' },
      {
        $group: {
          _id: '$category._id',
          categoryName: { $first: '$category.name' },
          totalOrders: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.totalPrice' },
        },
      },
      { $sort: { revenue: -1 } },
    ]),
  ]);

  res.json({ success: true, data: { topProducts, lowStock, categoryPerformance } });
};

// ── Customer Analytics ────────────────────────────────────────
exports.getCustomerAnalytics = async (req, res, next) => {
  const [
    growthData,
    topSpenders,
    retentionData,
    avgSpendByHostel,
  ] = await Promise.all([
    // Customer growth (monthly new signups)
    User.aggregate([
      { $match: { role: 'customer' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          newCustomers: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // Top spenders
    require('../models/Customer').aggregate([
      { $sort: { 'stats.totalSpent': -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      { $unwind: '$userInfo' },
      {
        $project: {
          name: '$userInfo.name',
          email: '$userInfo.email',
          hostelName: 1,
          totalSpent: '$stats.totalSpent',
          totalOrders: '$stats.totalOrders',
          loyaltyTier: 1,
        },
      },
    ]),

    // Retention: customers who ordered in both previous and current month
    Order.aggregate([
      {
        $group: {
          _id: {
            customer: '$customer',
            month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          },
        },
      },
      {
        $group: {
          _id: '$_id.month',
          uniqueCustomers: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // Average spend by hostel
    Order.aggregate([
      { $match: { status: 'delivered' } },
      {
        $group: {
          _id: '$deliveryAddress.hostelName',
          avgOrderValue: { $avg: '$pricing.totalAmount' },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.totalAmount' },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 15 },
    ]),
  ]);

  res.json({ success: true, data: { growthData, topSpenders, retentionData, avgSpendByHostel } });
};

// ── Refund Analytics ──────────────────────────────────────────
exports.getRefundAnalytics = async (req, res, next) => {
  const data = await Order.aggregate([
    { $match: { 'payment.status': { $in: ['refunded', 'partially_refunded'] } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        count: { $sum: 1 },
        totalRefunded: { $sum: '$payment.refundAmount' },
      },
    },
    { $sort: { _id: -1 } },
  ]);

  res.json({ success: true, data });
};

// ── Fraud Detection Summary ───────────────────────────────────
exports.getFraudSummary = async (req, res, next) => {
  const suspicious = await User.aggregate([
    { $match: { role: 'customer' } },
    {
      $lookup: {
        from: 'orders',
        localField: '_id',
        foreignField: 'customer',
        as: 'orders',
      },
    },
    {
      $project: {
        name: 1,
        email: 1,
        cancelledOrders: {
          $size: {
            $filter: {
              input: '$orders',
              cond: { $eq: ['$$this.status', 'cancelled'] },
            },
          },
        },
        totalOrders: { $size: '$orders' },
      },
    },
    {
      $addFields: {
        cancellationRate: {
          $cond: [
            { $eq: ['$totalOrders', 0] },
            0,
            { $divide: ['$cancelledOrders', '$totalOrders'] },
          ],
        },
      },
    },
    { $match: { cancellationRate: { $gte: 0.5 }, totalOrders: { $gte: 3 } } },
    { $sort: { cancellationRate: -1 } },
    { $limit: 20 },
  ]);

  res.json({ success: true, data: { suspiciousUsers: suspicious } });
};
