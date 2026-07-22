const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/auth/login');
  }
  next();
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.session.user || !roles.includes(req.session.user.role)) {
      return res.status(403).send('Akses Ditolak: Anda tidak memiliki izin untuk mengakses halaman ini.');
    }
    next();
  };
};

module.exports = {
  requireAuth,
  requireRole
};
