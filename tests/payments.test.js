'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildApp, Session, request } = require('./helpers');

const app = buildApp();

async function newUser(email) {
  const s = new Session(app);
  await s.register('Comprador', email, 'clave-segura-1');
  return s;
}
async function admin() {
  const s = new Session(app);
  await s.login('admin@test.local', 'admin-test-123');
  return s;
}
function orderIdFrom(location) {
  return Number(String(location).split('/').pop());
}

test('WhatsApp redirige a wa.me con el mensaje prellenado', async () => {
  const res = await request(app).get('/pago/whatsapp/sistema-inventario-ventas');
  assert.equal(res.status, 302);
  assert.match(res.headers.location, /^https:\/\/wa\.me\/51999999999\?text=/);
  assert.match(decodeURIComponent(res.headers.location), /Sistema de Inventario y Ventas/);
});

test('el checkout lista los proveedores con su estado', async () => {
  const s = await newUser('pay1@test.local');
  const res = await s.get('/pagar?producto=sistema-inventario-ventas');
  assert.equal(res.status, 200);
  assert.match(res.text, /Pagar con Bitcoin/);
  assert.match(res.text, /No configurado/);
  assert.match(res.text, /Próximamente/);
});

test('Stripe sin clave redirige al checkout con aviso', async () => {
  const s = await newUser('pay2@test.local');
  const res = await s.post('/pago/stripe/crear', { producto: 'sistema-inventario-ventas' }, { csrfFrom: '/pagar?producto=sistema-inventario-ventas' });
  assert.equal(res.status, 302);
  const back = await s.get(res.headers.location);
  assert.match(back.text, /no está configurado/);
});

test('Culqi responde 503 "próximamente"', async () => {
  const s = await newUser('pay3@test.local');
  const res = await s.post('/pago/culqi/crear', { producto: 'sistema-inventario-ventas' }, { csrfFrom: '/pagar?producto=sistema-inventario-ventas' });
  assert.equal(res.status, 503);
});

test('flujo BTC completo: pedido → QR → "ya pagué" → admin confirma → descarga', async () => {
  const s = await newUser('pay4@test.local');
  const create = await s.post('/pago/btc/crear', { producto: 'sistema-inventario-ventas' }, { csrfFrom: '/pagar?producto=sistema-inventario-ventas' });
  assert.equal(create.status, 303);
  const orderId = orderIdFrom(create.headers.location);
  assert.ok(orderId > 0);

  const page = await s.get(`/pago/btc/${orderId}`);
  assert.equal(page.status, 200);
  assert.match(page.text, /data:image\/png;base64/);
  assert.match(page.text, /\d\.\d{8} BTC/);
  assert.match(page.text, /bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh/);

  assert.equal((await s.get('/descargar/1')).status, 403, 'sin pagar no descarga');

  const confirm = await s.post(`/pago/btc/${orderId}/confirmar`, { txid: 'abc123' }, { csrfFrom: `/pago/btc/${orderId}` });
  assert.equal(confirm.status, 302);
  const order = await s.get(`/pedidos/${orderId}`);
  assert.match(order.text, /Recibimos tu aviso de pago/);

  const a = await admin();
  const dash = await a.get('/admin');
  assert.match(dash.text, /Pagos manuales por confirmar/);
  const paid = await a.post(`/admin/pedidos/${orderId}/marcar-pagado`, { note: 'verificado' }, { csrfFrom: `/admin/pedidos/${orderId}` });
  assert.equal(paid.status, 302);
  assert.match((await a.get(`/admin/pedidos/${orderId}`)).text, /badge--status-paid/);

  const go = await s.get('/descargar/1');
  assert.equal(go.status, 302);
  assert.match(go.headers.location, /^\/d\//);
  const dl = await s.get(go.headers.location);
  assert.equal(dl.status, 200);
  assert.match(dl.headers['content-type'], /zip/);
  assert.match(dl.headers['content-disposition'], /sistema-inventario-ventas-v3\.2\.0\.zip/);
  assert.match((await s.get('/cuenta?tab=descargas')).text, /Descargar/);
});

test('membresía pagada da acceso a todo el catálogo', async () => {
  const s = await newUser('pay5@test.local');
  assert.equal((await s.get('/descargar/2')).status, 403);
  const create = await s.post('/pago/btc/crear', { plan: 'mensual' }, { csrfFrom: '/pagar?plan=mensual' });
  const orderId = orderIdFrom(create.headers.location);
  const a = await admin();
  await a.post(`/admin/pedidos/${orderId}/marcar-pagado`, {}, { csrfFrom: `/admin/pedidos/${orderId}` });
  const cuenta = await s.get('/cuenta?tab=membresia');
  assert.match(cuenta.text, /Plan Mensual/);
  const go2 = await s.get('/descargar/2');
  assert.equal(go2.status, 302);
  const dl = await s.get(go2.headers.location);
  assert.equal(dl.status, 200);
  assert.match(dl.headers['content-type'], /zip/);
});

test('marcar pagado es idempotente y no duplica membresías', async () => {
  const s = await newUser('pay6@test.local');
  const create = await s.post('/pago/btc/crear', { plan: 'anual' }, { csrfFrom: '/pagar?plan=anual' });
  const orderId = orderIdFrom(create.headers.location);
  const ordersService = require('../src/services/orders');
  const memberships = require('../src/models/memberships');
  const users = require('../src/models/users');
  ordersService.markPaid(orderId, {});
  ordersService.markPaid(orderId, {});
  const user = users.findByEmail('pay6@test.local');
  assert.equal(memberships.allForUser(user.id).length, 1);
});

test('un usuario no puede ver el pedido de otro', async () => {
  const s1 = await newUser('pay7@test.local');
  const create = await s1.post('/pago/btc/crear', { producto: 'sistema-inventario-ventas' }, { csrfFrom: '/pagar?producto=sistema-inventario-ventas' });
  const orderId = orderIdFrom(create.headers.location);
  const s2 = await newUser('pay8@test.local');
  assert.equal((await s2.get(`/pedidos/${orderId}`)).status, 404);
  assert.equal((await s2.get(`/pago/btc/${orderId}`)).status, 404);
});

test('el carrito agrupa productos y el checkout de carrito crea un pedido con varios ítems', async () => {
  const s = await newUser('pay9@test.local');
  await s.post('/carrito/agregar/1', {}, { csrfFrom: '/tienda' });
  await s.post('/carrito/agregar/2', {}, { csrfFrom: '/tienda' });
  const cart = await s.get('/carrito');
  assert.match(cart.text, /2 productos/);
  const create = await s.post('/pago/btc/crear', {}, { csrfFrom: '/pagar' });
  const orderId = orderIdFrom(create.headers.location);
  const order = await s.get(`/pedidos/${orderId}`);
  assert.match(order.text, /Sistema de Inventario y Ventas/);
  assert.match(order.text, /FacturaFácil/);
  assert.match((await s.get('/carrito')).text, /carrito está vacío/);
});
