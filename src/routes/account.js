'use strict';
const { Router } = require('express');
const account = require('../controllers/account');
const checkout = require('../controllers/checkout');
const csrf = require('../middleware/csrf');
const { requireLogin } = require('../middleware/auth');

const r = Router();
r.get('/cuenta', requireLogin, account.dashboard);
r.post('/cuenta/password', requireLogin, csrf.verify, account.changePassword);
r.get('/pedidos/:id', requireLogin, account.order);
r.post('/pedidos/:id/cancelar', requireLogin, csrf.verify, account.cancelOrder);
r.post('/pedidos/:id/reintentar', requireLogin, csrf.verify, checkout.retry);
r.get('/descargar/:productId', requireLogin, account.download);

module.exports = r;
