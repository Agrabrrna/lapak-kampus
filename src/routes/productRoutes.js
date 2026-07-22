const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { requireAuth, requireRole } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const { body } = require('express-validator');

// Validation rules
const productValidationRules = [
  body('name').trim().notEmpty().withMessage('Nama produk wajib diisi.'),
  body('description').trim().notEmpty().withMessage('Deskripsi produk wajib diisi.'),
  body('price').isFloat({ min: 0 }).withMessage('Harga produk harus berupa angka positif.'),
  body('stock').isInt({ min: 0 }).withMessage('Stok produk harus berupa angka bulat positif.'),
  body('condition').isIn(['BARU', 'BEKAS']).withMessage('Kondisi produk harus BARU atau BEKAS.'),
  body('categoryId').notEmpty().withMessage('Kategori produk wajib dipilih.')
];

// Product CRUD routes for PENJUAL
router.get('/seller/products', requireAuth, requireRole(['PENJUAL']), productController.getMyProducts);

router.get('/seller/products/add', requireAuth, requireRole(['PENJUAL']), productController.getAddProduct);
router.post(
  '/seller/products/add',
  requireAuth,
  requireRole(['PENJUAL']),
  upload.array('images', 5), // allow up to 5 images
  productValidationRules,
  productController.postAddProduct
);

router.get('/seller/products/edit/:id', requireAuth, requireRole(['PENJUAL']), productController.getEditProduct);
router.post(
  '/seller/products/edit/:id',
  requireAuth,
  requireRole(['PENJUAL']),
  upload.array('images', 5),
  productValidationRules,
  productController.postEditProduct
);

router.post('/seller/products/delete/:id', requireAuth, requireRole(['PENJUAL']), productController.postDeleteProduct);

module.exports = router;
