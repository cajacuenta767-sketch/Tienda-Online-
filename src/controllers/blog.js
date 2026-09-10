'use strict';
const posts = require('../models/posts');

exports.index = (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  res.render('pages/blog', { title: 'Blog', result: posts.published({ page }) });
};
exports.show = (req, res, next) => {
  const post = posts.bySlug(req.params.slug);
  const isAdmin = res.locals.currentUser && res.locals.currentUser.role === 'admin';
  if (!post || (post.status !== 'published' && !isAdmin)) return next();
  res.render('pages/post', { title: post.title, post, metaDescription: post.excerpt, more: posts.latest(4).filter((p) => p.id !== post.id).slice(0, 3) });
};
