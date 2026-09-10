'use strict';
const reviews = require('../../models/reviews');

exports.index = (req, res) => {
  const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : '';
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  res.render('admin/reviews/index', { title: 'Reseñas', result: reviews.list({ status, page }), status });
};
exports.setStatus = (req, res, next) => {
  const r = reviews.byId(Number(req.params.id));
  if (!r) return next();
  const status = ['approved', 'rejected', 'pending'].includes(req.body.status) ? req.body.status : 'pending';
  reviews.setStatus(r.id, status);
  req.flash('success', `Reseña ${status === 'approved' ? 'aprobada' : status === 'rejected' ? 'rechazada' : 'marcada como pendiente'}.`);
  res.redirect(req.get('Referer') && req.get('Referer').includes('/admin/resenas') ? req.get('Referer') : '/admin/resenas');
};
exports.destroy = (req, res, next) => {
  const r = reviews.byId(Number(req.params.id));
  if (!r) return next();
  reviews.remove(r.id);
  req.flash('success', 'Reseña eliminada.');
  res.redirect('/admin/resenas');
};
