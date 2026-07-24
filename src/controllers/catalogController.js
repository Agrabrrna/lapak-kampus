const prisma = require('../services/db');
const { uploadStream } = require('../services/cloudinary');

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

const getProductDetail = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        images: true,
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            address: true
          }
        },
        reviews: {
          include: {
            user: {
              select: { name: true }
            },
            media: true,
            reply: {
              include: {
                user: { select: { name: true } },
                media: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!product) {
      return res.status(404).send('Produk tidak ditemukan.');
    }

    // Check if product is in logged-in user's wishlist
    let inWishlist = false;
    let hasCompletedOrder = false;
    let hasReviewed = false;

    if (req.session.userId) {
      const wishlistEntry = await prisma.wishlist.findFirst({
        where: {
          userId: req.session.userId,
          productId: id
        }
      });
      if (wishlistEntry) {
        inWishlist = true;
      }

      // Check if user has already reviewed
      if (req.session.user.role === 'PEMBELI' || req.session.user.role === 'ADMIN') {
        const existingReview = await prisma.review.findFirst({
          where: {
            productId: id,
            userId: req.session.userId
          }
        });
        if (existingReview) {
          hasReviewed = true;
        }
      }
    }

    // Calculate average rating
    let averageRating = 0;
    if (product.reviews.length > 0) {
      const sum = product.reviews.reduce((acc, curr) => acc + curr.rating, 0);
      averageRating = (sum / product.reviews.length).toFixed(1);
    }

    res.render('catalog/detail', {
      title: product.name + ' - KampusLapak',
      product,
      inWishlist,
      averageRating,
      hasReviewed
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Terjadi kesalahan pada server saat memuat detail produk.');
  }
};

const postReview = async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  try {
    const ratingInt = parseInt(rating);
    if (isNaN(ratingInt) || ratingInt < 1 || ratingInt > 5) {
      req.flash('error_msg', 'Rating harus antara 1 sampai 5.');
      return res.redirect(req.get('Referrer') || '/');
    }

    // Check if already reviewed
    const existingReview = await prisma.review.findFirst({
      where: {
        productId: id,
        userId: req.session.userId
      }
    });

    if (existingReview) {
      req.flash('error_msg', 'Anda sudah mereview produk ini.');
      return res.redirect(req.get('Referrer') || '/');
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        productId: id,
        userId: req.session.userId,
        rating: ratingInt,
        comment: comment || null
      }
    });

    if (req.files && req.files.length > 0) {
      const mediaPromises = req.files.map(async (file) => {
        const uploadResult = await uploadStream(file.buffer, 'kampuslapak/reviews', 'auto');
        const mediaType = file.mimetype.startsWith('video') ? 'video' : 'image';
        return prisma.reviewMedia.create({
          data: {
            reviewId: review.id,
            mediaPath: uploadResult.secure_url,
            mediaType: mediaType
          }
        });
      });
      await Promise.all(mediaPromises);
    }

    req.flash('success_msg', 'Terima kasih atas ulasan Anda!');
    res.redirect(req.get('Referrer') || '/');

  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Terjadi kesalahan saat mengirim ulasan.');
    res.redirect(req.get('Referrer') || '/');
  }
};

const postReviewReply = async (req, res) => {
  const { id, reviewId } = req.params;
  const { comment } = req.body;

  try {
    // Ensure the user is the seller of the product
    const product = await prisma.product.findUnique({ where: { id: id } });
    if (!product || product.userId !== req.session.userId) {
      req.flash('error_msg', 'Anda tidak berhak membalas ulasan ini.');
      return res.redirect(req.get('Referrer') || '/');
    }

    const existingReply = await prisma.reviewReply.findUnique({
      where: { reviewId: reviewId }
    });

    if (existingReply) {
      req.flash('error_msg', 'Anda sudah membalas ulasan ini.');
      return res.redirect(req.get('Referrer') || '/');
    }

    const reply = await prisma.reviewReply.create({
      data: {
        reviewId: reviewId,
        userId: req.session.userId,
        comment: comment || null
      }
    });

    if (req.files && req.files.length > 0) {
      const mediaPromises = req.files.map(async (file) => {
        const uploadResult = await uploadStream(file.buffer, 'kampuslapak/reviews', 'auto');
        const mediaType = file.mimetype.startsWith('video') ? 'video' : 'image';
        return prisma.reviewReplyMedia.create({
          data: {
            replyId: reply.id,
            mediaPath: uploadResult.secure_url,
            mediaType: mediaType
          }
        });
      });
      await Promise.all(mediaPromises);
    }

    req.flash('success_msg', 'Balasan berhasil dikirim!');
    res.redirect(req.get('Referrer') || '/');
  } catch (err) {
    console.error(err);
    req.flash('error_msg', 'Terjadi kesalahan saat membalas ulasan.');
    res.redirect(req.get('Referrer') || '/');
  }
};

module.exports = {
  getCatalog,
  getProductDetail,
  postReview,
  postReviewReply
};
