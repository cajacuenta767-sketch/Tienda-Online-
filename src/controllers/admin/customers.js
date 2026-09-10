'use strict';
const users = require('../../models/users');
const orders = require('../../models/orders');
const memberships = require('../../models/memberships');
const licenses = require('../../models/licenses');
const favorites = require('../../models/favorites');
const products = require('../../models/products');
const tickets = require('../../models/tickets');
const ordersService = require('../../services/orders');
const emails = require('../../services/emails');
const auth = require('../auth');

exports.show = (req, res, next) => {
  const user = users.findById(Number(req.params.id));
  if (!user) return next();
  res.render('admin/users/show', {
    title: user.name,
    user,
    orders: orders.byUser(user.id).map((o) => ({ ...o, items: orders.items(o.id) })),
    membership: memberships.activeForUser(user.id),
    history: memberships.allForUser(user.id),
    licenses: licenses.forUser(user.id),
    owned: products.byIds(orders.purchasedProductIds(user.id)),
    favorites: products.byIds(favorites.idsForUser(user.id)),
    tickets: tickets.forUser(user.id),
    allProducts: products.list({ perPage: 500, sort: 'name' }).rows,
  });
};
exports.block = (req, res, next) => {
  const user = users.findById(Number(req.params.id));
  if (!user) return next();
  if (user.id === res.locals.currentUser.id) { req.flash('error', 'No puedes bloquearte a ti mismo.'); return res.redirect(`/admin/usuarios/${user.id}`); }
  users.setBlocked(user.id, !user.is_blocked);
  req.flash('success', user.is_blocked ? 'Cuenta desbloqueada.' : 'Cuenta bloqueada.');
  return res.redirect(`/admin/usuarios/${user.id}`);
};
exports.grant = (req, res, next) => {
  const user = users.findById(Number(req.params.id));
  const product = products.byId(Number(req.body.product_id));
  if (!user || !product) return next();
  if (orders.userOwnsProduct(user.id, product.id)) { req.flash('info', 'El cliente ya tiene este producto.'); return res.redirect(`/admin/usuarios/${user.id}`); }
  const order = orders.create({ user_id: user.id, provider: 'manual', amount_cents: 0 }, [{ item_type: 'product', product_id: product.id, title: `${product.title} (cortesía)`, unit_cents: 0, quantity: 1 }]);
  ordersService.markPaid(order.id, { provider_data: { granted_by: res.locals.currentUser.email, note: String(req.body.note || '').slice(0, 200) } });
  emails.accessGranted({ user, product }).catch(() => {});
  req.flash('success', `«${product.title}» asignado a ${user.email}.`);
  return res.redirect(`/admin/usuarios/${user.id}`);
};
exports.resendAccess = async (req, res, next) => {
  const user = users.findById(Number(req.params.id));
  if (!user) return next();
  const paid = orders.byUser(user.id).filter((o) => o.status === 'paid');
  for (const o of paid.slice(0, 5)) await emails.orderConfirmed({ user, order: o, items: orders.items(o.id), licenses: licenses.forOrder(o.id) }).catch(() => {});
  req.flash('success', paid.length ? 'Correos de acceso reenviados.' : 'El cliente no tiene compras pagadas.');
  return res.redirect(`/admin/usuarios/${user.id}`);
};
exports.resendVerification = async (req, res, next) => {
  const user = users.findById(Number(req.params.id));
  if (!user) return next();
  await auth.sendVerification(user).catch(() => {});
  req.flash('success', 'Correo de verificación enviado.');
  return res.redirect(`/admin/usuarios/${user.id}`);
};
exports.verify = (req, res, next) => {
  const user = users.findById(Number(req.params.id));
  if (!user) return next();
  users.setVerified(user.id);
  req.flash('success', 'Correo marcado como verificado.');
  return res.redirect(`/admin/usuarios/${user.id}`);
};
