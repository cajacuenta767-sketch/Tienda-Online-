'use strict';
const contactMessages = require('../../models/contactMessages');

exports.index = (req, res) => {
  res.render('admin/messages/index', { title: 'Mensajes', messages: contactMessages.list() });
};
exports.markRead = (req, res) => {
  contactMessages.markRead(Number(req.params.id));
  res.redirect('/admin/mensajes');
};
exports.destroy = (req, res) => {
  contactMessages.remove(Number(req.params.id));
  req.flash('success', 'Mensaje eliminado.');
  res.redirect('/admin/mensajes');
};
