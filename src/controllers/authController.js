const bcrypt = require('bcryptjs');
const prisma = require('../services/db');

const getRegister = (req, res) => {
  res.render('auth/register', { title: 'Daftar - KampusLapak', error: null, success: null });
};

const postRegister = async (req, res) => {
  const { name, email, password, role, phone, address } = req.body;

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.render('auth/register', {
        title: 'Daftar - KampusLapak',
        error: 'Email sudah terdaftar.',
        success: null
      });
    }

    // Validate role
    const finalRole = (role === 'PENJUAL' || role === 'PEMBELI') ? role : 'PEMBELI';

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: finalRole,
        phone: phone || null,
        address: address || null
      }
    });

    res.render('auth/login', {
      title: 'Masuk - KampusLapak',
      success: 'Pendaftaran berhasil. Silakan masuk.',
      error: null
    });

  } catch (err) {
    console.error(err);
    res.render('auth/register', {
      title: 'Daftar - KampusLapak',
      error: 'Terjadi kesalahan sistem. Silakan coba lagi.',
      success: null
    });
  }
};

const getLogin = (req, res) => {
  res.render('auth/login', { title: 'Masuk - KampusLapak', error: null, success: null });
};

const postLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.render('auth/login', {
        title: 'Masuk - KampusLapak',
        error: 'Email atau password salah.',
        success: null
      });
    }

    // Compare passwords
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.render('auth/login', {
        title: 'Masuk - KampusLapak',
        error: 'Email atau password salah.',
        success: null
      });
    }

    // Save to session
    req.session.userId = user.id;
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    // Redirect based on role
    if (user.role === 'ADMIN') {
      return res.redirect('/admin/dashboard');
    } else {
      return res.redirect('/user/dashboard');
    }

  } catch (err) {
    console.error(err);
    res.render('auth/login', {
      title: 'Masuk - KampusLapak',
      error: 'Terjadi kesalahan sistem. Silakan coba lagi.',
      success: null
    });
  }
};

const postLogout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Gagal destroy session:', err);
    }
    res.redirect('/auth/login');
  });
};

module.exports = {
  getRegister,
  postRegister,
  getLogin,
  postLogin,
  postLogout
};
