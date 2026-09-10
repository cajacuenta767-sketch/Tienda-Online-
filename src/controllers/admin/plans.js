'use strict';
const plans = require('../../models/plans');
const { parseToCents } = require('../../utils/money');
const v = require('../../utils/validate');

function formData(body) {
  return {
    name: v.str(body.name, 100),
    slug: v.str(body.slug, 100),
    description: v.str(body.description, 500),
    features: v.str(body.features, 3000),
    price_cents: parseToCents(body.price) ?? 0,
    currency: 'USD',
    duration_days: body.duration_days ? Number(body.duration_days) : null,
    is_active: Boolean(body.is_active),
    is_featured: Boolean(body.is_featured),
    sort_order: Number(body.sort_order) || 0,
  };
}
exports.index = (req, res) => {
  res.render('admin/plans/index', { title: 'Planes de membresía', plans: plans.all() });
};
exports.newForm = (req, res) => {
  res.render('admin/plans/form', { title: 'Nuevo plan', plan: null, form: { is_active: 1 }, errors: [] });
};
exports.create = (req, res) => {
  const data = formData(req.body);
  if (!data.name) return res.status(422).render('admin/plans/form', { title: 'Nuevo plan', plan: null, form: data, errors: ['El nombre es obligatorio.'] });
  const plan = plans.create(data);
  req.flash('success', 'Plan creado.');
  return res.redirect(`/admin/planes/${plan.id}/editar`);
};
exports.editForm = (req, res, next) => {
  const plan = plans.byId(Number(req.params.id));
  if (!plan) return next();
  res.render('admin/plans/form', { title: `Editar: ${plan.name}`, plan, form: plan, errors: [] });
};
exports.update = (req, res, next) => {
  const plan = plans.byId(Number(req.params.id));
  if (!plan) return next();
  const data = formData(req.body);
  if (!data.name) return res.status(422).render('admin/plans/form', { title: `Editar: ${plan.name}`, plan, form: data, errors: ['El nombre es obligatorio.'] });
  plans.update(plan.id, data);
  req.flash('success', 'Plan actualizado.');
  return res.redirect(`/admin/planes/${plan.id}/editar`);
};
exports.destroy = (req, res, next) => {
  const plan = plans.byId(Number(req.params.id));
  if (!plan) return next();
  plans.remove(plan.id);
  req.flash('success', 'Plan eliminado.');
  res.redirect('/admin/planes');
};
