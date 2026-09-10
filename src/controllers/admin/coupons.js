'use strict';
const coupons = require('../../models/coupons');
const { parseToCents } = require('../../utils/money');
const v = require('../../utils/validate');

function formData(body) {
  const type = body.type === 'fixed' ? 'fixed' : 'percent';
  return {
    code: v.str(body.code, 40),
    type,
    value: type === 'fixed' ? (parseToCents(body.value) ?? 0) : (parseInt(body.value, 10) || 0),
    min_amount_cents: parseToCents(body.min_amount) ?? 0,
    max_uses: body.max_uses ? parseInt(body.max_uses, 10) : null,
    applies_to: body.applies_to,
    expires_at: v.str(body.expires_at, 10) || null,
    is_active: Boolean(body.is_active),
  };
}
function validate(d) {
  const errors = [];
  if (!d.code) errors.push('El código es obligatorio.');
  if (!d.value) errors.push('El valor debe ser mayor que cero.');
  if (d.type === 'percent' && d.value > 100) errors.push('El porcentaje no puede superar 100.');
  return errors;
}
exports.index = (req, res) => {
  res.render('admin/coupons/index', { title: 'Cupones', coupons: coupons.all() });
};
exports.newForm = (req, res) => {
  res.render('admin/coupons/form', { title: 'Nuevo cupón', coupon: null, form: { type: 'percent', applies_to: 'all', is_active: 1 }, errors: [] });
};
exports.create = (req, res) => {
  const data = formData(req.body);
  const errors = validate(data);
  if (!errors.length && coupons.byCode(data.code)) errors.push('Ya existe un cupón con ese código.');
  if (errors.length) return res.status(422).render('admin/coupons/form', { title: 'Nuevo cupón', coupon: null, form: data, errors });
  const c = coupons.create(data);
  req.flash('success', `Cupón ${c.code} creado.`);
  return res.redirect('/admin/cupones');
};
exports.editForm = (req, res, next) => {
  const c = coupons.byId(Number(req.params.id));
  if (!c) return next();
  res.render('admin/coupons/form', { title: `Editar cupón ${c.code}`, coupon: c, form: c, errors: [] });
};
exports.update = (req, res, next) => {
  const c = coupons.byId(Number(req.params.id));
  if (!c) return next();
  const data = formData(req.body);
  const errors = validate(data);
  const dup = coupons.byCode(data.code);
  if (!errors.length && dup && dup.id !== c.id) errors.push('Ya existe un cupón con ese código.');
  if (errors.length) return res.status(422).render('admin/coupons/form', { title: `Editar cupón ${c.code}`, coupon: c, form: data, errors });
  coupons.update(c.id, data);
  req.flash('success', 'Cupón actualizado.');
  return res.redirect('/admin/cupones');
};
exports.destroy = (req, res, next) => {
  const c = coupons.byId(Number(req.params.id));
  if (!c) return next();
  coupons.remove(c.id);
  req.flash('success', 'Cupón eliminado.');
  res.redirect('/admin/cupones');
};
