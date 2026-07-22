const express = require('express');
const router = express.Router();
const catalogController = require('../controllers/catalogController');

// Public route to catalog (for both guest and logged in users)
router.get('/products', catalogController.getCatalog);

module.exports = router;
