'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { buildApp, Session, request } = require('./helpers');
const { createZip } = require('../scripts/lib/minizip');

const app = buildApp();
const PNG_1x1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

async function admin() {
  const s = new Session(app);
  await s.login('admin@test.local', 'admin-test-123');
  return s;
}

test('el admin sube un producto con dos imágenes y un ZIP, y el cliente con membresía lo descarga', async () => {
  const a = await admin();
  const token = await a.csrf('/admin/productos/nuevo');
  const zip = createZip([{ name: 'README.txt', data: 'hola' }]);
  const res = await request(app).post('/admin/productos/nuevo').set('Cookie', a.cookie)
    .field('_csrf', token).field('title', 'Subida Real').field('price', '25').field('short_description', 'Con archivos')
    .field('version', '2.0.0').field('is_active', '1').field('tags', 'Upload')
    .attach('images', PNG_1x1, { filename: 'captura-1.png', contentType: 'image/png' })
    .attach('images', PNG_1x1, { filename: 'captura-2.png', contentType: 'image/png' })
    .attach('zip', zip, { filename: 'subida-real.zip', contentType: 'application/zip' });
  assert.equal(res.status, 302, res.text);
  const editUrl = res.headers.location;
  const id = Number(editUrl.match(/\/admin\/productos\/(\d+)\/editar/)[1]);

  const edit = await a.get(editUrl);
  assert.equal(edit.status, 200);
  assert.match(edit.text, /subida-real\.zip/);
  assert.equal((edit.text.match(/class="image-tile"/g) || []).length, 2);

  const products = require('../src/models/products');
  const p = products.byId(id, { withRelations: true });
  assert.equal(p.images.length, 2);
  assert.ok(p.images.every((i) => i.path.startsWith('/uploads/') && i.path.endsWith('.png')));
  assert.ok(fs.existsSync(path.join(process.env.UPLOADS_DIR, path.basename(p.images[0].path))));
  assert.ok(fs.existsSync(path.join(process.env.STORAGE_DIR, p.file_name)));
  assert.notEqual(p.file_name, 'subida-real.zip', 'el nombre en disco debe ser aleatorio');

  const pub = await request(app).get('/producto/subida-real');
  assert.equal(pub.status, 200);
  assert.match(pub.text, new RegExp(p.images[0].path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  const img = await request(app).get(p.images[0].path);
  assert.equal(img.status, 200);
  assert.match(img.headers['content-type'], /image\/png/);

  const del = await a.post(`/admin/productos/${id}/imagenes/${p.images[1].id}/eliminar`, {}, { csrfFrom: editUrl });
  assert.equal(del.status, 302);
  assert.equal(products.byId(id, { withRelations: true }).images.length, 1);

  const destroy = await a.post(`/admin/productos/${id}/eliminar`, {}, { csrfFrom: '/admin/productos' });
  assert.equal(destroy.status, 302);
  assert.equal(products.byId(id), undefined);
  assert.ok(!fs.existsSync(path.join(process.env.STORAGE_DIR, p.file_name)), 'el ZIP se borra al eliminar el producto');
});

test('se rechazan SVG como imagen y archivos que no son ZIP', async () => {
  const a = await admin();
  const token = await a.csrf('/admin/productos/nuevo');
  const svg = await request(app).post('/admin/productos/nuevo').set('Cookie', a.cookie).set('Referer', 'http://localhost:3000/admin/productos/nuevo')
    .field('_csrf', token).field('title', 'Mal SVG').field('price', '1')
    .attach('images', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), { filename: 'x.svg', contentType: 'image/svg+xml' });
  assert.ok([302, 400].includes(svg.status), `status ${svg.status}`);
  const products = require('../src/models/products');
  assert.equal(products.bySlug('mal-svg'), undefined);

  const token2 = await a.csrf('/admin/productos/nuevo');
  const txt = await request(app).post('/admin/productos/nuevo').set('Cookie', a.cookie).set('Referer', 'http://localhost:3000/admin/productos/nuevo')
    .field('_csrf', token2).field('title', 'Mal ZIP').field('price', '1')
    .attach('zip', Buffer.from('no soy zip'), { filename: 'x.txt', contentType: 'text/plain' });
  assert.ok([302, 400].includes(txt.status), `status ${txt.status}`);
  assert.equal(products.bySlug('mal-zip'), undefined);
});
