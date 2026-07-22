const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAuth, requireRole } = require('../middlewares/auth');

// Protect all admin routes
router.use(requireAuth, requireRole(['ADMIN']));

// Dashboard
router.get('/dashboard', adminController.getDashboard);

// User Management
router.get('/users', adminController.getUsers);
router.post('/users/:id/toggle-active', adminController.postToggleUserActive);
router.post('/users/:id/role', adminController.postUpdateUserRole);

// Category Management
router.get('/categories', adminController.getCategories);
router.post('/categories/add', adminController.postAddCategory);
router.post('/categories/edit/:id', adminController.postEditCategory);
router.post('/categories/delete/:id', adminController.postDeleteCategory);

// Orders Monitoring
router.get('/orders', adminController.getOrders);

module.exports = router;
