module.exports = function requireAdmin(req, res, next) {
  if (req.session && req.session.admin) return next();
  return res.redirect('/secure-admin-login-rmz9x');
};
