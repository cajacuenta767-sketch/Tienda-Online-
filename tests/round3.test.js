'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildApp, Session, request } = require('./helpers');

const app = buildApp();
const { getDb } = require('../src/db');

async function admin() { const s = new Session(app); await s.login('admin@test.local', 'admin-test-123'); return s; }
async function newUser(email) { const s = new Session(app); await s.register('Cliente R3', email, 'clave-segura-1'); return s; }
function orderIdFrom(location) { return Number(String(location).split('/').pop()); }
const lastEmail = (kind) => getDb().prepare(kind ? "SELECT * FROM emails WHERE kind = ? ORDER BY id DESC LIMIT 1" : 'SELECT * FROM emails ORDER BY id DESC LIMIT 1').get(...(kind ? [kind] : []));

test('el registro envía correo de verificación y el enlace verifica la cuenta', async () => {
  const s = await newUser('verify@test.local');
  const mail = lastEmail('verify_email');
  assert.ok(mail && mail.to_email === 'verify@test.local');
  assert.equal(mail.status, 'outbox', 'sin SMTP queda en la bandeja interna');
  const token = mail.body_html.match(/\/verificar\/([a-f0-9]+)/)[1];
  const res = await s.get(`/verificar/${token}`);
  assert.equal(res.status, 302);
  const user = require('../src/models/users').findByEmail('verify@test.local');
  assert.ok(user.verified_at);
  const again = await s.get(`/verificar/${token}`);
  assert.equal(again.headers.location, '/login', 'un token usado ya no vale');
});

test('recuperar contraseña: correo con enlace, restablecer y entrar con la nueva', async () => {
  await newUser('reset@test.local');
  const s = new Session(app);
  const req = await s.post('/recuperar', { email: 'reset@test.local' }, { csrfFrom: '/recuperar' });
  assert.equal(req.status, 302);
  const mail = lastEmail('password_reset');
  const token = mail.body_html.match(/\/restablecer\/([a-f0-9]+)/)[1];
  const form = await s.get(`/restablecer/${token}`);
  assert.equal(form.status, 200);
  const done = await s.post(`/restablecer/${token}`, { password: 'nueva-clave-123', password_confirm: 'nueva-clave-123' }, { csrfFrom: `/restablecer/${token}` });
  assert.equal(done.status, 302);
  const login = await s.login('reset@test.local', 'nueva-clave-123');
  assert.equal(login.headers.location, '/cuenta');
  const anon = new Session(app);
  const unknown = await anon.post('/recuperar', { email: 'nadie@test.local' }, { csrfFrom: '/recuperar' });
  assert.equal(unknown.status, 302, 'no revela si el correo existe');
});

test('paquete: checkout prorratea, al pagar crea licencias, envía correo y descarga con enlace firmado', async () => {
  const s = await newUser('bundle@test.local');
  const bundles = require('../src/models/bundles');
  const b = bundles.create({ name: 'Dúo test', slug: 'duo-test', description: '', price_cents: 12000, is_active: 1 }, [1, 2]);
  const page = await s.get(`/paquetes/${b.slug}`);
  assert.equal(page.status, 200);
  const checkout = await s.get('/pagar?paquete=duo-test');
  assert.match(checkout.text, /paquete Dúo test/);
  assert.match(checkout.text, /\$120\.00/);
  const create = await s.post('/pago/btc/crear', { paquete: 'duo-test' }, { csrfFrom: '/pagar?paquete=duo-test' });
  const orderId = orderIdFrom(create.headers.location);
  assert.equal(lastEmail('order_received').to_email, 'bundle@test.local');
  const orders = require('../src/models/orders');
  const order = orders.byId(orderId);
  assert.equal(order.amount_cents, 12000);
  assert.equal(order.bundle_id, b.id);
  assert.equal(orders.items(orderId).reduce((t, i) => t + i.unit_cents, 0), 12000);

  const a = await admin();
  await a.post(`/admin/pedidos/${orderId}/marcar-pagado`, {}, { csrfFrom: `/admin/pedidos/${orderId}` });
  const licenses = require('../src/models/licenses').forOrder(orderId);
  assert.equal(licenses.length, 2);
  assert.match(licenses[0].key, /^DM-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
  const paidMail = lastEmail('order_paid');
  assert.match(paidMail.body_html, new RegExp(licenses[0].key));

  const redirect = await s.get('/descargar/1');
  assert.equal(redirect.status, 302);
  assert.match(redirect.headers.location, /^\/d\//);
  const dl = await s.get(redirect.headers.location);
  assert.equal(dl.status, 200);
  assert.match(dl.headers['content-type'], /zip/);
  const tampered = await request(app).get('/d/abc.def');
  assert.equal(tampered.status, 410);
  const account = await s.get('/cuenta?tab=licencias');
  assert.match(account.text, new RegExp(licenses[1].key));
});

test('API de licencias: valida, registra dominio y respeta el máximo de activaciones', async () => {
  const licenses = require('../src/models/licenses');
  const lic = licenses.create({ user_id: 1, product_id: 1, order_id: null, max_activations: 1 });
  const ok = await request(app).post('/api/licencias/validar').send({ key: lic.key, product: 'sistema-inventario-ventas', domain: 'https://cliente.com/admin' });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.valid, true);
  assert.equal(ok.body.activations, 1);
  const same = await request(app).post('/api/licencias/validar').send({ key: lic.key, product: 'sistema-inventario-ventas', domain: 'cliente.com' });
  assert.equal(same.body.valid, true, 'el mismo dominio no consume otra activación');
  const other = await request(app).post('/api/licencias/validar').send({ key: lic.key, product: 'sistema-inventario-ventas', domain: 'otro.com' });
  assert.equal(other.status, 403);
  assert.equal(other.body.reason, 'max_activations');
  const wrong = await request(app).post('/api/licencias/validar').send({ key: lic.key, product: 'otro-producto' });
  assert.equal(wrong.body.reason, 'product_mismatch');
  licenses.setStatus(lic.id, 'revoked');
  const revoked = await request(app).post('/api/licencias/validar').send({ key: lic.key });
  assert.equal(revoked.body.reason, 'revoked');
  const missing = await request(app).post('/api/licencias/validar').send({ key: 'DM-0000-0000-0000-0000' });
  assert.equal(missing.body.reason, 'not_found');
});

test('tickets: el cliente abre, el admin responde por correo y el cliente lo ve', async () => {
  const s = await newUser('ticket@test.local');
  const created = await s.post('/cuenta/tickets', { subject: 'Error al instalar', body: 'Sale un error 500 al abrir el instalador.' }, { csrfFrom: '/cuenta/tickets' });
  assert.equal(created.status, 302);
  const id = Number(created.headers.location.split('/').pop());
  assert.equal(lastEmail('admin_notice').subject.includes('#' + id), true);
  const a = await admin();
  const list = await a.get('/admin/tickets?status=open');
  assert.match(list.text, /Error al instalar/);
  await a.post(`/admin/tickets/${id}/responder`, { body: 'Activa mod_rewrite y vuelve a probar.' }, { csrfFrom: `/admin/tickets/${id}` });
  assert.equal(lastEmail('ticket_reply').to_email, 'ticket@test.local');
  const view = await s.get(`/cuenta/tickets/${id}`);
  assert.match(view.text, /mod_rewrite/);
  assert.match(view.text, /Respondido/);
  const other = await newUser('intruso@test.local');
  assert.equal((await other.get(`/cuenta/tickets/${id}`)).status, 404);
  await s.post(`/cuenta/tickets/${id}/cerrar`, {}, { csrfFrom: `/cuenta/tickets/${id}` });
  assert.equal(require('../src/models/tickets').byId(id).status, 'closed');
});

test('gestión de clientes: otorgar producto gratis, bloquear y desbloquear', async () => {
  const s = await newUser('cliente@test.local');
  const users = require('../src/models/users');
  const u = users.findByEmail('cliente@test.local');
  const a = await admin();
  assert.equal((await a.get(`/admin/usuarios/${u.id}`)).status, 200);
  await a.post(`/admin/usuarios/${u.id}/otorgar`, { product_id: 3, note: 'cortesía' }, { csrfFrom: `/admin/usuarios/${u.id}` });
  assert.equal(require('../src/services/access').userOwnsProduct(u.id, 3), true);
  assert.equal(lastEmail('access_granted').to_email, 'cliente@test.local');
  assert.equal((await s.get('/descargar/3')).status, 302);
  await a.post(`/admin/usuarios/${u.id}/bloquear`, {}, { csrfFrom: `/admin/usuarios/${u.id}` });
  assert.equal((await s.get('/descargar/3')).status, 403);
  const login = new Session(app);
  const res = await login.login('cliente@test.local', 'clave-segura-1');
  assert.equal(res.status, 401);
  assert.match(res.text, /bloqueada/);
  await a.post(`/admin/usuarios/${u.id}/bloquear`, {}, { csrfFrom: `/admin/usuarios/${u.id}` });
  assert.equal((await s.get('/descargar/3')).status, 302);
});

test('papelera: archivar oculta el producto, restaurar lo devuelve', async () => {
  const a = await admin();
  await a.post('/admin/productos/2/archivar', {}, { csrfFrom: '/admin/productos' });
  assert.equal((await request(app).get('/producto/facturafacil-facturacion-electronica')).status, 404);
  assert.doesNotMatch((await request(app).get('/tienda')).text, /FacturaFácil/);
  assert.match((await a.get('/admin/productos?papelera=1')).text, /FacturaFácil/);
  await a.post('/admin/productos/2/restaurar', {}, { csrfFrom: '/admin/productos?papelera=1' });
  assert.equal((await request(app).get('/producto/facturafacil-facturacion-electronica')).status, 200);
});

test('nueva versión avisa por correo a los compradores', async () => {
  const a = await admin();
  const before = getDb().prepare("SELECT COUNT(*) AS c FROM emails WHERE kind = 'new_version'").get().c;
  await a.post('/admin/productos/1/changelog', { version: '9.9.9', notes: 'Cambios', released_at: '2026-09-10', update_version: '1', notify: '1' }, { csrfFrom: '/admin/productos/1/editar' });
  const after = getDb().prepare("SELECT COUNT(*) AS c FROM emails WHERE kind = 'new_version'").get().c;
  assert.ok(after > before, 'se enviaron avisos a quienes compraron el producto 1');
  assert.match((await request(app).get('/producto/sistema-inventario-ventas')).text, /v9\.9\.9/);
});

test('SEO: sitemap, robots, JSON-LD y Open Graph', async () => {
  const sm = await request(app).get('/sitemap.xml');
  assert.equal(sm.status, 200);
  assert.match(sm.headers['content-type'], /xml/);
  assert.match(sm.text, /\/producto\/sistema-inventario-ventas/);
  const rb = await request(app).get('/robots.txt');
  assert.match(rb.text, /Sitemap: .*\/sitemap\.xml/);
  assert.match(rb.text, /Disallow: \/admin/);
  const p = await request(app).get('/producto/sistema-inventario-ventas');
  assert.match(p.text, /application\/ld\+json/);
  assert.match(p.text, /"@type":"SoftwareApplication"/);
  assert.match(p.text, /og:image/);
  assert.match(p.text, /rel="canonical"/);
});

test('idioma inglés por parámetro y por cookie', async () => {
  const s = new Session(app);
  const en = await s.get('/?lang=en');
  assert.match(en.text, /Browse the shop/);
  assert.match(en.text, /<html lang="en">/);
  const sticky = await s.get('/tienda');
  assert.match(sticky.text, /<html lang="en">/, 'la cookie mantiene el idioma');
  const es = await s.get('/tienda?lang=es');
  assert.match(es.text, /Aplicar filtros/);
});

test('blog, paquetes y comparador responden', async () => {
  const posts = require('../src/models/posts');
  posts.create({ title: 'Guía de prueba', slug: 'guia-prueba', excerpt: 'Resumen', body: 'Cuerpo del artículo.', status: 'published' });
  posts.create({ title: 'Borrador oculto', slug: 'borrador-oculto', body: 'x', status: 'draft' });
  assert.match((await request(app).get('/blog')).text, /Guía de prueba/);
  assert.equal((await request(app).get('/blog/guia-prueba')).status, 200);
  assert.equal((await request(app).get('/blog/borrador-oculto')).status, 404);
  assert.equal((await request(app).get('/paquetes')).status, 200);
  const cmp = await request(app).get('/comparar?p=sistema-inventario-ventas,reservapro-citas-y-reservas');
  assert.equal(cmp.status, 200);
  assert.match(cmp.text, /compare-table/);
  assert.match(cmp.text, /ReservaPro/);
});

test('FAQ y vídeo del producto se renderizan desde el admin', async () => {
  const a = await admin();
  await a.post('/admin/productos/3/editar', { title: 'ReservaPro — Citas y Reservas', price: '99', is_active: '1', version: '1.8.0', category_id: '1', video_url: 'https://youtu.be/abcdef12345', faq: 'P: ¿Tiene demo?\nR: Sí, en la ficha.\nP: ¿Idiomas?\nR: Español e inglés.', package_contents: 'app/\n└── README.md', short_description: 'Agenda online.', long_description: 'Larga.' }, { csrfFrom: '/admin/productos/3/editar' });
  const page = await request(app).get('/producto/reservapro-citas-y-reservas');
  assert.match(page.text, /youtube-nocookie\.com\/embed\/abcdef12345/);
  assert.match(page.text, /¿Tiene demo\?/);
  assert.match(page.text, /class="tree"/);
});

test('métricas, correos y licencias del admin cargan; correos muestran la bandeja interna', async () => {
  const a = await admin();
  for (const url of ['/admin/metricas', '/admin/correos', '/admin/correos?status=outbox', '/admin/licencias', '/admin/blog', '/admin/paquetes', '/admin/tickets']) {
    const res = await a.get(url);
    assert.equal(res.status, 200, `${url} → ${res.status}`);
  }
  const mails = await a.get('/admin/correos');
  assert.match(mails.text, /SMTP no configurado/);
  const one = lastEmail();
  const show = await a.get(`/admin/correos/${one.id}`);
  assert.match(show.text, /email-preview/);
});

test('jobs: recordatorio de membresía y carrito abandonado se envían una sola vez', async () => {
  const db = getDb();
  const users = require('../src/models/users');
  const u = users.findByEmail('bundle@test.local');
  db.prepare("INSERT INTO memberships (user_id, plan_id, order_id, starts_at, ends_at, status) VALUES (?, 1, NULL, datetime('now','-28 days'), datetime('now','+2 days'), 'active')").run(u.id);
  db.prepare("INSERT INTO carts (user_id, items, updated_at) VALUES (?, '[1]', datetime('now','-30 hours')) ON CONFLICT(user_id) DO UPDATE SET items='[1]', updated_at=datetime('now','-30 hours'), reminded_at=NULL").run(u.id);
  const jobs = require('../scripts/jobs');
  const first = await jobs.run();
  assert.ok(first.avisos_vencimiento >= 1);
  assert.ok(first.carritos_recordados >= 1);
  const second = await jobs.run();
  assert.equal(second.avisos_vencimiento, 0);
  assert.equal(second.carritos_recordados, 0);
  assert.equal(lastEmail('cart_reminder').to_email, 'bundle@test.local');
  assert.match(lastEmail('cart_reminder').body_html, /BIENVENIDO10/);
});
