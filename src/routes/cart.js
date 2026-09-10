'use strict';
const { Router } = require('express');
const cart = require('../controllers/cart');
const csrf = require('../middleware/csrf');

const r = Router();
r.get('/carrito', cart.show);
r.post('/carrito/agregar/:productId', csrf.verify, cart.add);
r.post('/carrito/quitar/:productId', csrf.verify, cart.remove);
r.post('/carrito/vaciar', csrf.verify, cart.clear);

module.exports = r;
