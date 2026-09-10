'use strict';
const categories = require('../../models/categories');
const v = require('../../utils/validate');

exports.index = (req, res) => {
  res.render('admin/categories/index', { title: 'Categorías', categories: categories.all() });
};
exports.create = (req, res) => {
  const name = v.str(req.body.name, 100);
  if (!name) { req.flash('error', 'El nombre es obligatorio.'); return res.redirect('/admin/categorias'); }
  categories.create({ name, slug: v.str(req.body.slug, 100), description: v.str(req.body.description, 300), sort_order: Number(req.body.sort_order) || 0 });
  req.flash('success', 'Categoría creada.');
  return res.redirect('/admin/categorias');
};
exports.update = (req, res, next) => {
  const cat = categories.byId(Number(req.params.id));
  if (!cat) return next();
  const name = v.str(req.body.name, 100);
  if (!name) { req.flash('error', 'El nombre es obligatorio.'); return res.redirect('/admin/categorias'); }
  categories.update(cat.id, { name, slug: v.str(req.body.slug, 100), description: v.str(req.body.description, 300), sort_order: Number(req.body.sort_order) || 0 });
  req.flash('success', 'Categoría actualizada.');
  return res.redirect('/admin/categorias');
};
exports.destroy = (req, res, next) => {
  const cat = categories.byId(Number(req.params.id));
  if (!cat) return next();
  categories.remove(cat.id);
  req.flash('success', 'Categoría eliminada (los productos quedan sin categoría).');
  res.redirect('/admin/categorias');
};
