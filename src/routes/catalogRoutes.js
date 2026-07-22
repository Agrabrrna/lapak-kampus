const express = require('express');
const router = express.Router();
const catalogController = require('../controllers/catalogController');

// Public route to catalog (for both guest and logged in users)
router.get('/products', catalogController.getCatalog);
router.get('/products/:id', catalogController.getProductDetail);

module.exports = router;
