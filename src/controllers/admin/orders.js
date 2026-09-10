'use strict';
const orders = require('../../models/orders');
const ordersService = require('../../services/orders');
const payments = require('../../payments');

exports.index = (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const status = ['pending', 'paid', 'cancelled'].includes(req.query.status) ? req.query.status : '';
  const provider = payments.get(req.query.provider) ? req.query.provider : '';
  res.render('admin/orders/index', { title: 'Pedidos', result: orders.list({ status, provider, page }), status, provider });
};
exports.show = (req, res, next) => {
  const order = orders.byId(Number(req.params.id));
  if (!order) return next();
  res.render('admin/orders/show', { title: `Pedido ${order.reference}`, order, items: orders.items(order.id) });
};
exports.markPaid = (req, res, next) => {
  const order = orders.byId(Number(req.params.id));
  if (!order) return next();
  const provider = payments.get(order.provider);
  const extra = provider && provider.adminConfirm ? provider.adminConfirm(order) : { confirmed_by: 'admin', confirmed_at: new Date().toISOString() };
  ordersService.markPaid(order.id, { provider_data: { ...extra, admin_note: String(req.body.note || '').slice(0, 300) } });
  req.flash('success', `Pedido ${order.reference} marcado como pagado.`);
  res.redirect(`/admin/pedidos/${order.id}`);
};
exports.cancel = (req, res, next) => {
  const order = orders.byId(Number(req.params.id));
  if (!order) return next();
  try {
    ordersService.cancel(order.id);
    req.flash('success', `Pedido ${order.reference} cancelado.`);
  } catch (err) {
    req.flash('error', err.message);
  }
  res.redirect(`/admin/pedidos/${order.id}`);
};
