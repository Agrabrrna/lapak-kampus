const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { requireAuth } = require('../middlewares/auth');

// Webhook for Midtrans (No CSRF)
router.post('/payment/notification', paymentController.handleNotification);

// Manual check status for users
router.post('/payment/check-status/:orderId', requireAuth, paymentController.checkStatus);

module.exports = router;
