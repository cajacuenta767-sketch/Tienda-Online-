'use strict';
const { Router } = require('express');
const csrf = require('../middleware/csrf');
const { requireAdmin } = require('../middleware/auth');
const { productUpload } = require('../services/uploads');
const dashboard = require('../controllers/admin/dashboard');
const products = require('../controllers/admin/products');
const categories = require('../controllers/admin/categories');
const plans = require('../controllers/admin/plans');
const orders = require('../controllers/admin/orders');
const users = require('../controllers/admin/users');
const settings = require('../controllers/admin/settings');
const messages = require('../controllers/admin/messages');

const r = Router();
r.use(requireAdmin);
r.use((req, res, next) => { res.locals.isAdminArea = true; next(); });

r.get('/', dashboard.index);

r.get('/productos', products.index);
r.get('/productos/nuevo', products.newForm);
r.post('/productos/nuevo', productUpload, csrf.verify, products.create);
r.get('/productos/:id/editar', products.editForm);
r.post('/productos/:id/editar', productUpload, csrf.verify, products.update);
r.post('/productos/:id/eliminar', csrf.verify, products.destroy);
r.post('/productos/:id/imagenes/ordenar', csrf.verify, products.reorderImages);
r.post('/productos/:id/imagenes/:imageId/eliminar', csrf.verify, products.deleteImage);
r.post('/productos/:id/changelog', csrf.verify, products.addChangelog);
r.post('/productos/:id/changelog/:entryId/eliminar', csrf.verify, products.deleteChangelog);

r.get('/categorias', categories.index);
r.post('/categorias', csrf.verify, categories.create);
r.post('/categorias/:id', csrf.verify, categories.update);
r.post('/categorias/:id/eliminar', csrf.verify, categories.destroy);

r.get('/planes', plans.index);
r.get('/planes/nuevo', plans.newForm);
r.post('/planes/nuevo', csrf.verify, plans.create);
r.get('/planes/:id/editar', plans.editForm);
r.post('/planes/:id/editar', csrf.verify, plans.update);
r.post('/planes/:id/eliminar', csrf.verify, plans.destroy);

r.get('/pedidos', orders.index);
r.get('/pedidos/:id', orders.show);
r.post('/pedidos/:id/marcar-pagado', csrf.verify, orders.markPaid);
r.post('/pedidos/:id/cancelar', csrf.verify, orders.cancel);

r.get('/usuarios', users.index);
r.post('/usuarios/:id/rol', csrf.verify, users.setRole);

r.get('/ajustes', settings.form);
r.post('/ajustes', csrf.verify, settings.save);

r.get('/mensajes', messages.index);
r.post('/mensajes/:id/leido', csrf.verify, messages.markRead);
r.post('/mensajes/:id/eliminar', csrf.verify, messages.destroy);

module.exports = r;
