'use strict';
const products = require('../models/products');
const v = require('../utils/validate');

exports.search = (req, res) => {
  const q = v.str(req.query.q, 60);
  if (q.length < 2) return res.json({ items: [] });
  const items = products.suggest(q, 6).map((p) => ({
    title: p.title, slug: p.slug, category: p.category_name, image: p.image, price_cents: products.effectivePrice(p), rating: Number(p.rating_avg || 0),
  }));
  res.json({ items, more: `/tienda?q=${encodeURIComponent(q)}` });
};
