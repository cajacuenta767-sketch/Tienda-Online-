'use strict';
const tickets = require('../models/tickets');
const products = require('../models/products');
const orders = require('../models/orders');
const emails = require('../services/emails');
const v = require('../utils/validate');

exports.index = (req, res) => {
  const user = res.locals.currentUser;
  const owned = products.byIds(orders.purchasedProductIds(user.id));
  res.render('account/tickets', { title: 'Soporte', tickets: tickets.forUser(user.id), owned });
};
exports.create = (req, res) => {
  const user = res.locals.currentUser;
  const subject = v.str(req.body.subject, 160);
  const body = v.str(req.body.body, 5000);
  const productId = req.body.product_id ? Number(req.body.product_id) : null;
  if (!subject || body.length < 10) {
    req.flash('error', 'Escribe un asunto y un mensaje de al menos 10 caracteres.');
    return res.redirect('/cuenta/tickets');
  }
  const t = tickets.create({ user_id: user.id, product_id: productId, subject, body });
  emails.adminNotice({ subject: `Nuevo ticket #${t.id}: ${subject}`, text: `${user.name} <${user.email}> escribió:\n\n${body}` }).catch(() => {});
  req.flash('success', `Ticket #${t.id} creado. Te responderemos por aquí y por correo.`);
  return res.redirect(`/cuenta/tickets/${t.id}`);
};
exports.show = (req, res, next) => {
  const t = tickets.byId(Number(req.params.id));
  const user = res.locals.currentUser;
  if (!t || (t.user_id !== user.id && user.role !== 'admin')) return next();
  res.render('account/ticket', { title: `Ticket #${t.id}`, ticket: t, messages: tickets.messages(t.id) });
};
exports.reply = (req, res, next) => {
  const t = tickets.byId(Number(req.params.id));
  const user = res.locals.currentUser;
  if (!t || t.user_id !== user.id) return next();
  const body = v.str(req.body.body, 5000);
  if (body.length < 2) { req.flash('error', 'Escribe un mensaje.'); return res.redirect(`/cuenta/tickets/${t.id}`); }
  tickets.reply(t.id, { user_id: user.id, is_admin: false, body });
  emails.adminNotice({ subject: `Respuesta en ticket #${t.id}: ${t.subject}`, text: `${user.name} escribió:\n\n${body}` }).catch(() => {});
  return res.redirect(`/cuenta/tickets/${t.id}`);
};
exports.close = (req, res, next) => {
  const t = tickets.byId(Number(req.params.id));
  const user = res.locals.currentUser;
  if (!t || t.user_id !== user.id) return next();
  tickets.setStatus(t.id, 'closed');
  req.flash('success', 'Ticket cerrado.');
  return res.redirect('/cuenta/tickets');
};
