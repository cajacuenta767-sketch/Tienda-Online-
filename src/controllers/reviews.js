'use strict';
const products = require('../models/products');
const reviews = require('../models/reviews');
const access = require('../services/access');
const v = require('../utils/validate');

exports.create = (req, res, next) => {
  const product = products.bySlug(req.params.slug, { withRelations: false });
  if (!product) return next();
  const user = res.locals.currentUser;
  const rating = Math.min(5, Math.max(1, parseInt(req.body.rating, 10) || 0));
  const title = v.str(req.body.title, 120);
  const body = v.str(req.body.body, 2000);
  const canReview = user.role === 'admin' || access.userOwnsProduct(user.id, product.id) || access.hasActiveMembership(user.id);
  if (!canReview) {
    req.flash('error', 'Solo los clientes que compraron el producto (o con membresía activa) pueden dejar una reseña.');
    return res.redirect(`/producto/${product.slug}#resenas`);
  }
  if (!rating || body.length < 10) {
    req.flash('error', 'Elige una calificación y escribe al menos 10 caracteres.');
    return res.redirect(`/producto/${product.slug}#resenas`);
  }
  reviews.create({ product_id: product.id, user_id: user.id, rating, title, body, status: user.role === 'admin' ? 'approved' : 'pending' });
  req.flash('success', user.role === 'admin' ? 'Reseña publicada.' : 'Gracias por tu reseña. Se publicará cuando la revisemos.');
  return res.redirect(`/producto/${product.slug}#resenas`);
};
