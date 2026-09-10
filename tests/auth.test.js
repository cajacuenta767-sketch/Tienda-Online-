'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildApp, Session, request } = require('./helpers');

const app = buildApp();

test('registro crea sesión y redirige a /cuenta', async () => {
  const s = new Session(app);
  const res = await s.register('Usuario Test', 'user1@test.local', 'clave-segura-1');
  assert.equal(res.status, 302);
  assert.equal(res.headers.location, '/cuenta');
  const cuenta = await s.get('/cuenta');
  assert.equal(cuenta.status, 200);
  assert.match(cuenta.text, /Usuario Test/);
});

test('registro con contraseña corta muestra error', async () => {
  const s = new Session(app);
  const res = await s.register('Corto', 'corto@test.local', '123');
  assert.equal(res.status, 422);
  assert.match(res.text, /al menos 8 caracteres/);
});

test('login con contraseña incorrecta → 401 con mensaje', async () => {
  const s = new Session(app);
  const res = await s.login('user1@test.local', 'incorrecta');
  assert.equal(res.status, 401);
  assert.match(res.text, /Correo o contraseña incorrectos/);
});

test('login correcto → /cuenta y logout cierra sesión', async () => {
  const s = new Session(app);
  const res = await s.login('user1@test.local', 'clave-segura-1');
  assert.equal(res.status, 302);
  assert.equal((await s.get('/cuenta')).status, 200);
  const out = await s.post('/logout', {}, { csrfFrom: '/cuenta' });
  assert.equal(out.status, 302);
  assert.equal((await s.get('/cuenta')).status, 302);
});

test('usuario normal no accede al admin (403)', async () => {
  const s = new Session(app);
  await s.login('user1@test.local', 'clave-segura-1');
  const res = await s.get('/admin');
  assert.equal(res.status, 403);
});

test('admin desde .env accede al panel y a todas sus secciones', async () => {
  const s = new Session(app);
  const login = await s.login('admin@test.local', 'admin-test-123');
  assert.equal(login.status, 302);
  for (const url of ['/admin', '/admin/productos', '/admin/productos/nuevo', '/admin/productos/1/editar', '/admin/categorias', '/admin/planes', '/admin/pedidos', '/admin/usuarios', '/admin/ajustes', '/admin/mensajes']) {
    const res = await s.get(url);
    assert.equal(res.status, 200, `${url} → ${res.status}`);
  }
});

test('el formulario de contacto guarda el mensaje y el admin lo ve', async () => {
  const s = new Session(app);
  const res = await s.post('/contacto', { name: 'Ana', email: 'ana@test.local', subject: 'Cotización', message: 'Hola, quiero un sistema.' }, { csrfFrom: '/contacto' });
  assert.equal(res.status, 302);
  const admin = new Session(app);
  await admin.login('admin@test.local', 'admin-test-123');
  const list = await admin.get('/admin/mensajes');
  assert.match(list.text, /Cotización/);
});

test('el admin puede crear y editar un producto sin archivos', async () => {
  const admin = new Session(app);
  await admin.login('admin@test.local', 'admin-test-123');
  const created = await admin.post('/admin/productos/nuevo', {
    title: 'Producto de prueba', price: '12.50', discount_price: '9.99', short_description: 'Corta', long_description: 'Larga', features: 'A\nB', tags: 'Test, Node', version: '1.0.0', is_active: '1',
  }, { csrfFrom: '/admin/productos/nuevo' });
  assert.equal(created.status, 302);
  assert.match(created.headers.location, /\/admin\/productos\/\d+\/editar/);
  const pub = await request(app).get('/producto/producto-de-prueba');
  assert.equal(pub.status, 200);
  assert.match(pub.text, /\$9\.99/);
  assert.match(pub.text, /#Node/);
});
