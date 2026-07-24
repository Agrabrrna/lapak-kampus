const prisma = require('../services/db');

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.session.userId },
      orderBy: { createdAt: 'desc' }
    });

    res.render('user/notifications', {
      title: 'Notifikasi - KampusLapak',
      notifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    req.flash('error_msg', 'Gagal memuat notifikasi.');
    res.redirect('back');
  }
};

exports.postMarkAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Ensure notification belongs to user
    const notification = await prisma.notification.findUnique({
      where: { id }
    });

    if (notification && notification.userId === req.session.userId) {
      await prisma.notification.update({
        where: { id },
        data: { isRead: true }
      });
    }

    res.redirect('back');
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.redirect('back');
  }
};

exports.postMarkAllAsRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { 
        userId: req.session.userId,
        isRead: false
      },
      data: { isRead: true }
    });

    req.flash('success_msg', 'Semua notifikasi telah ditandai dibaca.');
    res.redirect('/notifications');
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.redirect('back');
  }
};

exports.getNotificationClick = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await prisma.notification.findUnique({
      where: { id }
    });

    if (notification && notification.userId === req.session.userId) {
      if (!notification.isRead) {
        await prisma.notification.update({
          where: { id },
          data: { isRead: true }
        });
      }
      
      let targetUrl = '/';
      if (notification.title === 'Pesan Baru') {
          targetUrl = '/chat/inbox';
      } else if (notification.title === 'Pesanan Baru Masuk') {
          targetUrl = '/orders/incoming-orders';
      } else if (notification.title === 'Pembaruan Status Pesanan') {
          targetUrl = '/orders/my-orders';
      }
      return res.redirect(targetUrl);
    }
    res.redirect('/');
  } catch (error) {
    console.error('Error clicking notification:', error);
    res.redirect('/');
  }
};
