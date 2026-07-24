const prisma = require('../services/db');

// 2. Daftar percakapan pengguna (kotak masuk chat)
const getInbox = async (req, res) => {
  const userId = req.session.userId;

  try {
    const chats = await prisma.chat.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true }
        },
        receiver: {
          select: { id: true, name: true, email: true }
        },
        product: {
          select: { id: true, name: true, price: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Group chats into threads in-memory
    const threadsMap = {};
    chats.forEach(chat => {
      const otherUser = chat.senderId === userId ? chat.receiver : chat.sender;
      const productId = chat.productId || 'no-product';
      const threadKey = `${otherUser.id}-${productId}`;

      if (!threadsMap[threadKey]) {
        threadsMap[threadKey] = {
          otherUser,
          product: chat.productId ? chat.product : null,
          lastMessage: chat.message,
          lastMessageTime: chat.createdAt,
          unreadCount: 0
        };
      }
      // Count unread messages sent TO current user
      if (chat.receiverId === userId && !chat.isRead) {
        threadsMap[threadKey].unreadCount++;
      }
    });

    const threads = Object.values(threadsMap);

    res.render('user/chat-inbox', {
      title: 'Kotak Masuk Chat - KampusLapak',
      threads
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Terjadi kesalahan saat memuat kotak masuk.');
  }
};

// 1. Tombol "Hubungi Penjual" di halaman detail produk (Initiate thread)
const initiateChat = async (req, res) => {
  const { productId } = req.params;
  const buyerId = req.session.userId;

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).send('Produk tidak ditemukan.');
    }

    if (product.userId === buyerId) {
      return res.status(400).send('Anda tidak bisa memulai chat dengan diri sendiri untuk produk Anda sendiri.');
    }

    // Redirect to chat room
    res.redirect(`/chat/room/${product.userId}/${product.id}`);

  } catch (err) {
    console.error(err);
    res.status(500).send('Terjadi kesalahan saat memulai chat.');
  }
};

// 3. Halaman room chat
const getChatRoom = async (req, res) => {
  const { otherUserId, productId } = req.params;
  const userId = req.session.userId;

  try {
    const otherUser = await prisma.user.findUnique({
      where: { id: otherUserId },
      select: { id: true, name: true, role: true }
    });

    if (!otherUser) {
      return res.status(404).send('User lawan bicara tidak ditemukan.');
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, price: true }
    });

    const messages = await prisma.chat.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId, productId },
          { senderId: otherUserId, receiverId: userId, productId }
        ]
      },
      include: {
        sender: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Mark all unread messages from other user as read
    await prisma.chat.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: userId,
        productId,
        isRead: false
      },
      data: { isRead: true }
    });

    res.render('user/chat-room', {
      title: `Chat dengan ${otherUser.name} - KampusLapak`,
      otherUser,
      product,
      messages
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Terjadi kesalahan saat memuat room chat.');
  }
};

// 3. POST Kirim pesan (Traditional / AJAX fallback)
const postSendMessage = async (req, res) => {
  const { receiverId, productId } = req.params;
  const { message } = req.body;
  const senderId = req.session.userId;

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
  }

  try {
    const chat = await prisma.chat.create({
      data: {
        senderId,
        receiverId,
        productId,
        message
      },
      include: {
        sender: { select: { id: true, name: true } }
      }
    });

    // Create Notification
    await prisma.notification.create({
      data: {
        userId: receiverId,
        title: 'Pesan Baru',
        message: `Anda mendapat pesan baru dari ${chat.sender.name}.`
      }
    });

    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      // Return JSON if AJAX
      return res.json({ success: true, chat });
    }

    res.redirect(`/chat/room/${receiverId}/${productId}`);

  } catch (err) {
    console.error(err);
    res.status(500).send('Gagal mengirim pesan.');
  }
};

// 3. API Polling messages
const getChatMessagesApi = async (req, res) => {
  const { otherUserId, productId } = req.params;
  const userId = req.session.userId;

  try {
    const messages = await prisma.chat.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: otherUserId, productId },
          { senderId: otherUserId, receiverId: userId, productId }
        ]
      },
      include: {
        sender: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ messages });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal memuat pesan terbaru.' });
  }
};

module.exports = {
  getInbox,
  initiateChat,
  getChatRoom,
  postSendMessage,
  getChatMessagesApi
};
