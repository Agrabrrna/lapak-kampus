const express = require('express');
const router = express.Router();
const catalogController = require('../controllers/catalogController');
const { requireAuth, requireRole } = require('../middlewares/auth');

const uploadReviewMedia = require('../middlewares/uploadReviewMedia');

// Public route to catalog (for both guest and logged in users)
router.get('/products', catalogController.getCatalog);
router.get('/products/:id', catalogController.getProductDetail);

// Product Review Route
router.post('/products/:id/review', requireAuth, requireRole(['PEMBELI', 'ADMIN']), uploadReviewMedia.array('media', 3), catalogController.postReview);

// Seller Reply Route
router.post('/products/:id/review/:reviewId/reply', requireAuth, requireRole(['PENJUAL', 'ADMIN']), uploadReviewMedia.array('media', 3), catalogController.postReviewReply);

module.exports = router;
