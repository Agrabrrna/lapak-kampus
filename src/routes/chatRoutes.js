const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { requireAuth } = require('../middlewares/auth');

// Protected chat routes (require login)
router.get('/chat/inbox', requireAuth, chatController.getInbox);
router.get('/chat/initiate/:productId', requireAuth, chatController.initiateChat);
router.get('/chat/room/:otherUserId/:productId', requireAuth, chatController.getChatRoom);
router.post('/chat/send/:receiverId/:productId', requireAuth, chatController.postSendMessage);

// API route for frontend polling
router.get('/api/chat/messages/:otherUserId/:productId', requireAuth, chatController.getChatMessagesApi);

module.exports = router;
