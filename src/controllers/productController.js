const prisma = require('../services/db');
const { validationResult } = require('express-validator');
const { uploadStream, deleteImage, getPublicIdFromUrl } = require('../services/cloudinary');

// Helper to seed categories if empty
const ensureCategoriesExist = async () => {
  const count = await prisma.category.count();
  if (count === 0) {
    await prisma.category.createMany({
      data: [
        { name: 'Buku', slug: 'buku' },
        { name: 'Laptop', slug: 'laptop' },
        { name: 'Alat Praktikum', slug: 'alat-praktikum' },
        { name: 'Kebutuhan Lainnya', slug: 'kebutuhan-lainnya' }
      ]
    });
  }
};

// Generate a simple slug
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '') // remove invalid chars
    .replace(/\s+/g, '-') // collapse whitespace and replace by -
    .replace(/-+/g, '-') + '-' + Date.now(); // collapse dashes + append timestamp
};

// 5. Halaman "Produk Saya"
const getMyProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { userId: req.session.userId },
      include: {
        category: true,
        images: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.render('seller/products', {
      title: 'Produk Saya - KampusLapak',
      products,
      success: null,
      error: null
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Terjadi kesalahan pada server.');
  }
};

// 1. GET Tambah Produk
const getAddProduct = async (req, res) => {
  try {
    await ensureCategoriesExist();
    const categories = await prisma.category.findMany();
    res.render('seller/add-product', {
      title: 'Tambah Produk - KampusLapak',
      categories,
      errors: [],
      data: {}
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Terjadi kesalahan pada server.');
  }
};

// 1. POST Tambah Produk
const postAddProduct = async (req, res) => {
  await ensureCategoriesExist();
  const categories = await prisma.category.findMany();

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Note: No local file cleanup needed as multer uses memory storage
    return res.render('seller/add-product', {
      title: 'Tambah Produk - KampusLapak',
      categories,
      errors: errors.array(),
      data: req.body
    });
  }

  const { name, description, price, stock, condition, categoryId } = req.body;

  try {
    const slug = generateSlug(name);

    // Create product
    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description: description || '',
        price: parseFloat(price),
        stock: parseInt(stock),
        condition,
        userId: req.session.userId,
        categoryId: categoryId
      }
    });

    // Save product images to Cloudinary
    if (req.files && req.files.length > 0) {
      const imagePromises = req.files.map(async (file, index) => {
        const uploadResult = await uploadStream(file.buffer, 'kampuslapak/products');
        return prisma.productImage.create({
          data: {
            productId: product.id,
            imagePath: uploadResult.secure_url,
            isPrimary: index === 0 // Mark the first uploaded image as primary
          }
        });
      });
      await Promise.all(imagePromises);
    }

    // Fetch products list and render success
    const products = await prisma.product.findMany({
      where: { userId: req.session.userId },
      include: { category: true, images: true },
      orderBy: { createdAt: 'desc' }
    });

    res.render('seller/products', {
      title: 'Produk Saya - KampusLapak',
      products,
      success: 'Produk berhasil ditambahkan!',
      error: null
    });

  } catch (err) {
    console.error(err);
    res.render('seller/add-product', {
      title: 'Tambah Produk - KampusLapak',
      categories,
      errors: [{ msg: 'Gagal menambahkan produk ke database.' }],
      data: req.body
    });
  }
};

// 2. GET Edit Produk
const getEditProduct = async (req, res) => {
  const { id } = req.params;

  try {
    await ensureCategoriesExist();
    const categories = await prisma.category.findMany();

    const product = await prisma.product.findUnique({
      where: { id },
      include: { images: true }
    });

    if (!product || product.userId !== req.session.userId) {
      return res.status(404).send('Produk tidak ditemukan atau Anda tidak memiliki akses.');
    }

    res.render('seller/edit-product', {
      title: 'Edit Produk - KampusLapak',
      categories,
      product,
      errors: []
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Terjadi kesalahan pada server.');
  }
};

// 2. POST Edit Produk
const postEditProduct = async (req, res) => {
  const { id } = req.params;
  const categories = await prisma.category.findMany();

  const product = await prisma.product.findUnique({
    where: { id },
    include: { images: true }
  });

  if (!product || product.userId !== req.session.userId) {
    return res.status(404).send('Produk tidak ditemukan atau Anda tidak memiliki akses.');
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('seller/edit-product', {
      title: 'Edit Produk - KampusLapak',
      categories,
      product: { ...product, ...req.body },
      errors: errors.array()
    });
  }

  const { name, description, price, stock, condition, categoryId, primaryImageId } = req.body;

  try {
    const slug = product.name === name ? product.slug : generateSlug(name);

    // Update product text details
    await prisma.product.update({
      where: { id },
      data: {
        name,
        slug,
        description: description || '',
        price: parseFloat(price),
        stock: parseInt(stock),
        condition,
        categoryId: categoryId
      }
    });

    // Handle new image uploads to Cloudinary if any
    if (req.files && req.files.length > 0) {
      // Check if product already has primary image
      const hasPrimary = product.images.some(img => img.isPrimary);

      const imagePromises = req.files.map(async (file, index) => {
        const uploadResult = await uploadStream(file.buffer, 'kampuslapak/products');
        return prisma.productImage.create({
          data: {
            productId: product.id,
            imagePath: uploadResult.secure_url,
            isPrimary: !hasPrimary && index === 0 // only make primary if there's no existing primary image
          }
        });
      });
      await Promise.all(imagePromises);
    }

    // Handle primary image update if user checked another image
    if (primaryImageId) {
      // Set all images of this product to not primary
      await prisma.productImage.updateMany({
        where: { productId: id },
        data: { isPrimary: false }
      });
      // Set chosen image to primary
      await prisma.productImage.update({
        where: { id: primaryImageId },
        data: { isPrimary: true }
      });
    }

    const products = await prisma.product.findMany({
      where: { userId: req.session.userId },
      include: { category: true, images: true },
      orderBy: { createdAt: 'desc' }
    });

    res.render('seller/products', {
      title: 'Produk Saya - KampusLapak',
      products,
      success: 'Produk berhasil diperbarui!',
      error: null
    });

  } catch (err) {
    console.error(err);
    res.render('seller/edit-product', {
      title: 'Edit Produk - KampusLapak',
      categories,
      product: { ...product, ...req.body },
      errors: [{ msg: 'Gagal memperbarui produk di database.' }]
    });
  }
};

// 3. POST Hapus Produk
const postDeleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { images: true }
    });

    if (!product || product.userId !== req.session.userId) {
      return res.status(404).send('Produk tidak ditemukan atau Anda tidak memiliki akses.');
    }

    // Delete associated image files from Cloudinary
    const deletePromises = product.images.map(img => {
      const publicId = getPublicIdFromUrl(img.imagePath);
      if (publicId) {
        return deleteImage(publicId).catch(err => console.error('Gagal menghapus gambar dari Cloudinary:', err));
      }
      return Promise.resolve();
    });
    await Promise.all(deletePromises);

    // Delete image records first (due to relations)
    await prisma.productImage.deleteMany({
      where: { productId: id }
    });

    // Clear product from wishlists and reviews
    await prisma.wishlist.deleteMany({ where: { productId: id } });
    await prisma.review.deleteMany({ where: { productId: id } });
    
    // Detach product from chats
    await prisma.chat.updateMany({
      where: { productId: id },
      data: { productId: null }
    });

    // Delete product record
    await prisma.product.delete({
      where: { id }
    });

    const products = await prisma.product.findMany({
      where: { userId: req.session.userId },
      include: { category: true, images: true },
      orderBy: { createdAt: 'desc' }
    });

    res.render('seller/products', {
      title: 'Produk Saya - KampusLapak',
      products,
      success: 'Produk berhasil dihapus!',
      error: null
    });
  } catch (err) {
    console.error(err);
    
    let errorMessage = 'Terjadi kesalahan saat menghapus produk.';
    // Prisma Foreign Key constraint error (P2003)
    if (err.code === 'P2003') {
      errorMessage = 'Produk tidak dapat dihapus karena sudah terkait dengan riwayat pesanan pembeli. Jika produk ini tidak dijual lagi, pertimbangkan untuk mengubah stok menjadi 0.';
    }

    try {
      const products = await prisma.product.findMany({
        where: { userId: req.session.userId },
        include: { category: true, images: true },
        orderBy: { createdAt: 'desc' }
      });
      res.render('seller/products', {
        title: 'Produk Saya - KampusLapak',
        products,
        success: null,
        error: errorMessage
      });
    } catch (fallbackErr) {
      res.status(500).send(errorMessage);
    }
  }
};

module.exports = {
  getMyProducts,
  getAddProduct,
  postAddProduct,
  getEditProduct,
  postEditProduct,
  postDeleteProduct
};
