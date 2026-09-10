'use strict';
const products = require('../models/products');
const categories = require('../models/categories');
const plans = require('../models/plans');
const changelog = require('../models/changelog');
const users = require('../models/users');
const reviews = require('../models/reviews');
const bundles = require('../models/bundles');
const posts = require('../models/posts');
const seo = require('../services/seo');
const settings = require('../models/settings');

exports.index = (req, res) => {
  const stats = products.stats();
  res.render('pages/home', {
    title: null,
    featured: products.featured(8),
    newest: products.newest(4),
    topRated: products.topRated(4),
    testimonials: reviews.latestApproved(3),
    bundles: bundles.all({ activeOnly: true }).slice(0, 3),
    posts: posts.latest(3),
    headExtra: seo.orgJsonLd(settings.getAll()) + '\n  ' + seo.metaTags({ title: settings.get('store_name', 'DevMarket'), description: settings.get('tagline', ''), url: res.locals.baseUrl + '/' }),
    categories: categories.all(),
    plans: plans.all({ activeOnly: true }),
    updates: changelog.recent({ perPage: 5 }).rows,
    stats: { products: stats.active, updates: changelog.count(), users: users.count(), sales: stats.sales },
  });
};
