'use strict';
const { getDb } = require('../db');
const { uniqueSlug } = require('../utils/slug');
const images = require('./productImages');
const tags = require('./tags');
const changelog = require('./changelog');

const SORTS = {
  recent: 'p.created_at DESC, p.id DESC',
  price_asc: 'COALESCE(p.discount_cents, p.price_cents) ASC, p.id DESC',
  price_desc: 'COALESCE(p.discount_cents, p.price_cents) DESC, p.id DESC',
  popular: 'p.sales_count DESC, p.downloads_count DESC, p.id DESC',
  name: 'p.title COLLATE NOCASE ASC',
};

const BASE_SELECT = `SELECT p.*, c.name AS category_name, c.slug AS category_slug,
  (SELECT path FROM product_images i WHERE i.product_id = p.id ORDER BY i.sort_order, i.id LIMIT 1) AS image
  FROM products p LEFT JOIN categories c ON c.id = p.category_id`;

function list({ q = '', categorySlug = null, tagSlug = null, sort = 'recent', page = 1, perPage = 12, onlyActive = true, featured = null, isNew = null, sinceDays = null } = {}) {
  const db = getDb();
  const where = [];
  const params = {};
  if (onlyActive) where.push('p.is_active = 1');
  if (q) { where.push('(p.title LIKE @q OR p.short_description LIKE @q OR p.long_description LIKE @q)'); params.q = `%${q}%`; }
  if (categorySlug) { where.push('c.slug = @categorySlug'); params.categorySlug = categorySlug; }
  if (tagSlug) { where.push('p.id IN (SELECT pt.product_id FROM product_tags pt JOIN tags t ON t.id = pt.tag_id WHERE t.slug = @tagSlug)'); params.tagSlug = tagSlug; }
  if (featured !== null) { where.push('p.is_featured = @featured'); params.featured = featured ? 1 : 0; }
  if (isNew !== null) {
    if (sinceDays) { where.push(`(p.is_new = 1 OR p.created_at >= datetime('now', '-${Number(sinceDays)} days'))`); }
    else { where.push('p.is_new = @isNew'); params.isNew = isNew ? 1 : 0; }
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderSql = SORTS[sort] || SORTS.recent;
  params.limit = perPage;
  params.offset = (page - 1) * perPage;
  const rows = db.prepare(`${BASE_SELECT} ${whereSql} ORDER BY ${orderSql} LIMIT @limit OFFSET @offset`).all(params);
  const total = db.prepare(`SELECT COUNT(*) AS c FROM products p LEFT JOIN categories c ON c.id = p.category_id ${whereSql}`).get(params).c;
  return { rows, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) };
}

function featured(limit = 8) {
  return getDb().prepare(`${BASE_SELECT} WHERE p.is_active = 1 AND p.is_featured = 1 ORDER BY p.updated_at DESC LIMIT ?`).all(limit);
}
function newest(limit = 4) {
  return getDb().prepare(`${BASE_SELECT} WHERE p.is_active = 1 ORDER BY p.is_new DESC, p.created_at DESC LIMIT ?`).all(limit);
}
function related(product, limit = 4) {
  return getDb().prepare(`${BASE_SELECT} WHERE p.is_active = 1 AND p.id != ? AND (p.category_id = ? OR ? IS NULL)
    ORDER BY (p.category_id = ?) DESC, p.sales_count DESC, p.created_at DESC LIMIT ?`).all(product.id, product.category_id, product.category_id, product.category_id, limit);
}
function bySlug(slug, { withRelations = true } = {}) {
  const row = getDb().prepare(`${BASE_SELECT} WHERE p.slug = ?`).get(slug);
  return row && withRelations ? hydrate(row) : row;
}
function byId(id, { withRelations = false } = {}) {
  const row = getDb().prepare(`${BASE_SELECT} WHERE p.id = ?`).get(id);
  return row && withRelations ? hydrate(row) : row;
}
function byIds(ids) {
  if (!ids.length) return [];
  const placeholders = ids.map(() => '?').join(',');
  return getDb().prepare(`${BASE_SELECT} WHERE p.id IN (${placeholders}) AND p.is_active = 1`).all(...ids);
}
function hydrate(row) {
  row.images = images.byProduct(row.id);
  row.tags = tags.byProduct(row.id);
  row.changelog = changelog.byProduct(row.id);
  return row;
}
function slugExists(slug, exceptId = null) {
  return Boolean(getDb().prepare('SELECT id FROM products WHERE slug = ? AND (? IS NULL OR id != ?)').get(slug, exceptId, exceptId));
}
function normalize(d) {
  return {
    title: d.title,
    slug: d.slug,
    category_id: d.category_id || null,
    short_description: d.short_description || '',
    long_description: d.long_description || '',
    features: d.features || '',
    requirements: d.requirements || '',
    price_cents: Number(d.price_cents) || 0,
    discount_cents: d.discount_cents === null || d.discount_cents === undefined || d.discount_cents === '' ? null : Number(d.discount_cents),
    currency: d.currency || 'USD',
    demo_url: d.demo_url || null,
    version: d.version || '1.0.0',
    license: d.license || 'Licencia estándar: uso en 1 proyecto',
    is_featured: d.is_featured ? 1 : 0,
    is_new: d.is_new ? 1 : 0,
    is_active: d.is_active === undefined ? 1 : (d.is_active ? 1 : 0),
  };
}
function create(data) {
  const slug = uniqueSlug(data.slug || data.title, (s) => slugExists(s));
  const info = getDb().prepare(`INSERT INTO products (title, slug, category_id, short_description, long_description, features, requirements,
    price_cents, discount_cents, currency, demo_url, version, license, is_featured, is_new, is_active)
    VALUES (@title, @slug, @category_id, @short_description, @long_description, @features, @requirements,
    @price_cents, @discount_cents, @currency, @demo_url, @version, @license, @is_featured, @is_new, @is_active)`).run(normalize({ ...data, slug }));
  return byId(info.lastInsertRowid);
}
function update(id, data) {
  const slug = uniqueSlug(data.slug || data.title, (s) => slugExists(s, id));
  getDb().prepare(`UPDATE products SET title=@title, slug=@slug, category_id=@category_id, short_description=@short_description,
    long_description=@long_description, features=@features, requirements=@requirements, price_cents=@price_cents, discount_cents=@discount_cents,
    currency=@currency, demo_url=@demo_url, version=@version, license=@license, is_featured=@is_featured, is_new=@is_new, is_active=@is_active,
    updated_at=datetime('now') WHERE id=@id`).run({ ...normalize({ ...data, slug }), id });
  return byId(id);
}
function setFile(id, { file_name, file_original_name, file_size }) {
  getDb().prepare("UPDATE products SET file_name=?, file_original_name=?, file_size=?, updated_at=datetime('now') WHERE id=?").run(file_name, file_original_name, file_size, id);
}
function setVersion(id, version) {
  getDb().prepare("UPDATE products SET version=?, updated_at=datetime('now') WHERE id=?").run(version, id);
}
function remove(id) {
  getDb().prepare('DELETE FROM products WHERE id = ?').run(id);
}
function incrementDownloads(id) {
  getDb().prepare('UPDATE products SET downloads_count = downloads_count + 1 WHERE id = ?').run(id);
}
function incrementSales(id, qty = 1) {
  getDb().prepare('UPDATE products SET sales_count = sales_count + ? WHERE id = ?').run(qty, id);
}
function stats() {
  const db = getDb();
  return {
    total: db.prepare('SELECT COUNT(*) AS c FROM products').get().c,
    active: db.prepare('SELECT COUNT(*) AS c FROM products WHERE is_active = 1').get().c,
    downloads: db.prepare('SELECT COALESCE(SUM(downloads_count),0) AS c FROM products').get().c,
  };
}
function adminList({ q = '', page = 1, perPage = 25 } = {}) {
  const db = getDb();
  const where = q ? 'WHERE p.title LIKE @q OR p.slug LIKE @q' : '';
  const params = { q: `%${q}%`, limit: perPage, offset: (page - 1) * perPage };
  const rows = db.prepare(`${BASE_SELECT} ${where} ORDER BY p.updated_at DESC LIMIT @limit OFFSET @offset`).all(params);
  const total = db.prepare(`SELECT COUNT(*) AS c FROM products p ${where}`).get(params).c;
  return { rows, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) };
}
function effectivePrice(p) {
  return p.discount_cents !== null && p.discount_cents !== undefined && p.discount_cents < p.price_cents ? p.discount_cents : p.price_cents;
}
function discountPct(p) {
  if (p.discount_cents === null || p.discount_cents === undefined || p.discount_cents >= p.price_cents || !p.price_cents) return 0;
  return Math.round((1 - p.discount_cents / p.price_cents) * 100);
}

module.exports = { list, featured, newest, related, bySlug, byId, byIds, hydrate, slugExists, create, update, setFile, setVersion, remove, incrementDownloads, incrementSales, stats, adminList, effectivePrice, discountPct, SORTS };
