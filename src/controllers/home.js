'use strict';
const products = require('../models/products');
const categories = require('../models/categories');
const plans = require('../models/plans');
const changelog = require('../models/changelog');
const users = require('../models/users');
const reviews = require('../models/reviews');

exports.index = (req, res) => {
  const stats = products.stats();
  res.render('pages/home', {
    title: null,
    featured: products.featured(8),
    newest: products.newest(4),
    topRated: products.topRated(4),
    testimonials: reviews.latestApproved(3),
    categories: categories.all(),
    plans: plans.all({ activeOnly: true }),
    updates: changelog.recent({ perPage: 5 }).rows,
    stats: { products: stats.active, updates: changelog.count(), users: users.count(), sales: stats.sales },
  });
};
