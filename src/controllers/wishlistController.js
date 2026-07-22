const prisma = require('../services/db');

// Add product to wishlist
const postAddWishlist = async (req, res) => {
  const { productId } = req.params;
  const userId = req.session.userId;

  try {
    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).send('Produk tidak ditemukan.');
    }

    // Check if already in wishlist
    const existing = await prisma.wishlist.findFirst({
      where: {
        userId,
        productId
      }
    });

    if (!existing) {
      await prisma.wishlist.create({
        data: {
          userId,
          productId
        }
      });
    }

    res.redirect('/products/' + productId);

  } catch (err) {
    console.error(err);
    res.status(500).send('Terjadi kesalahan pada server saat menambahkan wishlist.');
  }
};

// Remove product from wishlist (using productId)
const postDeleteWishlistByProduct = async (req, res) => {
  const { productId } = req.params;
  const userId = req.session.userId;

  try {
    const existing = await prisma.wishlist.findFirst({
      where: {
        userId,
        productId
      }
    });

    if (existing) {
      await prisma.wishlist.delete({
        where: { id: existing.id }
      });
    }

    res.redirect('/products/' + productId);

  } catch (err) {
    console.error(err);
    res.status(500).send('Terjadi kesalahan pada server saat menghapus wishlist.');
  }
};

// View wishlist list page
const getMyWishlist = async (req, res) => {
  const userId = req.session.userId;

  try {
    const wishlistItems = await prisma.wishlist.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            category: true,
            images: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.render('user/wishlist', {
      title: 'Wishlist Saya - KampusLapak',
      wishlistItems
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Terjadi kesalahan pada server saat memuat wishlist.');
  }
};

// Delete wishlist by entry ID (from wishlist page)
const postDeleteWishlist = async (req, res) => {
  const { id } = req.params;
  const userId = req.session.userId;

  try {
    const entry = await prisma.wishlist.findUnique({
      where: { id }
    });

    if (!entry || entry.userId !== userId) {
      return res.status(404).send('Wishlist tidak ditemukan atau Anda tidak memiliki akses.');
    }

    await prisma.wishlist.delete({
      where: { id }
    });

    res.redirect('/wishlist');

  } catch (err) {
    console.error(err);
    res.status(500).send('Terjadi kesalahan pada server saat menghapus wishlist.');
  }
};

module.exports = {
  postAddWishlist,
  postDeleteWishlistByProduct,
  getMyWishlist,
  postDeleteWishlist
};
