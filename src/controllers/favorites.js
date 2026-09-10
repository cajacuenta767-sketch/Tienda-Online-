'use strict';
const products = require('../models/products');
const favorites = require('../services/favorites');

exports.index = (req, res) => {
  const ids = favorites.ids(req);
  const result = products.list({ ids, perPage: 100, sort: 'recent' });
  res.render('pages/favorites', { title: 'Mis favoritos', result });
};

exports.toggle = (req, res, next) => {
  const product = products.byId(Number(req.params.productId));
  if (!product || !product.is_active) return next();
  const added = favorites.toggle(req, product.id);
  const count = favorites.ids(req).length;
  const wantsJson = req.is('application/json') || (req.get('accept') || '').includes('application/json');
  if (wantsJson) return res.json({ added, count });
  req.flash('success', added ? `«${product.title}» añadido a favoritos.` : `«${product.title}» quitado de favoritos.`);
  const back = req.get('Referer');
  return res.redirect(back && back.startsWith(res.locals.baseUrl) ? back : `/producto/${product.slug}`);
};
