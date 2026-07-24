const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { requireAuth, requireRole } = require('../middlewares/auth');

// Cart Routes (Buyer Only)
router.post('/cart/add/:productId', requireAuth, requireRole(['PEMBELI', 'ADMIN']), orderController.addToCart);
router.get('/cart', requireAuth, requireRole(['PEMBELI', 'ADMIN']), orderController.viewCart);
router.post('/cart/remove/:sellerId/:productId', requireAuth, requireRole(['PEMBELI', 'ADMIN']), orderController.removeFromCart);

// Checkout Routes
router.get('/checkout/:sellerId', requireAuth, requireRole(['PEMBELI', 'ADMIN']), orderController.checkoutForm);
router.post('/checkout/:sellerId', requireAuth, requireRole(['PEMBELI', 'ADMIN']), orderController.processCheckout);

// Order Management Routes
router.get('/orders/my-orders', requireAuth, requireRole(['PEMBELI', 'ADMIN']), orderController.buyerOrders);
router.get('/orders/incoming', requireAuth, requireRole(['PENJUAL', 'ADMIN']), orderController.sellerOrders);

// Order Status Update (Shared)
router.post('/orders/:orderId/status', requireAuth, orderController.updateOrderStatus);

module.exports = router;
