'use strict';
const products = require('../models/products');
const access = require('../services/access');

function load(req, res, next) {
  const product = products.bySlug(req.params.slug);
  if (!product) return null;
  const isAdmin = res.locals.currentUser && res.locals.currentUser.role === 'admin';
  if (!product.is_active && !isAdmin) return null;
  return product;
}

exports.show = (req, res, next) => {
  const product = load(req, res, next);
  if (!product) return next();
  const user = res.locals.currentUser;
  const canDownload = user ? access.canDownload(user, product) : false;
  res.render('pages/product', {
    title: product.title,
    product,
    related: products.related(product, 4),
    canDownload,
    hasMembership: user ? access.hasActiveMembership(user.id) : false,
  });
};

exports.preview = (req, res, next) => {
  const product = load(req, res, next);
  if (!product || !product.demo_url) return next();
  res.render('pages/preview', { title: `Demo: ${product.title}`, product, layout: false });
};
