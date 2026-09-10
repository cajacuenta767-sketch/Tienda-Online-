'use strict';
const bundles = require('../../models/bundles');
const products = require('../../models/products');
const { parseToCents } = require('../../utils/money');
const v = require('../../utils/validate');

function formData(body) {
  return { name: v.str(body.name, 120), slug: v.str(body.slug, 120), description: v.str(body.description, 1000), price_cents: parseToCents(body.price) ?? 0, is_active: Boolean(body.is_active), product_ids: [].concat(body.product_ids || []).map(Number).filter(Boolean) };
}
function validate(d) {
  const errors = [];
  if (!d.name) errors.push('El nombre es obligatorio.');
  if (d.product_ids.length < 2) errors.push('Elige al menos dos productos.');
  if (!d.price_cents) errors.push('Indica el precio del paquete.');
  return errors;
}
const allProducts = () => products.list({ perPage: 500, sort: 'name' }).rows;
exports.index = (req, res) => res.render('admin/bundles/index', { title: 'Paquetes', bundles: bundles.all() });
exports.newForm = (req, res) => res.render('admin/bundles/form', { title: 'Nuevo paquete', bundle: null, form: { is_active: 1, product_ids: [] }, allProducts: allProducts(), errors: [] });
exports.create = (req, res) => {
  const data = formData(req.body);
  const errors = validate(data);
  if (errors.length) return res.status(422).render('admin/bundles/form', { title: 'Nuevo paquete', bundle: null, form: data, allProducts: allProducts(), errors });
  const b = bundles.create(data, data.product_ids);
  req.flash('success', 'Paquete creado.');
  return res.redirect(`/admin/paquetes/${b.id}/editar`);
};
exports.editForm = (req, res, next) => {
  const b = bundles.byId(Number(req.params.id));
  if (!b) return next();
  res.render('admin/bundles/form', { title: `Editar: ${b.name}`, bundle: b, form: { ...b, product_ids: b.products.map((p) => p.id) }, allProducts: allProducts(), errors: [] });
};
exports.update = (req, res, next) => {
  const b = bundles.byId(Number(req.params.id));
  if (!b) return next();
  const data = formData(req.body);
  const errors = validate(data);
  if (errors.length) return res.status(422).render('admin/bundles/form', { title: `Editar: ${b.name}`, bundle: b, form: data, allProducts: allProducts(), errors });
  bundles.update(b.id, data, data.product_ids);
  req.flash('success', 'Paquete actualizado.');
  return res.redirect(`/admin/paquetes/${b.id}/editar`);
};
exports.destroy = (req, res, next) => {
  const b = bundles.byId(Number(req.params.id));
  if (!b) return next();
  bundles.remove(b.id);
  req.flash('success', 'Paquete eliminado.');
  return res.redirect('/admin/paquetes');
};
