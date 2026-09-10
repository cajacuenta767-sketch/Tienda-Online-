'use strict';
const products = require('../models/products');
const access = require('../services/access');
const reviews = require('../models/reviews');
const bundles = require('../models/bundles');
const seo = require('../services/seo');
const settings = require('../models/settings');

function parseFaq(text) {
  const out = [];
  let current = null;
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const q = line.match(/^(?:P|Q|Pregunta)\s*[:.)-]\s*(.+)$/i);
    const a = line.match(/^(?:R|A|Respuesta)\s*[:.)-]\s*(.+)$/i);
    if (q) { current = { q: q[1], a: '' }; out.push(current); }
    else if (a && current) current.a += (current.a ? ' ' : '') + a[1];
    else if (current) current.a += (current.a ? ' ' : '') + line;
  }
  return out.filter((f) => f.a);
}
function videoEmbed(url) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

function load(req, res, next) {
  const product = products.bySlug(req.params.slug);
  if (!product) return null;
  const isAdmin = res.locals.currentUser && res.locals.currentUser.role === 'admin';
  if ((!product.is_active || product.is_archived) && !isAdmin) return null;
  return product;
}

exports.show = (req, res, next) => {
  const product = load(req, res, next);
  if (!product) return next();
  const user = res.locals.currentUser;
  const canDownload = user ? access.canDownload(user, product) : false;
  const hasMembership = user ? access.hasActiveMembership(user.id) : false;
  const owns = user ? access.userOwnsProduct(user.id, product.id) : false;
  if (!(user && user.role === 'admin')) products.incrementViews(product.id);
  const reviewSummary = reviews.summary(product.id);
  res.render('pages/product', {
    title: product.title,
    product,
    related: products.related(product, 4),
    canDownload,
    hasMembership,
    reviews: reviews.approvedForProduct(product.id),
    reviewSummary,
    bundles: bundles.forProduct(product.id),
    faq: parseFaq(product.faq),
    videoEmbed: videoEmbed(product.video_url),
    headExtra: seo.productJsonLd(product, settings.getAll(), reviewSummary) + '\n  ' + seo.metaTags({ title: product.title, description: product.short_description, image: product.images[0] ? product.images[0].path : null, url: `${res.locals.baseUrl}/producto/${product.slug}`, type: 'product' }),
    metaDescription: product.short_description,
    myReview: user ? reviews.byUserAndProduct(user.id, product.id) : null,
    canReview: Boolean(user && (owns || hasMembership || user.role === 'admin')),
  });
};

exports.preview = (req, res, next) => {
  const product = load(req, res, next);
  if (!product || !product.demo_url) return next();
  res.render('pages/preview', { title: `Demo: ${product.title}`, product, layout: false });
};
