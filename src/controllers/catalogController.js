const prisma = require('../services/db');

const getCatalog = async (req, res) => {
  const q = req.query.q || '';
  const categorySlug = req.query.category || '';
  const minPriceQuery = req.query.minPrice;
  const maxPriceQuery = req.query.maxPrice;
  const condition = req.query.condition || '';
  const sortBy = req.query.sortBy || 'newest';
  const page = parseInt(req.query.page) || 1;
  const limit = 6;
  const skip = (page - 1) * limit;

  try {
    // Dynamically build filters
    const where = {};

    if (q) {
      where.name = {
        contains: q,
        mode: 'insensitive'
      };
    }

    if (categorySlug) {
      where.category = {
        slug: categorySlug
      };
    }

    // Handle price filtering
    const minPrice = minPriceQuery ? parseFloat(minPriceQuery) : null;
    const maxPrice = maxPriceQuery ? parseFloat(maxPriceQuery) : null;
    if (minPrice !== null || maxPrice !== null) {
      where.price = {};
      if (minPrice !== null && !isNaN(minPrice)) where.price.gte = minPrice;
      if (maxPrice !== null && !isNaN(maxPrice)) where.price.lte = maxPrice;
    }

    // Condition filter
    if (condition && (condition === 'BARU' || condition === 'BEKAS')) {
      where.condition = condition;
    }

    // Sorting options
    let orderBy = { createdAt: 'desc' };
    if (sortBy === 'price_asc') {
      orderBy = { price: 'asc' };
    } else if (sortBy === 'price_desc') {
      orderBy = { price: 'desc' };
    }

    // Query DB for counts & paginated products
    const [totalProducts, products, categories] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: {
          category: true,
          images: true
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.category.findMany()
    ]);

    const totalPages = Math.ceil(totalProducts / limit) || 1;

    res.render('catalog/index', {
      title: 'Katalog Produk - KampusLapak',
      products,
      categories,
      totalProducts,
      totalPages,
      currentPage: page,
      filters: {
        q,
        category: categorySlug,
        minPrice: minPriceQuery || '',
        maxPrice: maxPriceQuery || '',
        condition,
        sortBy
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Terjadi kesalahan pada server saat memuat katalog.');
  }
};

module.exports = {
  getCatalog
};
