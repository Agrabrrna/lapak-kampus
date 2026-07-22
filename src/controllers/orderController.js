const prisma = require('../services/db');

exports.addToCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const qty = parseInt(req.body.quantity) || 1;

    // Verify product exists and get its sellerId and price
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { user: true, images: true }
    });

    if (!product) {
      req.flash('error_msg', 'Produk tidak ditemukan.');
      return res.redirect(req.get('Referrer') || '/');
    }

    if (product.stock < qty) {
      req.flash('error_msg', 'Stok produk tidak mencukupi.');
      return res.redirect(req.get('Referrer') || '/');
    }

    if (product.userId === req.session.userId) {
      req.flash('error_msg', 'Anda tidak bisa membeli produk Anda sendiri.');
      return res.redirect(req.get('Referrer') || '/');
    }

    // Initialize cart in session if not exists
    if (!req.session.cart) {
      req.session.cart = {};
    }

    const sellerId = product.userId;

    // Initialize seller's cart group if not exists
    if (!req.session.cart[sellerId]) {
      req.session.cart[sellerId] = {
        sellerName: product.user.name,
        items: []
      };
    }

    // Check if product is already in the seller's cart
    const existingItem = req.session.cart[sellerId].items.find(item => item.productId === productId);

    if (existingItem) {
      if (existingItem.quantity + qty > product.stock) {
        req.flash('error_msg', 'Total kuantitas melebihi stok yang tersedia.');
        return res.redirect(req.get('Referrer') || '/');
      }
      existingItem.quantity += qty;
    } else {
      const primaryImg = product.images.find(img => img.isPrimary) || product.images[0];
      req.session.cart[sellerId].items.push({
        productId: product.id,
        name: product.name,
        price: parseFloat(product.price),
        quantity: qty,
        image: primaryImg ? primaryImg.imagePath : null
      });
    }

    req.flash('success_msg', 'Produk berhasil ditambahkan ke keranjang.');
    res.redirect('/cart');
  } catch (error) {
    console.error('Error in addToCart:', error);
    req.flash('error_msg', 'Terjadi kesalahan pada server.');
    res.redirect(req.get('Referrer') || '/');
  }
};

exports.viewCart = (req, res) => {
  const cart = req.session.cart || {};
  res.render('order/cart', {
    title: 'Keranjang Belanja',
    user: req.session.user,
    cart,
    csrfToken: req.csrfToken()
  });
};

exports.removeFromCart = (req, res) => {
  try {
    const { sellerId, productId } = req.params;
    
    if (req.session.cart && req.session.cart[sellerId]) {
      req.session.cart[sellerId].items = req.session.cart[sellerId].items.filter(item => item.productId !== productId);
      
      // If no items left for this seller, remove the seller group
      if (req.session.cart[sellerId].items.length === 0) {
        delete req.session.cart[sellerId];
      }
      req.flash('success_msg', 'Produk dihapus dari keranjang.');
    }
    res.redirect('/cart');
  } catch (error) {
    console.error('Error in removeFromCart:', error);
    req.flash('error_msg', 'Gagal menghapus produk.');
    res.redirect('/cart');
  }
};

exports.checkoutForm = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const cart = req.session.cart || {};
    const sellerCart = cart[sellerId];

    if (!sellerCart || sellerCart.items.length === 0) {
      req.flash('error_msg', 'Keranjang Anda kosong untuk penjual ini.');
      return res.redirect('/cart');
    }

    // Recalculate total
    let total = 0;
    sellerCart.items.forEach(item => {
      total += item.price * item.quantity;
    });

    res.render('order/checkout', {
      title: 'Checkout Pesanan',
      user: req.session.user,
      sellerId,
      sellerCart,
      total,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Error in checkoutForm:', error);
    req.flash('error_msg', 'Terjadi kesalahan pada server.');
    res.redirect('/cart');
  }
};

exports.processCheckout = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const cart = req.session.cart || {};
    const sellerCart = cart[sellerId];

    if (!sellerCart || sellerCart.items.length === 0) {
      req.flash('error_msg', 'Keranjang Anda kosong untuk penjual ini.');
      return res.redirect('/cart');
    }

    let totalPrice = 0;
    const orderDetailsData = [];

    // First pass: Verify stock and build order details array
    for (const item of sellerCart.items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      
      if (!product) {
        req.flash('error_msg', `Produk ${item.name} tidak ditemukan lagi.`);
        return res.redirect('/cart');
      }

      if (product.stock < item.quantity) {
        req.flash('error_msg', `Stok produk ${item.name} tidak mencukupi (sisa ${product.stock}).`);
        return res.redirect('/cart');
      }

      const subtotal = item.price * item.quantity;
      totalPrice += subtotal;
      
      orderDetailsData.push({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        subtotal: subtotal
      });
    }

    // Use Prisma transaction to ensure all operations succeed or fail together
    const newOrder = await prisma.$transaction(async (tx) => {
      // 1. Create the Order
      const order = await tx.order.create({
        data: {
          buyerId: req.session.userId,
          sellerId: sellerId,
          totalPrice: totalPrice,
          status: 'PENDING',
          orderDetails: {
            create: orderDetailsData
          }
        }
      });

      // 2. Reduce the stock of each product
      for (const detail of orderDetailsData) {
        await tx.product.update({
          where: { id: detail.productId },
          data: {
            stock: {
              decrement: detail.quantity
            }
          }
        });
      }

      return order;
    });

    // Notify seller
    await prisma.notification.create({
      data: {
        userId: sellerId,
        title: 'Pesanan Baru Masuk',
        message: 'Anda mendapat pesanan baru. Segera periksa di halaman Pesanan Masuk.'
      }
    });

    // 3. Clear the items from cart
    delete req.session.cart[sellerId];
    
    req.flash('success_msg', 'Pesanan berhasil dibuat!');
    res.redirect('/orders/my-orders');

  } catch (error) {
    console.error('Error in processCheckout:', error);
    req.flash('error_msg', 'Terjadi kesalahan saat memproses checkout.');
    res.redirect('/cart');
  }
};

exports.buyerOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { buyerId: req.session.userId },
      include: {
        seller: { select: { name: true, phone: true } },
        orderDetails: {
          include: { product: { select: { name: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.render('order/my-orders', {
      title: 'Pesanan Saya',
      user: req.session.user,
      orders,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Error fetching buyer orders:', error);
    req.flash('error_msg', 'Gagal memuat pesanan.');
    res.redirect('/user/dashboard');
  }
};

exports.sellerOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { sellerId: req.session.userId },
      include: {
        buyer: { select: { name: true, phone: true, email: true } },
        orderDetails: {
          include: { product: { select: { name: true } } }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.render('order/incoming-orders', {
      title: 'Pesanan Masuk',
      user: req.session.user,
      orders,
      csrfToken: req.csrfToken()
    });
  } catch (error) {
    console.error('Error fetching seller orders:', error);
    req.flash('error_msg', 'Gagal memuat pesanan masuk.');
    res.redirect('/user/dashboard');
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { newStatus } = req.body;
    const userId = req.session.userId;
    const role = req.session.user.role;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { orderDetails: true }
    });

    if (!order) {
      req.flash('error_msg', 'Pesanan tidak ditemukan.');
      return res.redirect(req.get('Referrer') || '/');
    }

    // Validate authorization and valid transitions
    let allowed = false;

    if (role === 'PEMBELI' && order.buyerId === userId) {
      if (newStatus === 'DIBATALKAN' && order.status === 'PENDING') {
        allowed = true; // Buyer can cancel if pending
      } else if (newStatus === 'SELESAI' && order.status === 'DIPROSES') {
        allowed = true; // Buyer can mark completed if processing
      }
    } else if (role === 'PENJUAL' && order.sellerId === userId) {
      if (newStatus === 'DIPROSES' && order.status === 'PENDING') {
        allowed = true; // Seller can accept
      } else if (newStatus === 'DIBATALKAN' && (order.status === 'PENDING' || order.status === 'DIPROSES')) {
        allowed = true; // Seller can cancel
      } else if (newStatus === 'SELESAI' && order.status === 'DIPROSES') {
        allowed = true; // Seller can also mark completed if needed
      }
    }

    if (!allowed) {
      req.flash('error_msg', 'Anda tidak memiliki akses untuk mengubah status ini.');
      return res.redirect(req.get('Referrer') || '/');
    }

    // Execute the update
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: newStatus }
      });

      // If cancelled, restore stock
      if (newStatus === 'DIBATALKAN') {
        for (const detail of order.orderDetails) {
          await tx.product.update({
            where: { id: detail.productId },
            data: { stock: { increment: detail.quantity } }
          });
        }
      }
    });

    // Notify the other party
    const targetUserId = (role === 'PEMBELI') ? order.sellerId : order.buyerId;
    await prisma.notification.create({
      data: {
        userId: targetUserId,
        title: 'Pembaruan Status Pesanan',
        message: `Status pesanan Anda telah diubah menjadi ${newStatus}.`
      }
    });

    req.flash('success_msg', `Status pesanan berhasil diubah menjadi ${newStatus}.`);
    res.redirect(req.get('Referrer') || '/');

  } catch (error) {
    console.error('Error updating order status:', error);
    req.flash('error_msg', 'Terjadi kesalahan saat mengubah status.');
    res.redirect(req.get('Referrer') || '/');
  }
};
