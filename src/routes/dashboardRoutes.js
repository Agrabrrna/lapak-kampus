const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { requireAuth, requireRole } = require('../middlewares/auth');

router.get('/admin/dashboard', requireAuth, requireRole(['ADMIN']), dashboardController.getAdminDashboard);
router.get('/user/dashboard', requireAuth, requireRole(['PENJUAL', 'PEMBELI']), dashboardController.getUserDashboard);

module.exports = router;
