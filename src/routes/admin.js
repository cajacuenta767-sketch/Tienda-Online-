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
const reviews = require('../controllers/admin/reviews');
const coupons = require('../controllers/admin/coupons');
const emailsCtl = require('../controllers/admin/emails');
const licensesCtl = require('../controllers/admin/licenses');
const ticketsCtl = require('../controllers/admin/tickets');
const customers = require('../controllers/admin/customers');
const postsCtl = require('../controllers/admin/posts');
const bundlesCtl = require('../controllers/admin/bundles');
const metrics = require('../controllers/admin/metrics');

const r = Router();
r.use(requireAdmin);
r.use((req, res, next) => { res.locals.isAdminArea = true; res.locals.adminBadges = { reviews: require('../models/reviews').pendingCount(), messages: require('../models/contactMessages').unreadCount(), tickets: require('../models/tickets').openCount() }; next(); });

r.get('/', dashboard.index);

r.get('/productos', products.index);
r.get('/productos/nuevo', products.newForm);
r.post('/productos/nuevo', productUpload, csrf.verify, products.create);
r.get('/productos/:id/editar', products.editForm);
r.post('/productos/:id/editar', productUpload, csrf.verify, products.update);
r.post('/productos/:id/eliminar', csrf.verify, products.destroy);
r.post('/productos/:id/archivar', csrf.verify, products.archive);
r.post('/productos/:id/restaurar', csrf.verify, products.restore);
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
r.get('/usuarios/:id', customers.show);
r.post('/usuarios/:id/rol', csrf.verify, users.setRole);
r.post('/usuarios/:id/bloquear', csrf.verify, customers.block);
r.post('/usuarios/:id/otorgar', csrf.verify, customers.grant);
r.post('/usuarios/:id/reenviar-acceso', csrf.verify, customers.resendAccess);
r.post('/usuarios/:id/reenviar-verificacion', csrf.verify, customers.resendVerification);
r.post('/usuarios/:id/verificar', csrf.verify, customers.verify);

r.get('/metricas', metrics.index);

r.get('/correos', emailsCtl.index);
r.get('/correos/:id', emailsCtl.show);
r.post('/correos/:id/reenviar', csrf.verify, emailsCtl.retry);

r.get('/licencias', licensesCtl.index);
r.post('/licencias/:id', csrf.verify, licensesCtl.update);

r.get('/tickets', ticketsCtl.index);
r.get('/tickets/:id', ticketsCtl.show);
r.post('/tickets/:id/responder', csrf.verify, ticketsCtl.reply);
r.post('/tickets/:id/estado', csrf.verify, ticketsCtl.setStatus);

r.get('/blog', postsCtl.index);
r.get('/blog/nuevo', postsCtl.newForm);
r.post('/blog/nuevo', productUpload, csrf.verify, postsCtl.create);
r.get('/blog/:id/editar', postsCtl.editForm);
r.post('/blog/:id/editar', productUpload, csrf.verify, postsCtl.update);
r.post('/blog/:id/eliminar', csrf.verify, postsCtl.destroy);

r.get('/paquetes', bundlesCtl.index);
r.get('/paquetes/nuevo', bundlesCtl.newForm);
r.post('/paquetes/nuevo', csrf.verify, bundlesCtl.create);
r.get('/paquetes/:id/editar', bundlesCtl.editForm);
r.post('/paquetes/:id/editar', csrf.verify, bundlesCtl.update);
r.post('/paquetes/:id/eliminar', csrf.verify, bundlesCtl.destroy);

r.get('/ajustes', settings.form);
r.post('/ajustes', csrf.verify, settings.save);

r.get('/resenas', reviews.index);
r.post('/resenas/:id/estado', csrf.verify, reviews.setStatus);
r.post('/resenas/:id/eliminar', csrf.verify, reviews.destroy);

r.get('/cupones', coupons.index);
r.get('/cupones/nuevo', coupons.newForm);
r.post('/cupones/nuevo', csrf.verify, coupons.create);
r.get('/cupones/:id/editar', coupons.editForm);
r.post('/cupones/:id/editar', csrf.verify, coupons.update);
r.post('/cupones/:id/eliminar', csrf.verify, coupons.destroy);

r.get('/mensajes', messages.index);
r.post('/mensajes/:id/leido', csrf.verify, messages.markRead);
r.post('/mensajes/:id/eliminar', csrf.verify, messages.destroy);

module.exports = r;
