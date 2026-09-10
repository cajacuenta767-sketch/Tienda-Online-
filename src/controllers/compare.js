'use strict';
const products = require('../models/products');

exports.index = (req, res) => {
  const slugs = String(req.query.p || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 3);
  const items = slugs.map((s) => products.bySlug(s)).filter((p) => p && p.is_active);
  const allProducts = products.list({ perPage: 200, sort: 'name' }).rows;
  res.render('pages/compare', { title: 'Comparar productos', items, allProducts, slugs: items.map((p) => p.slug) });
};
