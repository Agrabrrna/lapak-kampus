const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { requireAuth } = require('../middlewares/auth');

router.use(requireAuth);

router.get('/notifications', notificationController.getNotifications);
router.post('/notifications/:id/read', notificationController.postMarkAsRead);
router.post('/notifications/read-all', notificationController.postMarkAllAsRead);

module.exports = router;
