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
