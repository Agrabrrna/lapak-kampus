const express = require('express');
const path = require('path');
const session = require('express-session');
const csrf = require('csurf');
const flash = require('connect-flash');

const app = express();
const PORT = process.env.PORT || 3000;

// Set EJS as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));
app.use('/css', express.static(path.join(__dirname, '../node_modules/bootstrap/dist/css')));
app.use('/js', express.static(path.join(__dirname, '../node_modules/bootstrap/dist/js')));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: 'kampuslapaksecretdasar123',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 hours
}));

// Flash middleware
app.use(flash());

// Mount payment routes before CSRF to allow webhooks
const paymentRoutes = require('./routes/paymentRoutes');
app.use('/api', paymentRoutes);

// CSRF Protection
app.use(csrf());

const prisma = require('./services/db');

// Share variables to all EJS templates
app.use(async (req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  res.locals.user = req.session.user || null;
  res.locals.messages = req.flash();
  res.locals.midtransClientKey = process.env.MIDTRANS_CLIENT_KEY;
  
  res.locals.unreadCount = 0;
  if (req.session.userId) {
    try {
      const count = await prisma.notification.count({
        where: {
          userId: req.session.userId,
          isRead: false
        }
      });
      res.locals.unreadCount = count;
    } catch (err) {
      console.error('Error fetching unread notifications:', err);
    }
  }
  next();
});

// Import Routes
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const productRoutes = require('./routes/productRoutes');
const catalogRoutes = require('./routes/catalogRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const chatRoutes = require('./routes/chatRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Use Routes
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/', dashboardRoutes);
app.use('/', productRoutes);
app.use('/', catalogRoutes);
app.use('/', wishlistRoutes);
app.use('/', chatRoutes);
app.use('/', orderRoutes);
app.use('/', notificationRoutes);

// Home route redirect
app.get('/', (req, res) => {
  if (req.session.userId) {
    if (req.session.user.role === 'ADMIN') {
      return res.redirect('/admin/dashboard');
    }
    return res.redirect('/user/dashboard');
  }
  res.redirect('/products');
});

// Error handling for CSRF
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    res.status(403).send('Validasi Form Gagal (CSRF Token Invalid atau expired). Silakan kembali dan muat ulang halaman.');
  } else {
    next(err);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
