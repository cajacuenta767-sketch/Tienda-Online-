'use strict';
const products = require('../models/products');
const categories = require('../models/categories');
const tags = require('../models/tags');
const changelog = require('../models/changelog');

function page(req) {
  const n = parseInt(req.query.page, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
function sort(req) {
  return products.SORTS[req.query.sort] ? req.query.sort : 'recent';
}
function renderGrid(req, res, { title, subtitle, filters, breadcrumb, activeCategory = null, activeTag = null }) {
  const q = String(req.query.q || '').trim().slice(0, 100);
  const result = products.list({ ...filters, q, sort: sort(req), page: page(req), perPage: 12 });
  res.render('pages/shop', {
    title,
    subtitle,
    breadcrumb,
    q,
    sort: sort(req),
    result,
    categories: categories.all(),
    activeCategory,
    activeTag,
    basePath: req.path,
  });
}

exports.index = (req, res) => {
  const q = String(req.query.q || '').trim();
  renderGrid(req, res, {
    title: q ? `Resultados para «${q}»` : 'Tienda',
    subtitle: q ? 'Sistemas, plantillas y scripts que coinciden con tu búsqueda.' : 'Todos los sistemas web, plantillas y scripts disponibles con código fuente.',
    filters: {},
    breadcrumb: [{ label: 'Tienda' }],
  });
};

exports.category = (req, res, next) => {
  const cat = categories.bySlug(req.params.slug);
  if (!cat) return next();
  renderGrid(req, res, {
    title: cat.name,
    subtitle: cat.description || `Todos los productos de la categoría ${cat.name}.`,
    filters: { categorySlug: cat.slug },
    breadcrumb: [{ label: 'Tienda', href: '/tienda' }, { label: cat.name }],
    activeCategory: cat.slug,
  });
};

exports.tag = (req, res, next) => {
  const tag = tags.bySlug(req.params.slug);
  if (!tag) return next();
  renderGrid(req, res, {
    title: `Etiqueta: ${tag.name}`,
    subtitle: `Productos etiquetados con «${tag.name}».`,
    filters: { tagSlug: tag.slug },
    breadcrumb: [{ label: 'Tienda', href: '/tienda' }, { label: tag.name }],
    activeTag: tag.slug,
  });
};

exports.newReleases = (req, res) => {
  const result = products.list({ isNew: true, sinceDays: 30, sort: 'recent', page: page(req), perPage: 12 });
  res.render('pages/new-releases', { title: 'Nuevos lanzamientos', result });
};

exports.updates = (req, res) => {
  const perPage = 20;
  const { rows, total } = changelog.recent({ page: page(req), perPage });
  const groups = [];
  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last && last.date === row.released_at) last.items.push(row);
    else groups.push({ date: row.released_at, items: [row] });
  }
  res.render('pages/updates', { title: 'Actualizaciones', groups, page: page(req), pages: Math.max(1, Math.ceil(total / perPage)), total });
};
