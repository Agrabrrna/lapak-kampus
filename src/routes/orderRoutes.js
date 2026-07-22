const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { requireAuth, requireRole } = require('../middlewares/auth');

// Cart Routes (Buyer Only)
router.post('/cart/add/:productId', requireAuth, requireRole(['PEMBELI']), orderController.addToCart);
router.get('/cart', requireAuth, requireRole(['PEMBELI']), orderController.viewCart);
router.post('/cart/remove/:sellerId/:productId', requireAuth, requireRole(['PEMBELI']), orderController.removeFromCart);

// Checkout Routes
router.get('/checkout/:sellerId', requireAuth, requireRole(['PEMBELI']), orderController.checkoutForm);
router.post('/checkout/:sellerId', requireAuth, requireRole(['PEMBELI']), orderController.processCheckout);

// Order Management Routes
router.get('/orders/my-orders', requireAuth, requireRole(['PEMBELI']), orderController.buyerOrders);
router.get('/orders/incoming', requireAuth, requireRole(['PENJUAL']), orderController.sellerOrders);

// Order Status Update (Shared)
router.post('/orders/:orderId/status', requireAuth, orderController.updateOrderStatus);

module.exports = router;
