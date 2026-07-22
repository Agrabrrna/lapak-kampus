const prisma = require('../services/db');

const getAdminDashboard = (req, res) => {
  res.render('admin/dashboard', {
    title: 'Dashboard Admin - KampusLapak',
    user: req.session.user
  });
};

const getUserDashboard = async (req, res) => {
  try {
    const q = req.query.q || '';
    const categoryFilter = req.query.category || '';
    
    const where = {};
    if (q) where.name = { contains: q };
    if (categoryFilter) where.category = { slug: categoryFilter };

    const categories = await prisma.category.findMany();
    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        images: {
          where: { isPrimary: true },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 16
    });

    res.render('user/dashboard', {
      title: 'Dashboard - KampusLapak',
      user: req.session.user,
      products,
      categories,
      filters: { q, category: categoryFilter }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Terjadi kesalahan saat memuat dashboard.');
  }
};

module.exports = {
  getAdminDashboard,
  getUserDashboard
};
