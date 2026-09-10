'use strict';
const config = require('../config');
const products = require('../models/products');
const categories = require('../models/categories');
const posts = require('../models/posts');
const bundles = require('../models/bundles');

exports.sitemap = (req, res) => {
  const base = config.BASE_URL;
  const urls = [
    { loc: '/', priority: '1.0', changefreq: 'daily' },
    { loc: '/tienda', priority: '0.9', changefreq: 'daily' },
    { loc: '/nuevos', priority: '0.7', changefreq: 'weekly' },
    { loc: '/actualizaciones', priority: '0.6', changefreq: 'weekly' },
    { loc: '/membresia', priority: '0.8', changefreq: 'monthly' },
    { loc: '/paquetes', priority: '0.7', changefreq: 'weekly' },
    { loc: '/blog', priority: '0.7', changefreq: 'weekly' },
    { loc: '/nosotros', priority: '0.4', changefreq: 'monthly' },
    { loc: '/contacto', priority: '0.4', changefreq: 'monthly' },
    { loc: '/terminos', priority: '0.2', changefreq: 'yearly' },
  ];
  for (const c of categories.all()) urls.push({ loc: `/tienda/categoria/${c.slug}`, priority: '0.8', changefreq: 'weekly' });
  for (const p of products.list({ perPage: 1000, sort: 'recent' }).rows) urls.push({ loc: `/producto/${p.slug}`, priority: '0.9', changefreq: 'weekly', lastmod: String(p.updated_at).slice(0, 10) });
  for (const b of bundles.all({ activeOnly: true })) urls.push({ loc: `/paquetes/${b.slug}`, priority: '0.7', changefreq: 'weekly' });
  for (const post of posts.published({ perPage: 1000 }).rows) urls.push({ loc: `/blog/${post.slug}`, priority: '0.6', changefreq: 'monthly', lastmod: String(post.updated_at).slice(0, 10) });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${base}${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')}\n</urlset>`;
  res.type('application/xml').send(xml);
};

exports.robots = (req, res) => {
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /cuenta\nDisallow: /pagar\nDisallow: /pago/\nDisallow: /pedidos/\nDisallow: /descargar/\nDisallow: /d/\nDisallow: /api/\nSitemap: ${config.BASE_URL}/sitemap.xml\n`);
};
