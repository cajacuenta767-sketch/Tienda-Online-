'use strict';
const plans = require('../models/plans');
const products = require('../models/products');
const contactMessages = require('../models/contactMessages');
const v = require('../utils/validate');

exports.subscription = (req, res) => {
  res.render('pages/subscription', { title: 'Membresía', plans: plans.all({ activeOnly: true }), productCount: products.stats().active });
};
exports.about = (req, res) => {
  res.render('pages/about', { title: 'Quiénes somos', stats: products.stats() });
};
exports.contact = (req, res) => {
  res.render('pages/contact', { title: 'Contacto', form: {} });
};
exports.contactSubmit = (req, res) => {
  const form = {
    name: v.str(req.body.name, 120),
    email: v.str(req.body.email, 160),
    subject: v.str(req.body.subject, 160),
    message: v.str(req.body.message, 4000),
  };
  const errors = [];
  v.required(form.name, 'El nombre', errors);
  v.email(form.email, errors);
  v.required(form.message, 'El mensaje', errors);
  if (req.body.website) errors.push('Envío no válido.'); // honeypot
  if (errors.length) {
    return res.status(422).render('pages/contact', { title: 'Contacto', form, errors });
  }
  contactMessages.create(form);
  req.flash('success', 'Mensaje enviado. Te responderemos a la brevedad.');
  return res.redirect('/contacto');
};
exports.terms = (req, res) => {
  res.render('pages/terms', { title: 'Términos y licencias' });
};
