'use strict';
const { Router } = require('express');
const account = require('../controllers/account');
const checkout = require('../controllers/checkout');
const csrf = require('../middleware/csrf');
const { requireLogin } = require('../middleware/auth');
const tickets = require('../controllers/tickets');

const r = Router();
r.get('/cuenta', requireLogin, account.dashboard);
r.post('/cuenta/password', requireLogin, csrf.verify, account.changePassword);
r.get('/pedidos/:id', requireLogin, account.order);
r.post('/pedidos/:id/cancelar', requireLogin, csrf.verify, account.cancelOrder);
r.post('/pedidos/:id/reintentar', requireLogin, csrf.verify, checkout.retry);
r.get('/descargar/:productId', requireLogin, account.download);
r.get('/d/:token', account.downloadSigned);
r.post('/cuenta/perfil', requireLogin, csrf.verify, account.updateProfile);
r.get('/cuenta/tickets', requireLogin, tickets.index);
r.post('/cuenta/tickets', requireLogin, csrf.verify, tickets.create);
r.get('/cuenta/tickets/:id', requireLogin, tickets.show);
r.post('/cuenta/tickets/:id/responder', requireLogin, csrf.verify, tickets.reply);
r.post('/cuenta/tickets/:id/cerrar', requireLogin, csrf.verify, tickets.close);

module.exports = r;
