'use strict';
const mailer = require('../../services/mailer');

exports.index = (req, res) => {
  const status = ['queued', 'sent', 'failed', 'outbox'].includes(req.query.status) ? req.query.status : '';
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  res.render('admin/emails/index', { title: 'Correos', result: mailer.list({ status, page }), status, configured: mailer.isConfigured() });
};
exports.show = (req, res, next) => {
  const email = mailer.byId(Number(req.params.id));
  if (!email) return next();
  res.render('admin/emails/show', { title: email.subject, email });
};
exports.retry = async (req, res, next) => {
  const email = mailer.byId(Number(req.params.id));
  if (!email) return next();
  if (!mailer.isConfigured()) { req.flash('error', 'Configura SMTP en el .env para enviar correos.'); return res.redirect('/admin/correos'); }
  const r = await mailer.deliver(email.id);
  req.flash(r.delivered ? 'success' : 'error', r.delivered ? 'Correo enviado.' : `No se pudo enviar: ${r.error}`);
  return res.redirect('/admin/correos');
};
