const prisma = require('../services/db');
const { validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');

// Helper to seed categories if empty
const ensureCategoriesExist = async () => {
  const count = await prisma.category.count();
  if (count === 0) {
    await prisma.category.createMany({
      data: [
        { name: 'Buku', slug: 'buku' },
        { name: 'Laptop', slug: 'laptop' },
        { name: 'Alat Praktikum', slug: 'alat-praktikum' },
        { name: 'Kebutuhan Kampus Lainnya', slug: 'kebutuhan-kampus-lainnya' }
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
    // Delete uploaded files if validation fails
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      });
    }

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

    // Save product images
    if (req.files && req.files.length > 0) {
      const imagePromises = req.files.map((file, index) => {
        return prisma.productImage.create({
          data: {
            productId: product.id,
            imagePath: '/uploads/' + file.filename,
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
    // Cleanup uploads on error
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      });
    }
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
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      });
    }

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

    // Handle new image uploads if any
    if (req.files && req.files.length > 0) {
      // Check if product already has primary image
      const hasPrimary = product.images.some(img => img.isPrimary);

      const imagePromises = req.files.map((file, index) => {
        return prisma.productImage.create({
          data: {
            productId: product.id,
            imagePath: '/uploads/' + file.filename,
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
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      });
    }
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

    // Delete physically associated image files
    product.images.forEach(img => {
      const fullPath = path.join(__dirname, '../../public', img.imagePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    });

    // Delete image records first (due to relations)
    await prisma.productImage.deleteMany({
      where: { productId: id }
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
    res.status(500).send('Terjadi kesalahan saat menghapus produk.');
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
