'use strict';
const { getDb } = require('../db');
const { uniqueSlug } = require('../utils/slug');

function slugExists(slug, exceptId = null) { return Boolean(getDb().prepare('SELECT id FROM bundles WHERE slug = ? AND (? IS NULL OR id != ?)').get(slug, exceptId, exceptId)); }
function products(bundleId) {
  return getDb().prepare(`SELECT p.*, (SELECT path FROM product_images i WHERE i.product_id = p.id ORDER BY i.sort_order, i.id LIMIT 1) AS image
    FROM bundle_products bp JOIN products p ON p.id = bp.product_id WHERE bp.bundle_id = ? ORDER BY p.title`).all(bundleId);
}
function hydrate(b) {
  if (!b) return b;
  b.products = products(b.id);
  b.regular_cents = b.products.reduce((s, p) => s + (p.discount_cents !== null && p.discount_cents < p.price_cents ? p.discount_cents : p.price_cents), 0);
  b.savings_cents = Math.max(0, b.regular_cents - b.price_cents);
  b.savings_pct = b.regular_cents ? Math.round(b.savings_cents / b.regular_cents * 100) : 0;
  return b;
}
function all({ activeOnly = false } = {}) { return getDb().prepare(`SELECT * FROM bundles ${activeOnly ? 'WHERE is_active = 1' : ''} ORDER BY created_at DESC`).all().map(hydrate); }
function bySlug(slug) { return hydrate(getDb().prepare('SELECT * FROM bundles WHERE slug = ?').get(slug)); }
function byId(id) { return hydrate(getDb().prepare('SELECT * FROM bundles WHERE id = ?').get(id)); }
function forProduct(productId) {
  return getDb().prepare('SELECT b.* FROM bundles b JOIN bundle_products bp ON bp.bundle_id = b.id WHERE bp.product_id = ? AND b.is_active = 1').all(productId).map(hydrate);
}
function setProducts(bundleId, ids) {
  const db = getDb();
  db.transaction(() => {
    db.prepare('DELETE FROM bundle_products WHERE bundle_id = ?').run(bundleId);
    const ins = db.prepare('INSERT OR IGNORE INTO bundle_products (bundle_id, product_id) VALUES (?, ?)');
    for (const id of ids) ins.run(bundleId, Number(id));
  })();
}
function create(data, productIds = []) {
  const slug = uniqueSlug(data.slug || data.name, (s) => slugExists(s));
  const info = getDb().prepare('INSERT INTO bundles (name, slug, description, price_cents, is_active) VALUES (?, ?, ?, ?, ?)').run(data.name, slug, data.description || '', Number(data.price_cents) || 0, data.is_active ? 1 : 0);
  setProducts(Number(info.lastInsertRowid), productIds);
  return byId(info.lastInsertRowid);
}
function update(id, data, productIds = []) {
  const slug = uniqueSlug(data.slug || data.name, (s) => slugExists(s, id));
  getDb().prepare('UPDATE bundles SET name = ?, slug = ?, description = ?, price_cents = ?, is_active = ? WHERE id = ?').run(data.name, slug, data.description || '', Number(data.price_cents) || 0, data.is_active ? 1 : 0, id);
  setProducts(id, productIds);
  return byId(id);
}
function remove(id) { getDb().prepare('DELETE FROM bundles WHERE id = ?').run(id); }
function upsertBySlug(data, productIds) { const e = bySlug(data.slug); return e ? update(e.id, data, productIds) : create(data, productIds); }

module.exports = { all, bySlug, byId, forProduct, create, update, remove, setProducts, upsertBySlug };
