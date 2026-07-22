const prisma = require('../services/db');

exports.getDashboard = async (req, res) => {
  try {
    const [totalUsers, totalOrders, totalCategories] = await Promise.all([
      prisma.user.count(),
      prisma.order.count(),
      prisma.category.count()
    ]);

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      user: req.session.user,
      totalUsers,
      totalOrders,
      totalCategories
    });
  } catch (error) {
    console.error('Error fetching admin dashboard:', error);
    res.status(500).send('Terjadi kesalahan sistem.');
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.render('admin/users', {
      title: 'Kelola Pengguna',
      user: req.session.user,
      users,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    req.flash('error_msg', 'Gagal memuat pengguna.');
    res.redirect('/admin/dashboard');
  }
};

exports.postToggleUserActive = async (req, res) => {
  try {
    const { id } = req.params;
    const targetUser = await prisma.user.findUnique({ where: { id } });
    
    if (!targetUser) {
      req.flash('error_msg', 'Pengguna tidak ditemukan.');
      return res.redirect('/admin/users');
    }

    if (targetUser.id === req.session.userId) {
      req.flash('error_msg', 'Anda tidak bisa menonaktifkan akun sendiri.');
      return res.redirect('/admin/users');
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: !targetUser.isActive }
    });

    req.flash('success_msg', `Akun ${targetUser.name} berhasil di${targetUser.isActive ? 'nonaktifkan' : 'aktifkan'}.`);
    res.redirect('/admin/users');
  } catch (error) {
    console.error('Error toggling user active:', error);
    req.flash('error_msg', 'Terjadi kesalahan sistem.');
    res.redirect('/admin/users');
  }
};

exports.postUpdateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    
    if (id === req.session.userId) {
      req.flash('error_msg', 'Anda tidak bisa mengubah role Anda sendiri.');
      return res.redirect('/admin/users');
    }

    if (!['ADMIN', 'PENJUAL', 'PEMBELI'].includes(role)) {
      req.flash('error_msg', 'Role tidak valid.');
      return res.redirect('/admin/users');
    }

    await prisma.user.update({
      where: { id },
      data: { role }
    });

    req.flash('success_msg', 'Role berhasil diperbarui.');
    res.redirect('/admin/users');
  } catch (error) {
    console.error('Error updating user role:', error);
    req.flash('error_msg', 'Terjadi kesalahan sistem.');
    res.redirect('/admin/users');
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    res.render('admin/categories', {
      title: 'Kelola Kategori',
      user: req.session.user,
      categories,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    req.flash('error_msg', 'Gagal memuat kategori.');
    res.redirect('/admin/dashboard');
  }
};

exports.postAddCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      req.flash('error_msg', 'Nama kategori harus diisi.');
      return res.redirect('/admin/categories');
    }
    
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    await prisma.category.create({
      data: { name, slug }
    });

    req.flash('success_msg', 'Kategori berhasil ditambahkan.');
    res.redirect('/admin/categories');
  } catch (error) {
    if (error.code === 'P2002') {
      req.flash('error_msg', 'Kategori dengan nama/slug ini sudah ada.');
    } else {
      req.flash('error_msg', 'Terjadi kesalahan sistem.');
    }
    res.redirect('/admin/categories');
  }
};

exports.postEditCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) {
      req.flash('error_msg', 'Nama kategori harus diisi.');
      return res.redirect('/admin/categories');
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    await prisma.category.update({
      where: { id },
      data: { name, slug }
    });

    req.flash('success_msg', 'Kategori berhasil diubah.');
    res.redirect('/admin/categories');
  } catch (error) {
    req.flash('error_msg', 'Terjadi kesalahan sistem.');
    res.redirect('/admin/categories');
  }
};

exports.postDeleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if category has products
    const productCount = await prisma.product.count({
      where: { categoryId: id }
    });

    if (productCount > 0) {
      req.flash('error_msg', 'Kategori tidak dapat dihapus karena masih berisi produk.');
      return res.redirect('/admin/categories');
    }

    await prisma.category.delete({
      where: { id }
    });

    req.flash('success_msg', 'Kategori berhasil dihapus.');
    res.redirect('/admin/categories');
  } catch (error) {
    req.flash('error_msg', 'Terjadi kesalahan saat menghapus kategori.');
    res.redirect('/admin/categories');
  }
};

exports.getOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        buyer: { select: { name: true, email: true } },
        seller: { select: { name: true } },
        orderDetails: {
          include: { product: { select: { name: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.render('admin/orders', {
      title: 'Pantau Transaksi',
      user: req.session.user,
      orders
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    req.flash('error_msg', 'Gagal memuat transaksi.');
    res.redirect('/admin/dashboard');
  }
};
