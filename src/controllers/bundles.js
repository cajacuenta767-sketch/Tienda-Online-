'use strict';
const bundles = require('../models/bundles');

exports.index = (req, res) => {
  res.render('pages/bundles', { title: 'Paquetes', bundles: bundles.all({ activeOnly: true }) });
};
exports.show = (req, res, next) => {
  const bundle = bundles.bySlug(req.params.slug);
  if (!bundle || !bundle.is_active) return next();
  res.render('pages/bundle', { title: bundle.name, bundle, metaDescription: bundle.description });
};
