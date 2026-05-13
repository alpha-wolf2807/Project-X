/**
 * PROJECT-X — Product Routes
 */
const express = require('express');
const router = express.Router();
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { uploadProduct } = require('../config/cloudinary');
const ctrl = require('../controllers/product.controller');

// Public routes
router.get('/', ctrl.getProducts);
router.get('/trending', ctrl.getTrending);
router.get('/:slug', optionalAuth, ctrl.getProductBySlug);
router.get('/:id/reviews', ctrl.getReviews);

// Auth required
router.get('/recommendations/me', protect, authorize('customer'), ctrl.getRecommendations);
router.post('/:id/reviews', protect, authorize('customer'), ctrl.submitReview);

// Admin only
router.post('/', protect, authorize('admin'), uploadProduct.array('images', 8), ctrl.createProduct);
router.put('/:id', protect, authorize('admin'), uploadProduct.array('images', 8), ctrl.updateProduct);
router.delete('/:id', protect, authorize('admin'), ctrl.deleteProduct);
router.delete('/:id/images/:imageId', protect, authorize('admin'), ctrl.deleteProductImage);
router.post('/bulk-upload', protect, authorize('admin'), ctrl.bulkUploadProducts);
router.patch('/:id/flash-sale', protect, authorize('admin'), ctrl.toggleFlashSale);
router.patch('/:id/out-of-stock', protect, authorize('admin'), ctrl.toggleOutOfStock);

module.exports = router;
