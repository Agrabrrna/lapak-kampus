const express = require('express');
const router = express.Router();
const catalogController = require('../controllers/catalogController');
const { requireAuth, requireRole } = require('../middlewares/auth');

// Public route to catalog (for both guest and logged in users)
router.get('/products', catalogController.getCatalog);
router.get('/products/:id', catalogController.getProductDetail);

// Product Review Route
router.post('/products/:id/review', requireAuth, requireRole(['PEMBELI', 'ADMIN']), catalogController.postReview);

module.exports = router;
