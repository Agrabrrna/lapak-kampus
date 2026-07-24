const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { requireAuth, requireRole } = require('../middlewares/auth');

// Protected wishlist routes for PEMBELI (buyers)
router.post('/wishlist/add/:productId', requireAuth, requireRole(['PEMBELI', 'ADMIN']), wishlistController.postAddWishlist);
router.post('/wishlist/delete-by-product/:productId', requireAuth, requireRole(['PEMBELI', 'ADMIN']), wishlistController.postDeleteWishlistByProduct);
router.get('/wishlist', requireAuth, requireRole(['PEMBELI', 'ADMIN']), wishlistController.getMyWishlist);
router.post('/wishlist/delete/:id', requireAuth, requireRole(['PEMBELI', 'ADMIN']), wishlistController.postDeleteWishlist);

module.exports = router;
