'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildApp, Session, request } = require('./helpers');

const app = buildApp();

async function admin() { const s = new Session(app); await s.login('admin@test.local', 'admin-test-123'); return s; }
async function newUser(email) { const s = new Session(app); await s.register('Cliente', email, 'clave-segura-1'); return s; }
function orderIdFrom(location) { return Number(String(location).split('/').pop()); }

test('búsqueda instantánea devuelve sugerencias en JSON', async () => {
  const res = await request(app).get('/api/buscar?q=inv').set('Accept', 'application/json');
  assert.equal(res.status, 200);
  assert.ok(res.body.items.length >= 1);
  assert.equal(res.body.items[0].slug, 'sistema-inventario-ventas');
  assert.match(res.body.more, /\/tienda\?q=inv/);
  const short = await request(app).get('/api/buscar?q=i');
  assert.deepEqual(short.body.items, []);
});

test('filtros avanzados de la tienda: precio, tecnología, oferta y orden por valoración', async () => {
  const cheap = await request(app).get('/tienda?max=50');
  assert.equal(cheap.status, 200);
  assert.doesNotMatch(cheap.text, /Sistema de Inventario y Ventas/);
  const php = await request(app).get('/tienda?tech=php');
  assert.match(php.text, /Sistema de Inventario y Ventas/);
  const offers = await request(app).get('/tienda?oferta=1&sort=rating');
  assert.equal(offers.status, 200);
  assert.match(offers.text, /-40%/);
  assert.doesNotMatch(offers.text, /FacturaFácil/);
});

test('favoritos: visitante en sesión, fusión al iniciar sesión y página de favoritos', async () => {
  const s = new Session(app);
  const token = await s.csrf('/tienda');
  const toggle = await request(app).post('/favoritos/2').set('Cookie', s.cookie).set('X-CSRF-Token', token).set('Accept', 'application/json').send({});
  assert.equal(toggle.status, 200);
  assert.deepEqual(toggle.body, { added: true, count: 1 });
  let page = await s.get('/favoritos');
  assert.match(page.text, /FacturaFácil/);

  await s.register('Fan', 'fan@test.local', 'clave-segura-1');
  page = await s.get('/favoritos');
  assert.match(page.text, /FacturaFácil/, 'los favoritos de sesión se fusionan con la cuenta');
  const product = await s.get('/producto/facturafacil-facturacion-electronica');
  assert.match(product.text, /fav-btn fav-btn--lg is-active/);

  const off = await s.post('/favoritos/2', {}, { csrfFrom: '/favoritos' });
  assert.equal(off.status, 302);
  page = await s.get('/favoritos');
  assert.match(page.text, /Aún no tienes favoritos/);
});

test('cupones: aplicar, rechazar inválido, descuento en el pedido y conteo de usos', async () => {
  const s = await newUser('coupon@test.local');
  const bad = await s.post('/pagar/cupon', { producto: 'sistema-inventario-ventas', code: 'NOEXISTE' }, { csrfFrom: '/pagar?producto=sistema-inventario-ventas' });
  assert.equal(bad.status, 302);
  let checkout = await s.get('/pagar?producto=sistema-inventario-ventas');
  assert.match(checkout.text, /El cupón no existe/);

  await s.post('/pagar/cupon', { producto: 'sistema-inventario-ventas', code: 'bienvenido10' }, { csrfFrom: '/pagar?producto=sistema-inventario-ventas' });
  checkout = await s.get('/pagar?producto=sistema-inventario-ventas');
  assert.match(checkout.text, /BIENVENIDO10 aplicado/);
  assert.match(checkout.text, /\$80\.10/);

  const create = await s.post('/pago/btc/crear', { producto: 'sistema-inventario-ventas' }, { csrfFrom: '/pagar?producto=sistema-inventario-ventas' });
  const orderId = orderIdFrom(create.headers.location);
  const orders = require('../src/models/orders');
  const order = orders.byId(orderId);
  assert.equal(order.coupon_code, 'BIENVENIDO10');
  assert.equal(order.discount_cents, 890);
  assert.equal(order.amount_cents, 8010);
  const orderPage = await s.get(`/pedidos/${orderId}`);
  assert.match(orderPage.text, /Cupón BIENVENIDO10/);

  const a = await admin();
  await a.post(`/admin/pedidos/${orderId}/marcar-pagado`, {}, { csrfFrom: `/admin/pedidos/${orderId}` });
  const coupons = require('../src/models/coupons');
  assert.equal(coupons.byCode('BIENVENIDO10').used_count, 1);
});

test('cupón con mínimo de compra y solo productos', async () => {
  const coupons = require('../src/models/coupons');
  const items = [{ item_type: 'plan', unit_cents: 9900, quantity: 1 }];
  const r = coupons.evaluate('DEV20', items);
  assert.equal(r.ok, false);
  assert.match(r.error, /no aplica/);
  const r2 = coupons.evaluate('DEV20', [{ item_type: 'product', unit_cents: 3000, quantity: 1 }]);
  assert.equal(r2.ok, false);
  assert.match(r2.error, /mínima/);
  const r3 = coupons.evaluate('DEV20', [{ item_type: 'product', unit_cents: 8900, quantity: 1 }]);
  assert.equal(r3.ok, true);
  assert.equal(r3.discount_cents, 1780);
});

test('reseñas: solo compradores, pendiente hasta aprobar, promedio en ficha y tarjetas', async () => {
  const s = await newUser('reviewer@test.local');
  const denied = await s.post('/producto/facturafacil-facturacion-electronica/resenas', { rating: 5, body: 'No compré este producto todavía.' }, { csrfFrom: '/producto/facturafacil-facturacion-electronica' });
  assert.equal(denied.status, 302);
  let page = await s.get('/producto/facturafacil-facturacion-electronica');
  assert.match(page.text, /Solo los clientes que compraron/);

  const create = await s.post('/pago/btc/crear', { producto: 'facturafacil-facturacion-electronica' }, { csrfFrom: '/pagar?producto=facturafacil-facturacion-electronica' });
  const orderId = orderIdFrom(create.headers.location);
  const a = await admin();
  await a.post(`/admin/pedidos/${orderId}/marcar-pagado`, {}, { csrfFrom: `/admin/pedidos/${orderId}` });

  const ok = await s.post('/producto/facturafacil-facturacion-electronica/resenas', { rating: 4, title: 'Muy útil', body: 'Facturo en segundos y los recordatorios funcionan.' }, { csrfFrom: '/producto/facturafacil-facturacion-electronica' });
  assert.equal(ok.status, 302);
  page = await s.get('/producto/facturafacil-facturacion-electronica');
  assert.match(page.text, /pendiente de revisión/);
  const pub = await request(app).get('/producto/facturafacil-facturacion-electronica');
  assert.doesNotMatch(pub.text, /Facturo en segundos/);

  const pending = await a.get('/admin/resenas?status=pending');
  assert.match(pending.text, /Facturo en segundos/);
  const reviews = require('../src/models/reviews');
  const users = require('../src/models/users');
  const mine = reviews.byUserAndProduct(users.findByEmail('reviewer@test.local').id, 2);
  await a.post(`/admin/resenas/${mine.id}/estado`, { status: 'approved' }, { csrfFrom: '/admin/resenas' });

  const after = await request(app).get('/producto/facturafacil-facturacion-electronica');
  assert.match(after.text, /Facturo en segundos/);
  assert.match(after.text, /4\.0/);
  const shop = await request(app).get('/tienda');
  assert.match(shop.text, /<strong>4\.0<\/strong> \(1\)/);
});

test('el admin crea, edita y elimina un cupón', async () => {
  const a = await admin();
  const created = await a.post('/admin/cupones/nuevo', { code: 'promo5', type: 'fixed', value: '5', applies_to: 'all', is_active: '1' }, { csrfFrom: '/admin/cupones/nuevo' });
  assert.equal(created.status, 302);
  const coupons = require('../src/models/coupons');
  const c = coupons.byCode('PROMO5');
  assert.ok(c);
  assert.equal(c.value, 500);
  const dup = await a.post('/admin/cupones/nuevo', { code: 'PROMO5', type: 'percent', value: '10', applies_to: 'all' }, { csrfFrom: '/admin/cupones/nuevo' });
  assert.equal(dup.status, 422);
  await a.post(`/admin/cupones/${c.id}/editar`, { code: 'PROMO5', type: 'percent', value: '15', applies_to: 'plans', is_active: '' }, { csrfFrom: `/admin/cupones/${c.id}/editar` });
  assert.equal(coupons.byId(c.id).value, 15);
  assert.equal(coupons.byId(c.id).is_active, 0);
  await a.post(`/admin/cupones/${c.id}/eliminar`, {}, { csrfFrom: '/admin/cupones' });
  assert.equal(coupons.byId(c.id), undefined);
});

test('el modo oscuro se aplica por atributo data-theme y el claro es el predeterminado', async () => {
  const res = await request(app).get('/');
  assert.match(res.text, /localStorage\.getItem\('dm-theme'\) === 'dark'/);
  assert.match(res.text, /data-theme-toggle/);
  const css = await request(app).get('/css/app.css');
  assert.match(css.text, /:root\[data-theme="dark"\]/);
  assert.match(css.text, /--primary: #2563EB/);
});
