'use strict';
const fs = require('fs');
const path = require('path');
const config = require('../src/config');
const { getDb } = require('../src/db');
const categoriesModel = require('../src/models/categories');
const productsModel = require('../src/models/products');
const imagesModel = require('../src/models/productImages');
const tagsModel = require('../src/models/tags');
const changelogModel = require('../src/models/changelog');
const plansModel = require('../src/models/plans');
const usersModel = require('../src/models/users');
const ordersModel = require('../src/models/orders');
const settingsModel = require('../src/models/settings');
const ordersService = require('../src/services/orders');
const reviewsModel = require('../src/models/reviews');
const couponsModel = require('../src/models/coupons');
const favoritesModel = require('../src/models/favorites');
const bundlesModel = require('../src/models/bundles');
const postsModel = require('../src/models/posts');
const { bootstrap } = require('../src/services/bootstrap');
const { screenshot } = require('./lib/svg');
const { createZip } = require('./lib/minizip');

const SEED_IMG_DIR = path.join(config.PUBLIC_DIR, 'img', 'seed');

const CATEGORIES = [
  { name: 'Sistemas Web', slug: 'sistemas-web', description: 'Aplicaciones completas con panel de administración, base de datos y código fuente.', sort_order: 1 },
  { name: 'Plantillas', slug: 'plantillas', description: 'Plantillas HTML/CSS y paneles de administración listos para personalizar.', sort_order: 2 },
  { name: 'Scripts', slug: 'scripts', description: 'Scripts y automatizaciones para tareas concretas: bots, scraping, integraciones.', sort_order: 3 },
];

const PRODUCTS = [
  {
    title: 'Sistema de Inventario y Ventas', slug: 'sistema-inventario-ventas', category: 'sistemas-web', variant: 'dashboard', seed: 3,
    short_description: 'POS completo con inventario en tiempo real, múltiples sucursales, facturación y reportes.',
    long_description: 'Sistema de punto de venta pensado para tiendas, minimarkets, ferreterías y farmacias. Controla inventario, compras y ventas por sucursal, con impresión de tickets y facturas personalizables.\n\nIncluye panel de administración con roles y permisos ilimitados, alertas de stock bajo, gestión de proveedores y reportes exportables a Excel y PDF.',
    features: 'Ventas rápidas con lector de código de barras\nInventario y kardex por sucursal\nFacturación con impuestos configurables (IGV / IVA)\nUsuarios y roles ilimitados\nReportes de ventas, utilidades y stock\nCaja: apertura, cierre y arqueo\nModo oscuro y diseño responsive',
    requirements: 'PHP 8.1 o superior\nMySQL 5.7+ / MariaDB\nApache o Nginx con mod_rewrite\nComposer', price: 14900, discount: 8900, demo_url: 'https://demo.devmarket.local/pos', version: '3.2.0', featured: 1, isNew: 0,
    tags: 'PHP, Laravel, MySQL, POS, Inventario',
    changelog: [
      { version: '3.2.0', notes: 'Nuevo módulo de cotizaciones y conversión a venta.\nMejoras de rendimiento en el listado de productos.', released_at: '2026-08-28' },
      { version: '3.1.0', notes: 'Soporte multi-moneda y tasa de cambio diaria.', released_at: '2026-07-10' },
      { version: '3.0.0', notes: 'Rediseño completo del panel y migración a Laravel 11.', released_at: '2026-05-02' },
    ],
  },
  {
    title: 'FacturaFácil — Facturación Electrónica', slug: 'facturafacil-facturacion-electronica', category: 'sistemas-web', variant: 'table', seed: 7,
    short_description: 'Emite boletas y facturas electrónicas, gestiona clientes y cobra con recordatorios automáticos.',
    long_description: 'FacturaFácil es un sistema de facturación para pequeñas y medianas empresas. Crea comprobantes en segundos, envíalos por correo o WhatsApp y lleva el control de cobros pendientes.\n\nPreparado para integrarse con proveedores de facturación electrónica mediante API.',
    features: 'Boletas, facturas, notas de crédito y débito\nEnvío por email y WhatsApp\nRecordatorios de cobro automáticos\nCatálogo de clientes y productos\nExportación a Excel\nMultiusuario con permisos',
    requirements: 'Node.js 18+\nPostgreSQL 13+\nServidor Linux (Ubuntu recomendado)', price: 9900, discount: null, demo_url: 'https://demo.devmarket.local/factura', version: '2.4.1', featured: 1, isNew: 0,
    tags: 'Node, Express, PostgreSQL, Facturación',
    changelog: [
      { version: '2.4.1', notes: 'Corrección al calcular descuentos por línea.', released_at: '2026-08-15' },
      { version: '2.4.0', notes: 'Plantillas de comprobante personalizables con logo.', released_at: '2026-06-20' },
    ],
  },
  {
    title: 'ReservaPro — Citas y Reservas', slug: 'reservapro-citas-y-reservas', category: 'sistemas-web', variant: 'dashboard', seed: 11,
    short_description: 'Agenda online para clínicas, salones, gimnasios y consultorios con recordatorios por WhatsApp.',
    long_description: 'Permite a tus clientes reservar desde una página pública mientras tú gestionas la agenda de cada profesional, los servicios, los horarios y los pagos anticipados.\n\nIncluye calendario semanal, bloqueo de horarios, lista de espera y estadísticas de ocupación.',
    features: 'Página pública de reservas\nCalendario por profesional\nRecordatorios por WhatsApp y email\nPagos anticipados opcionales\nHistorial por cliente\nPanel con métricas de ocupación',
    requirements: 'PHP 8.2\nMySQL 8\nCuenta de WhatsApp Business (opcional)', price: 12900, discount: 9900, demo_url: 'https://demo.devmarket.local/reservas', version: '1.8.0', featured: 1, isNew: 1,
    tags: 'PHP, MySQL, Reservas, WhatsApp',
    changelog: [
      { version: '1.8.0', notes: 'Lista de espera automática cuando se cancela una cita.', released_at: '2026-09-01' },
      { version: '1.7.0', notes: 'Bloqueo de horarios por profesional y feriados.', released_at: '2026-07-22' },
    ],
  },
  {
    title: 'Bot de WhatsApp para Pedidos', slug: 'bot-whatsapp-pedidos', category: 'scripts', variant: 'table', seed: 5,
    short_description: 'Bot que recibe pedidos por WhatsApp, muestra tu catálogo y envía el resumen a tu panel.',
    long_description: 'Automatiza la atención de tu negocio por WhatsApp: el bot muestra el menú o catálogo, arma el pedido con el cliente, calcula el total y te lo envía listo para preparar.\n\nFunciona con la API oficial de WhatsApp Cloud o con Baileys (multi-dispositivo).',
    features: 'Menú interactivo con botones y listas\nCarrito conversacional con totales\nNotificación al panel y a un grupo interno\nHorarios de atención y respuestas automáticas\nMultiidioma (es/en)\nFácil de personalizar en un solo archivo de configuración',
    requirements: 'Node.js 18+\nCuenta de WhatsApp Cloud API o número dedicado\nRedis (opcional para colas)', price: 5900, discount: null, demo_url: null, version: '2.0.3', featured: 1, isNew: 1,
    tags: 'Node, WhatsApp, Bot, Automatización',
    changelog: [
      { version: '2.0.3', notes: 'Compatibilidad con la última versión de la API de WhatsApp Cloud.', released_at: '2026-09-05' },
      { version: '2.0.0', notes: 'Reescritura con soporte para listas interactivas.', released_at: '2026-04-18' },
    ],
  },
  {
    title: 'AdminKit — Plantilla de Panel', slug: 'adminkit-plantilla-panel', category: 'plantillas', variant: 'dashboard', seed: 13,
    short_description: 'Plantilla HTML/CSS/JS para paneles de administración: 40+ páginas, gráficos, tablas y formularios.',
    long_description: 'AdminKit es una plantilla lista para conectar con cualquier backend. Incluye dashboard, tablas con búsqueda, formularios validados, gráficos, calendario, chat y páginas de autenticación.\n\nSin dependencias de frameworks pesados: HTML semántico, CSS moderno con variables y JavaScript vanilla.',
    features: '40+ páginas listas\nModo claro y oscuro\nGráficos con Chart.js\nTablas con orden y filtro\nComponentes de formulario validados\nIconos SVG incluidos',
    requirements: 'Cualquier servidor web estático\nNavegadores modernos', price: 3900, discount: 2900, demo_url: 'https://demo.devmarket.local/adminkit', version: '1.3.0', featured: 1, isNew: 0,
    tags: 'HTML, CSS, JavaScript, Plantilla, Dashboard',
    changelog: [
      { version: '1.3.0', notes: 'Nuevas páginas de facturación y perfil de usuario.', released_at: '2026-08-02' },
      { version: '1.2.0', notes: 'Modo oscuro y variables CSS para personalizar la marca.', released_at: '2026-05-30' },
    ],
  },
  {
    title: 'LaunchPage — Landing para SaaS', slug: 'launchpage-landing-saas', category: 'plantillas', variant: 'landing', seed: 17,
    short_description: 'Landing page de alta conversión para productos digitales: hero, precios, testimonios y FAQ.',
    long_description: 'Presenta tu producto con una landing profesional: sección hero con captura, características, planes de precios con toggle mensual/anual, testimonios, FAQ y formulario de contacto.\n\nOptimizada para velocidad (100/100 en Lighthouse) y SEO.',
    features: 'Secciones modulares fáciles de reordenar\nToggle de precios mensual/anual\nFormulario listo para Formspree o tu backend\nAnimaciones sutiles con CSS\n100/100 en Lighthouse\nCompatible con Netlify, Vercel y GitHub Pages',
    requirements: 'Servidor estático', price: 2900, discount: null, demo_url: 'https://demo.devmarket.local/launchpage', version: '1.1.0', featured: 0, isNew: 1,
    tags: 'HTML, CSS, Landing, SaaS',
    changelog: [
      { version: '1.1.0', notes: 'Sección de comparación de planes y bloque de logos de clientes.', released_at: '2026-08-25' },
    ],
  },
  {
    title: 'DevFolio — Portafolio para Desarrolladores', slug: 'devfolio-portafolio-desarrolladores', category: 'plantillas', variant: 'landing', seed: 19,
    short_description: 'Portafolio minimalista con proyectos, stack, experiencia y blog en Markdown.',
    long_description: 'Muestra tus proyectos con estilo. DevFolio incluye una página de inicio, listado de proyectos con filtros por tecnología, línea de tiempo de experiencia y un blog que se alimenta de archivos Markdown.',
    features: 'Proyectos con filtros por tecnología\nBlog en Markdown\nModo oscuro automático\nFormulario de contacto\nDespliegue en un clic a GitHub Pages',
    requirements: 'Node.js 18+ para compilar\nServidor estático para publicar', price: 1900, discount: null, demo_url: 'https://demo.devmarket.local/devfolio', version: '1.0.2', featured: 0, isNew: 0,
    tags: 'HTML, Markdown, Portafolio',
    changelog: [
      { version: '1.0.2', notes: 'Ajustes de accesibilidad y contraste.', released_at: '2026-07-01' },
    ],
  },
  {
    title: 'PriceWatch — Monitor de Precios', slug: 'pricewatch-monitor-de-precios', category: 'scripts', variant: 'table', seed: 23,
    short_description: 'Script de scraping que vigila precios de la competencia y avisa por Telegram cuando cambian.',
    long_description: 'Configura una lista de URLs y selectores; PriceWatch revisa los precios cada cierto tiempo, guarda el historial y te avisa por Telegram o email cuando bajan o suben.\n\nIncluye panel web simple para ver gráficos de evolución.',
    features: 'Programación con cron\nHistorial en SQLite\nAlertas por Telegram y email\nPanel web con gráficos\nRotación de user-agent y proxies opcionales',
    requirements: 'Python 3.10+\nPlaywright (se instala con un comando)', price: 4900, discount: 3900, demo_url: null, version: '1.5.0', featured: 0, isNew: 1,
    tags: 'Python, Scraping, Telegram, Automatización',
    changelog: [
      { version: '1.5.0', notes: 'Soporte de proxies rotativos y reintentos con backoff.', released_at: '2026-08-30' },
      { version: '1.4.0', notes: 'Panel web con gráficos de evolución.', released_at: '2026-06-12' },
    ],
  },
];

const COUPONS = [
  { code: 'BIENVENIDO10', type: 'percent', value: 10, min_amount_cents: 0, max_uses: null, applies_to: 'all', expires_at: null, is_active: 1 },
  { code: 'DEV20', type: 'percent', value: 20, min_amount_cents: 5000, max_uses: 100, applies_to: 'products', expires_at: '2026-12-31', is_active: 1 },
  { code: 'MENOS15', type: 'fixed', value: 1500, min_amount_cents: 9000, max_uses: null, applies_to: 'all', expires_at: null, is_active: 1 },
];

const REVIEWERS = [
  { name: 'Jorge Ramírez', email: 'jorge@cliente.local' },
  { name: 'María Alvarado', email: 'maria@cliente.local' },
  { name: 'Luis Paredes', email: 'luis@cliente.local' },
  { name: 'Carla Quispe', email: 'carla@cliente.local' },
];

const REVIEWS = [
  { slug: 'sistema-inventario-ventas', who: 0, rating: 5, title: 'Lo instalé en dos tiendas', body: 'Muy completo. El módulo de caja y los reportes por sucursal me ahorraron semanas de trabajo. Soporte rápido por WhatsApp.' },
  { slug: 'sistema-inventario-ventas', who: 1, rating: 4, title: 'Buen código, fácil de adaptar', body: 'El código está ordenado y comentado. Cambié la impresión de tickets sin problemas. Le faltaría un módulo de compras más detallado.' },
  { slug: 'sistema-inventario-ventas', who: 2, rating: 5, title: 'Recomendado', body: 'Funciona tal cual la demo. La instalación en cPanel tomó menos de una hora.' },
  { slug: 'facturafacil-facturacion-electronica', who: 3, rating: 5, title: 'Cobros al día', body: 'Los recordatorios automáticos me redujeron la morosidad. Muy recomendable para pymes.' },
  { slug: 'reservapro-citas-y-reservas', who: 1, rating: 4, title: 'Ideal para mi consultorio', body: 'La página pública de reservas es clara y mis pacientes la usan sin ayuda. Pedí una personalización y la entregaron en dos días.' },
  { slug: 'bot-whatsapp-pedidos', who: 0, rating: 5, title: 'Pedidos sin atender el teléfono', body: 'El bot arma el pedido completo y me llega el resumen listo. Se configura en un solo archivo.' },
  { slug: 'adminkit-plantilla-panel', who: 2, rating: 4, title: 'Plantilla limpia', body: 'Componentes bien pensados y modo oscuro incluido. Conecté mi API en una tarde.' },
];

const BUNDLES = [
  { name: 'Negocio completo', slug: 'negocio-completo', description: 'Punto de venta + facturación electrónica: vende, factura y cobra desde el primer día.', price_cents: 15900, is_active: 1, products: ['sistema-inventario-ventas', 'facturafacil-facturacion-electronica'] },
  { name: 'Atención por WhatsApp', slug: 'atencion-whatsapp', description: 'Reservas online y bot de pedidos para atender a tus clientes sin estar al teléfono.', price_cents: 12900, is_active: 1, products: ['reservapro-citas-y-reservas', 'bot-whatsapp-pedidos'] },
];

const POSTS = require('./data/posts.json');

const PLANS = [
  { name: 'Mensual', slug: 'mensual', description: 'Acceso a todos los sistemas durante 30 días.', features: 'Descarga ilimitada de todos los productos\nActualizaciones durante la membresía\nSoporte por WhatsApp', price_cents: 1900, duration_days: 30, is_active: 1, is_featured: 0, sort_order: 1 },
  { name: 'Anual', slug: 'anual', description: 'Un año completo de acceso con el mejor precio por mes.', features: 'Todo lo del plan Mensual\nAhorra más del 55 % frente al mensual\nAcceso anticipado a nuevos lanzamientos\nSoporte prioritario', price_cents: 9900, duration_days: 365, is_active: 1, is_featured: 1, sort_order: 2 },
  { name: 'Vitalicia', slug: 'vitalicia', description: 'Paga una vez y descarga para siempre.', features: 'Acceso de por vida a todo el catálogo\nTodas las actualizaciones futuras\nSoporte prioritario\nLicencia para proyectos ilimitados', price_cents: 24900, duration_days: null, is_active: 1, is_featured: 0, sort_order: 3 },
];

function ensureImages(product, { minimal }) {
  fs.mkdirSync(SEED_IMG_DIR, { recursive: true });
  const variants = minimal ? [product.variant] : [product.variant, 'table', 'landing'].filter((v, i, a) => a.indexOf(v) === i);
  const entries = [];
  variants.forEach((variant, i) => {
    const file = `${product.slug}-${i + 1}.svg`;
    const abs = path.join(SEED_IMG_DIR, file);
    if (!fs.existsSync(abs)) fs.writeFileSync(abs, screenshot({ title: product.title, variant, seed: product.seed + i }));
    entries.push({ path: `/img/seed/${file}`, alt: `${product.title} — captura ${i + 1}` });
  });
  return entries;
}

function ensureZip(product) {
  fs.mkdirSync(config.STORAGE_DIR, { recursive: true });
  const existing = productsModel.bySlug(product.slug, { withRelations: false });
  if (existing && existing.file_name && fs.existsSync(path.join(config.STORAGE_DIR, existing.file_name))) {
    return { file_name: existing.file_name, file_original_name: existing.file_original_name, file_size: existing.file_size };
  }
  const fileName = `seed-${product.slug}.zip`;
  const buf = createZip([
    { name: 'README.txt', data: `${product.title} v${product.version}\n\nArchivo de demostración generado por el seed de DevMarket.\nSustitúyelo por el ZIP real desde el panel de administración.\n` },
    { name: 'index.html', data: `<!doctype html><html lang="es"><meta charset="utf-8"><title>${product.title}</title><h1>${product.title}</h1><p>Demo de instalación.</p></html>\n` },
    { name: 'LICENSE.txt', data: 'Licencia estándar DevMarket: uso en un (1) proyecto propio o de un cliente. Prohibida la reventa del código fuente.\n' },
  ]);
  fs.writeFileSync(path.join(config.STORAGE_DIR, fileName), buf);
  return { file_name: fileName, file_original_name: `${product.slug}.zip`, file_size: buf.length };
}

function fresh(db) {
  if (config.IS_PROD && !config.SEED_ALLOW_FRESH) throw new Error('En producción, --fresh requiere SEED_ALLOW_FRESH=true.');
  db.exec(`DELETE FROM downloads; DELETE FROM memberships; DELETE FROM order_items; DELETE FROM orders; DELETE FROM changelog;
    DELETE FROM product_tags; DELETE FROM tags; DELETE FROM product_images; DELETE FROM products; DELETE FROM categories; DELETE FROM plans;
    DELETE FROM licenses; DELETE FROM tokens; DELETE FROM emails; DELETE FROM ticket_messages; DELETE FROM tickets; DELETE FROM posts; DELETE FROM bundle_products; DELETE FROM bundles; DELETE FROM carts; DELETE FROM product_views; DELETE FROM reviews; DELETE FROM favorites; DELETE FROM coupons; DELETE FROM contact_messages; DELETE FROM sessions; DELETE FROM users; DELETE FROM settings; DELETE FROM sqlite_sequence;`);
}

function seed({ db = getDb(), minimal = false, freshRun = false } = {}) {
  if (freshRun) fresh(db);
  bootstrap();

  const catBySlug = {};
  for (const c of CATEGORIES) catBySlug[c.slug] = categoriesModel.upsertBySlug(c);

  const list = minimal ? PRODUCTS.slice(0, 3) : PRODUCTS;
  for (const p of list) {
    const data = {
      title: p.title, slug: p.slug, category_id: catBySlug[p.category].id, short_description: p.short_description,
      long_description: p.long_description, features: p.features, requirements: p.requirements, price_cents: p.price,
      discount_cents: p.discount, currency: 'USD', demo_url: p.demo_url, version: p.version,
      license: 'Licencia estándar: uso en 1 proyecto', is_featured: p.featured, is_new: p.isNew, is_active: 1,
    };
    const existing = productsModel.bySlug(p.slug, { withRelations: false });
    const product = existing ? productsModel.update(existing.id, data) : productsModel.create(data);
    tagsModel.setForProduct(product.id, p.tags);
    imagesModel.replaceAll(product.id, ensureImages(p, { minimal }));
    changelogModel.replaceAll(product.id, p.changelog);
    productsModel.setFile(product.id, ensureZip(p));
  }
  for (const pl of PLANS) plansModel.upsertBySlug(pl);

  let demo = usersModel.findByEmail('demo@devmarket.local');
  if (!demo) demo = usersModel.create({ name: 'Cliente Demo', email: 'demo@devmarket.local', password: 'demo12345' });
  if (!ordersModel.byUser(demo.id).length) {
    const first = productsModel.bySlug(list[0].slug, { withRelations: false });
    const order = ordersModel.create({ user_id: demo.id, provider: 'manual', amount_cents: productsModel.effectivePrice(first) },
      [{ item_type: 'product', product_id: first.id, title: first.title, unit_cents: productsModel.effectivePrice(first), quantity: 1 }]);
    ordersService.markPaid(order.id, { provider_data: { seeded: true } });
  }
  for (const c of COUPONS) couponsModel.upsertByCode(c);
  for (const b of BUNDLES) {
    const ids = b.products.map((slug) => productsModel.bySlug(slug, { withRelations: false })).filter(Boolean).map((p) => p.id);
    if (ids.length >= 2) bundlesModel.upsertBySlug({ name: b.name, slug: b.slug, description: b.description, price_cents: b.price_cents, is_active: b.is_active }, ids);
  }
  for (const p of POSTS) postsModel.upsertBySlug(p);
  const reviewers = REVIEWERS.map((r) => usersModel.findByEmail(r.email) || usersModel.create({ name: r.name, email: r.email, password: 'cliente12345' }));
  for (const rv of REVIEWS) {
    const product = productsModel.bySlug(rv.slug, { withRelations: false });
    if (!product) continue;
    const user = reviewers[rv.who];
    if (!ordersModel.userOwnsProduct(user.id, product.id)) {
      const order = ordersModel.create({ user_id: user.id, provider: 'manual', amount_cents: productsModel.effectivePrice(product) },
        [{ item_type: 'product', product_id: product.id, title: product.title, unit_cents: productsModel.effectivePrice(product), quantity: 1 }]);
      ordersService.markPaid(order.id, { provider_data: { seeded: true } });
    }
    reviewsModel.create({ product_id: product.id, user_id: user.id, rating: rv.rating, title: rv.title, body: rv.body, status: 'approved' });
    favoritesModel.add(user.id, product.id);
  }
  settingsModel.set('seeded_at', new Date().toISOString());
  return { products: list.length, plans: PLANS.length, categories: CATEGORIES.length };
}

if (require.main === module) {
  const freshRun = process.argv.includes('--fresh');
  const result = seed({ freshRun });
  console.log(`Seed completado: ${result.categories} categorías, ${result.products} productos, ${result.plans} planes, ${COUPONS.length} cupones, ${REVIEWS.length} reseñas, ${BUNDLES.length} paquetes, ${POSTS.length} entradas de blog.`);
  console.log(`Admin: ${config.ADMIN_EMAIL || '(define ADMIN_EMAIL en .env)'} · Cliente demo: demo@devmarket.local / demo12345`);
}

module.exports = { seed, PRODUCTS, PLANS, CATEGORIES, COUPONS, REVIEWS, BUNDLES, POSTS };
