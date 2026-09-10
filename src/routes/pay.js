'use strict';
const { Router } = require('express');
const checkout = require('../controllers/checkout');
const csrf = require('../middleware/csrf');
const { requireLogin } = require('../middleware/auth');

const r = Router();
r.get('/pagar', requireLogin, checkout.show);
r.post('/pagar/cupon', requireLogin, csrf.verify, checkout.applyCoupon);
r.get('/pago/whatsapp/:slug', checkout.whatsapp);
r.post('/pago/stripe/crear', requireLogin, csrf.verify, checkout.stripeCreate);
r.get('/pago/stripe/retorno', requireLogin, checkout.stripeReturn);
r.get('/pago/stripe/cancelar', requireLogin, checkout.stripeCancel);
r.post('/pago/paypal/crear', requireLogin, csrf.verify, checkout.paypalCreate);
r.post('/pago/paypal/capturar', requireLogin, csrf.verify, checkout.paypalCapture);
r.get('/pago/paypal/retorno', requireLogin, checkout.paypalReturn);
r.get('/pago/paypal/cancelar', requireLogin, checkout.paypalCancel);
r.post('/pago/btc/crear', requireLogin, csrf.verify, checkout.btcCreate);
r.get('/pago/btc/:orderId', requireLogin, checkout.btcShow);
r.post('/pago/btc/:orderId/confirmar', requireLogin, csrf.verify, checkout.btcConfirm);
r.post('/pago/culqi/crear', requireLogin, csrf.verify, checkout.culqiCreate);

module.exports = r;
