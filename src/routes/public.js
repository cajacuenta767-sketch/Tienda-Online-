'use strict';
const { Router } = require('express');
const home = require('../controllers/home');
const shop = require('../controllers/shop');
const product = require('../controllers/product');
const pages = require('../controllers/pages');
const csrf = require('../middleware/csrf');

const r = Router();
r.get('/', home.index);
r.get('/tienda', shop.index);
r.get('/tienda/categoria/:slug', shop.category);
r.get('/etiqueta/:slug', shop.tag);
r.get('/nuevos', shop.newReleases);
r.get('/actualizaciones', shop.updates);
r.get('/producto/:slug', product.show);
r.get('/demo/:slug', product.preview);
r.get('/membresia', pages.subscription);
r.get('/nosotros', pages.about);
r.get('/contacto', pages.contact);
r.post('/contacto', csrf.verify, pages.contactSubmit);
r.get('/terminos', pages.terms);
r.get('/health', (req, res) => res.json({ ok: true }));

module.exports = r;
