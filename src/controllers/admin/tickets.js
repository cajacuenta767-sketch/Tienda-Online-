'use strict';
const tickets = require('../../models/tickets');
const users = require('../../models/users');
const emails = require('../../services/emails');
const v = require('../../utils/validate');

exports.index = (req, res) => {
  const status = ['open', 'answered', 'closed'].includes(req.query.status) ? req.query.status : '';
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  res.render('admin/tickets/index', { title: 'Tickets de soporte', result: tickets.list({ status, page }), status });
};
exports.show = (req, res, next) => {
  const t = tickets.byId(Number(req.params.id));
  if (!t) return next();
  res.render('admin/tickets/show', { title: `Ticket #${t.id}`, ticket: t, messages: tickets.messages(t.id) });
};
exports.reply = (req, res, next) => {
  const t = tickets.byId(Number(req.params.id));
  if (!t) return next();
  const body = v.str(req.body.body, 5000);
  if (body.length < 2) { req.flash('error', 'Escribe una respuesta.'); return res.redirect(`/admin/tickets/${t.id}`); }
  tickets.reply(t.id, { user_id: res.locals.currentUser.id, is_admin: true, body });
  if (req.body.close) tickets.setStatus(t.id, 'closed');
  const user = users.findById(t.user_id);
  if (user) emails.ticketReply({ user, ticket: t, message: body }).catch(() => {});
  req.flash('success', 'Respuesta enviada al cliente.');
  return res.redirect(`/admin/tickets/${t.id}`);
};
exports.setStatus = (req, res, next) => {
  const t = tickets.byId(Number(req.params.id));
  if (!t) return next();
  tickets.setStatus(t.id, ['open', 'answered', 'closed'].includes(req.body.status) ? req.body.status : 'open');
  return res.redirect(`/admin/tickets/${t.id}`);
};
