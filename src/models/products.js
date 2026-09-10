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
  rating: 'rating_avg DESC, rating_count DESC, p.id DESC',
  name: 'p.title COLLATE NOCASE ASC',
};

const BASE_SELECT = `SELECT p.*, c.name AS category_name, c.slug AS category_slug,
  (SELECT path FROM product_images i WHERE i.product_id = p.id ORDER BY i.sort_order, i.id LIMIT 1) AS image,
  (SELECT COALESCE(AVG(r.rating), 0) FROM reviews r WHERE r.product_id = p.id AND r.status = 'approved') AS rating_avg,
  (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id AND r.status = 'approved') AS rating_count,
  (SELECT COUNT(*) FROM favorites f WHERE f.product_id = p.id) AS favorites_count
  FROM products p LEFT JOIN categories c ON c.id = p.category_id`;

function list({ q = '', categorySlug = null, tagSlug = null, tagSlugs = [], minCents = null, maxCents = null, minRating = null, onlyDiscount = false,
  sort = 'recent', page = 1, perPage = 12, onlyActive = true, featured = null, isNew = null, sinceDays = null, ids = null } = {}) {
  const db = getDb();
  const where = [];
  const params = {};
  if (onlyActive) where.push('p.is_active = 1 AND p.is_archived = 0');
  if (q) { where.push('(p.title LIKE @q OR p.short_description LIKE @q OR p.long_description LIKE @q OR p.id IN (SELECT pt.product_id FROM product_tags pt JOIN tags t ON t.id = pt.tag_id WHERE t.name LIKE @q))'); params.q = `%${q}%`; }
  if (categorySlug) { where.push('c.slug = @categorySlug'); params.categorySlug = categorySlug; }
  if (tagSlug) { where.push('p.id IN (SELECT pt.product_id FROM product_tags pt JOIN tags t ON t.id = pt.tag_id WHERE t.slug = @tagSlug)'); params.tagSlug = tagSlug; }
  if (tagSlugs && tagSlugs.length) {
    tagSlugs.forEach((s, i) => { params[`ts${i}`] = s; });
    where.push(`p.id IN (SELECT pt.product_id FROM product_tags pt JOIN tags t ON t.id = pt.tag_id WHERE t.slug IN (${tagSlugs.map((_, i) => `@ts${i}`).join(',')}))`);
  }
  if (minCents !== null && minCents !== undefined) { where.push('COALESCE(p.discount_cents, p.price_cents) >= @minCents'); params.minCents = minCents; }
  if (maxCents !== null && maxCents !== undefined) { where.push('COALESCE(p.discount_cents, p.price_cents) <= @maxCents'); params.maxCents = maxCents; }
  if (minRating) { where.push('(SELECT COALESCE(AVG(r.rating), 0) FROM reviews r WHERE r.product_id = p.id AND r.status = \'approved\') >= @minRating'); params.minRating = minRating; }
  if (onlyDiscount) where.push('p.discount_cents IS NOT NULL AND p.discount_cents < p.price_cents');
  if (featured !== null) { where.push('p.is_featured = @featured'); params.featured = featured ? 1 : 0; }
  if (isNew !== null) {
    if (sinceDays) where.push(`(p.is_new = 1 OR p.created_at >= datetime('now', '-${Number(sinceDays)} days'))`);
    else { where.push('p.is_new = @isNew'); params.isNew = isNew ? 1 : 0; }
  }
  if (ids) { if (!ids.length) return { rows: [], total: 0, page, perPage, pages: 1 }; where.push(`p.id IN (${ids.map(Number).join(',')})`); }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderSql = SORTS[sort] || SORTS.recent;
  params.limit = perPage;
  params.offset = (page - 1) * perPage;
  const rows = db.prepare(`${BASE_SELECT} ${whereSql} ORDER BY ${orderSql} LIMIT @limit OFFSET @offset`).all(params);
  const total = db.prepare(`SELECT COUNT(*) AS c FROM products p LEFT JOIN categories c ON c.id = p.category_id ${whereSql}`).get(params).c;
  return { rows, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) };
}

function priceRange() {
  return getDb().prepare('SELECT COALESCE(MIN(COALESCE(discount_cents, price_cents)),0) AS min, COALESCE(MAX(COALESCE(discount_cents, price_cents)),0) AS max FROM products WHERE is_active = 1').get();
}
function suggest(q, limit = 6) {
  if (!q) return [];
  return getDb().prepare(`${BASE_SELECT} WHERE p.is_active = 1 AND (p.title LIKE @q OR p.short_description LIKE @q OR p.id IN (SELECT pt.product_id FROM product_tags pt JOIN tags t ON t.id = pt.tag_id WHERE t.name LIKE @q))
    ORDER BY (p.title LIKE @qs) DESC, p.sales_count DESC LIMIT @limit`).all({ q: `%${q}%`, qs: `${q}%`, limit });
}
function featured(limit = 8) {
  return getDb().prepare(`${BASE_SELECT} WHERE p.is_active = 1 AND p.is_featured = 1 ORDER BY p.updated_at DESC LIMIT ?`).all(limit);
}
function newest(limit = 4) {
  return getDb().prepare(`${BASE_SELECT} WHERE p.is_active = 1 ORDER BY p.is_new DESC, p.created_at DESC LIMIT ?`).all(limit);
}
function topRated(limit = 4) {
  return getDb().prepare(`${BASE_SELECT} WHERE p.is_active = 1 ORDER BY rating_avg DESC, rating_count DESC, p.sales_count DESC LIMIT ?`).all(limit);
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
    video_url: d.video_url || null,
    faq: d.faq || '',
    package_contents: d.package_contents || '',
    title_en: d.title_en || null,
    short_description_en: d.short_description_en || null,
    long_description_en: d.long_description_en || null,
    features_en: d.features_en || null,
  };
}
function create(data) {
  const slug = uniqueSlug(data.slug || data.title, (s) => slugExists(s));
  const info = getDb().prepare(`INSERT INTO products (title, slug, category_id, short_description, long_description, features, requirements,
    price_cents, discount_cents, currency, demo_url, version, license, is_featured, is_new, is_active, video_url, faq, package_contents, title_en, short_description_en, long_description_en, features_en)
    VALUES (@title, @slug, @category_id, @short_description, @long_description, @features, @requirements,
    @price_cents, @discount_cents, @currency, @demo_url, @version, @license, @is_featured, @is_new, @is_active, @video_url, @faq, @package_contents, @title_en, @short_description_en, @long_description_en, @features_en)`).run(normalize({ ...data, slug }));
  return byId(info.lastInsertRowid);
}
function update(id, data) {
  const slug = uniqueSlug(data.slug || data.title, (s) => slugExists(s, id));
  getDb().prepare(`UPDATE products SET title=@title, slug=@slug, category_id=@category_id, short_description=@short_description,
    long_description=@long_description, features=@features, requirements=@requirements, price_cents=@price_cents, discount_cents=@discount_cents,
    currency=@currency, demo_url=@demo_url, version=@version, license=@license, is_featured=@is_featured, is_new=@is_new, is_active=@is_active,
    video_url=@video_url, faq=@faq, package_contents=@package_contents, title_en=@title_en, short_description_en=@short_description_en, long_description_en=@long_description_en, features_en=@features_en,
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
function archive(id) { getDb().prepare("UPDATE products SET is_archived = 1, updated_at = datetime('now') WHERE id = ?").run(id); }
function restore(id) { getDb().prepare("UPDATE products SET is_archived = 0, updated_at = datetime('now') WHERE id = ?").run(id); }
function incrementViews(id) {
  const db = getDb();
  db.prepare('UPDATE products SET views_count = views_count + 1 WHERE id = ?').run(id);
  db.prepare("INSERT INTO product_views (product_id, day, count) VALUES (?, date('now'), 1) ON CONFLICT(product_id, day) DO UPDATE SET count = count + 1").run(id);
}
function metrics() {
  const db = getDb();
  const months = db.prepare(`SELECT strftime('%Y-%m', paid_at) AS month, COUNT(*) AS orders, COALESCE(SUM(amount_cents),0) AS revenue
    FROM orders WHERE status = 'paid' AND paid_at >= date('now', '-11 months', 'start of month') GROUP BY month ORDER BY month`).all();
  const topViewed = db.prepare(`SELECT p.id, p.title, p.slug, p.views_count, p.sales_count,
      COALESCE((SELECT SUM(v.count) FROM product_views v WHERE v.product_id = p.id AND v.day >= date('now', '-30 days')), 0) AS views_30d
    FROM products p WHERE p.is_archived = 0 ORDER BY views_30d DESC, p.views_count DESC LIMIT 8`).all();
  const topSold = db.prepare(`SELECT p.id, p.title, p.slug, p.sales_count, p.views_count, p.sales_count * 1.0 / MAX(p.views_count, 1) AS conversion
    FROM products p WHERE p.is_archived = 0 ORDER BY p.sales_count DESC, p.views_count DESC LIMIT 8`).all();
  const totals = db.prepare(`SELECT COALESCE(SUM(views_count),0) AS views, COALESCE(SUM(sales_count),0) AS sales FROM products`).get();
  const couponsUse = db.prepare(`SELECT coupon_code AS code, COUNT(*) AS uses, COALESCE(SUM(discount_cents),0) AS discount FROM orders WHERE status = 'paid' AND coupon_code IS NOT NULL GROUP BY coupon_code ORDER BY uses DESC LIMIT 6`).all();
  const byProvider = db.prepare(`SELECT provider, COUNT(*) AS orders, COALESCE(SUM(amount_cents),0) AS revenue FROM orders WHERE status = 'paid' GROUP BY provider ORDER BY revenue DESC`).all();
  const last30 = db.prepare(`SELECT date(paid_at) AS day, COALESCE(SUM(amount_cents),0) AS revenue FROM orders WHERE status='paid' AND paid_at >= date('now', '-29 days') GROUP BY day ORDER BY day`).all();
  return { months, topViewed, topSold, totals, conversion: totals.views ? totals.sales / totals.views : 0, couponsUse, byProvider, last30 };
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
    sales: db.prepare('SELECT COALESCE(SUM(sales_count),0) AS c FROM products').get().c,
  };
}
function adminList({ q = '', page = 1, perPage = 25, archived = false } = {}) {
  const db = getDb();
  const where = `WHERE p.is_archived = ${archived ? 1 : 0}` + (q ? ' AND (p.title LIKE @q OR p.slug LIKE @q)' : '');
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

function buyersOf(productId) {
  return getDb().prepare(`SELECT DISTINCT u.* FROM users u JOIN orders o ON o.user_id = u.id JOIN order_items oi ON oi.order_id = o.id WHERE o.status = 'paid' AND oi.product_id = ? AND u.is_blocked = 0`).all(productId);
}
function activeMembers() {
  return getDb().prepare(`SELECT DISTINCT u.* FROM users u JOIN memberships m ON m.user_id = u.id WHERE m.status = 'active' AND (m.ends_at IS NULL OR m.ends_at > datetime('now')) AND u.is_blocked = 0`).all();
}

module.exports = { list, priceRange, suggest, featured, newest, topRated, related, bySlug, byId, byIds, hydrate, slugExists, create, update, setFile, setVersion, remove, archive, restore, incrementViews, metrics, buyersOf, activeMembers, incrementDownloads, incrementSales, stats, adminList, effectivePrice, discountPct, SORTS };
