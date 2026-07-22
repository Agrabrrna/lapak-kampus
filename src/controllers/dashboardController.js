const getAdminDashboard = (req, res) => {
  res.render('admin/dashboard', {
    title: 'Dashboard Admin - KampusLapak',
    user: req.session.user
  });
};

const getUserDashboard = (req, res) => {
  res.render('user/dashboard', {
    title: 'Dashboard - KampusLapak',
    user: req.session.user
  });
};

module.exports = {
  getAdminDashboard,
  getUserDashboard
};
