'use strict';
const users = require('../../models/users');
const v = require('../../utils/validate');

exports.index = (req, res) => {
  const q = v.str(req.query.q, 100);
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  res.render('admin/users/index', { title: 'Usuarios', ...users.list({ q, page }), q, page });
};
exports.setRole = (req, res, next) => {
  const user = users.findById(Number(req.params.id));
  if (!user) return next();
  const role = req.body.role === 'admin' ? 'admin' : 'user';
  if (user.id === res.locals.currentUser.id && role !== 'admin') {
    req.flash('error', 'No puedes quitarte el rol de administrador a ti mismo.');
    return res.redirect('/admin/usuarios');
  }
  users.updateRole(user.id, role);
  req.flash('success', `Rol de ${user.email} actualizado a ${role}.`);
  return res.redirect('/admin/usuarios');
};
