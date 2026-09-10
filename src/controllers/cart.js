'use strict';
const cart = require('../services/cart');
const products = require('../models/products');

exports.show = (req, res) => {
  const items = cart.items(req);
  res.render('cart/cart', { title: 'Carrito', items, total: cart.total(items) });
};
exports.add = (req, res, next) => {
  const product = products.byId(Number(req.params.productId));
  if (!product || !product.is_active) return next();
  cart.add(req, product.id);
  req.flash('success', `«${product.title}» se añadió al carrito.`);
  res.redirect(req.body.redirect === 'checkout' ? '/pagar' : '/carrito');
};
exports.remove = (req, res) => {
  cart.remove(req, Number(req.params.productId));
  res.redirect('/carrito');
};
exports.clear = (req, res) => {
  cart.clear(req);
  res.redirect('/carrito');
};
