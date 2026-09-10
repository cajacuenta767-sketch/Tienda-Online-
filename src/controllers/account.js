'use strict';
const path = require('path');
const config = require('../config');
const orders = require('../models/orders');
const products = require('../models/products');
const memberships = require('../models/memberships');
const users = require('../models/users');
const downloads = require('../models/downloads');
const access = require('../services/access');
const ordersService = require('../services/orders');
const v = require('../utils/validate');

exports.dashboard = (req, res) => {
  const user = res.locals.currentUser;
  const myOrders = orders.byUser(user.id).map((o) => ({ ...o, items: orders.items(o.id) }));
  const membership = memberships.activeForUser(user.id);
  const ownedIds = orders.purchasedProductIds(user.id);
  let downloadable = [];
  if (membership) {
    downloadable = products.list({ perPage: 500, sort: 'name' }).rows.map((p) => ({ ...p, viaMembership: !ownedIds.includes(p.id) }));
  } else if (ownedIds.length) {
    downloadable = products.byIds(ownedIds).map((p) => ({ ...p, viaMembership: false }));
  }
  const tab = ['compras', 'descargas', 'membresia', 'perfil'].includes(req.query.tab) ? req.query.tab : 'compras';
  res.render('account/dashboard', { title: 'Mi cuenta', myOrders, membership, downloadable, tab, history: memberships.allForUser(user.id) });
};

exports.order = (req, res, next) => {
  const order = orders.byId(Number(req.params.id));
  const user = res.locals.currentUser;
  if (!order || (order.user_id !== user.id && user.role !== 'admin')) return next();
  const items = orders.items(order.id).map((it) => ({ ...it, canDownload: it.product_id ? access.canDownload(user, products.byId(it.product_id)) : false }));
  res.render('account/order', { title: `Pedido ${order.reference}`, order, items });
};

exports.cancelOrder = (req, res, next) => {
  const order = orders.byId(Number(req.params.id));
  const user = res.locals.currentUser;
  if (!order || order.user_id !== user.id) return next();
  try {
    ordersService.cancel(order.id);
    req.flash('info', 'Pedido cancelado.');
  } catch (err) {
    req.flash('error', err.message);
  }
  res.redirect(`/pedidos/${order.id}`);
};

exports.changePassword = (req, res) => {
  const user = users.findById(res.locals.currentUser.id);
  const current = String(req.body.current_password || '');
  const password = String(req.body.password || '');
  const confirm = String(req.body.password_confirm || '');
  const errors = [];
  if (!users.verifyPassword(user, current)) errors.push('La contraseña actual no es correcta.');
  v.minLen(password, 8, 'La nueva contraseña', errors);
  if (password !== confirm) errors.push('Las contraseñas nuevas no coinciden.');
  if (errors.length) {
    errors.forEach((e) => req.flash('error', e));
  } else {
    users.updatePassword(user.id, password);
    req.flash('success', 'Contraseña actualizada.');
  }
  res.redirect('/cuenta?tab=perfil');
};

exports.download = (req, res, next) => {
  const product = products.byId(Number(req.params.productId));
  const user = res.locals.currentUser;
  if (!product) return next();
  if (!access.canDownload(user, product)) {
    return res.status(403).render('errors/500', {
      title: 'Sin acceso',
      status: 403,
      message: 'No tienes acceso a esta descarga. Compra el producto o activa una membresía.',
    });
  }
  const filePath = path.join(config.STORAGE_DIR, path.basename(product.file_name));
  const downloadName = `${product.slug}-v${product.version}.zip`;
  products.incrementDownloads(product.id);
  downloads.log(user.id, product.id);
  res.download(filePath, downloadName, (err) => {
    if (err && !res.headersSent) next(Object.assign(new Error('El archivo del producto no está disponible. Contacta a soporte.'), { status: 404 }));
  });
};
