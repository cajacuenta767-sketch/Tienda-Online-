'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildApp, request } = require('./helpers');

const app = buildApp();

const PUBLIC_200 = ['/', '/tienda', '/tienda?q=inventario&sort=price_asc', '/tienda/categoria/sistemas-web', '/etiqueta/php', '/nuevos', '/actualizaciones',
  '/producto/sistema-inventario-ventas', '/demo/sistema-inventario-ventas', '/membresia', '/nosotros', '/contacto', '/terminos', '/login', '/registro', '/carrito'];

for (const url of PUBLIC_200) {
  test(`GET ${url} responde 200`, async () => {
    const res = await request(app).get(url);
    assert.equal(res.status, 200, `${url} → ${res.status}`);
    assert.match(res.headers['content-type'], /text\/html/);
  });
}

test('la ficha de producto muestra título, precio y changelog', async () => {
  const res = await request(app).get('/producto/sistema-inventario-ventas');
  assert.match(res.text, /Sistema de Inventario y Ventas/);
  assert.match(res.text, /\$89\.00/);
  assert.match(res.text, /Historial de versiones/);
  assert.match(res.text, /v3\.2\.0/);
});

test('/health devuelve JSON', async () => {
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { ok: true });
});

test('producto inexistente → 404', async () => {
  const res = await request(app).get('/producto/no-existe');
  assert.equal(res.status, 404);
  assert.match(res.text, /Página no encontrada/);
});

for (const url of ['/cuenta', '/admin', '/descargar/1', '/pagar']) {
  test(`GET ${url} sin sesión redirige a /login`, async () => {
    const res = await request(app).get(url);
    assert.equal(res.status, 302);
    assert.match(res.headers.location, /^\/login\?next=/);
  });
}

test('los archivos de storage nunca se sirven', async () => {
  const res = await request(app).get('/storage/products/seed-sistema-inventario-ventas.zip');
  assert.equal(res.status, 404);
});

test('POST sin token CSRF es rechazado', async () => {
  const res = await request(app).post('/contacto').type('form').send({ name: 'x', email: 'x@x.io', message: 'hola' });
  assert.equal(res.status, 403);
});
