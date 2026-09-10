'use strict';
const { getDb } = require('../db');
const { uniqueSlug } = require('../utils/slug');

function all({ activeOnly = false } = {}) {
  return getDb().prepare(`SELECT * FROM plans ${activeOnly ? 'WHERE is_active = 1' : ''} ORDER BY sort_order, price_cents`).all();
}
function bySlug(slug) {
  return getDb().prepare('SELECT * FROM plans WHERE slug = ?').get(slug);
}
function byId(id) {
  return getDb().prepare('SELECT * FROM plans WHERE id = ?').get(id);
}
function slugExists(slug, exceptId = null) {
  return Boolean(getDb().prepare('SELECT id FROM plans WHERE slug = ? AND (? IS NULL OR id != ?)').get(slug, exceptId, exceptId));
}
function create(data) {
  const slug = uniqueSlug(data.slug || data.name, (s) => slugExists(s));
  const info = getDb().prepare(`INSERT INTO plans (name, slug, description, features, price_cents, currency, duration_days, is_active, is_featured, sort_order)
    VALUES (@name, @slug, @description, @features, @price_cents, @currency, @duration_days, @is_active, @is_featured, @sort_order)`).run(normalize({ ...data, slug }));
  return byId(info.lastInsertRowid);
}
function update(id, data) {
  const slug = uniqueSlug(data.slug || data.name, (s) => slugExists(s, id));
  getDb().prepare(`UPDATE plans SET name=@name, slug=@slug, description=@description, features=@features, price_cents=@price_cents,
    currency=@currency, duration_days=@duration_days, is_active=@is_active, is_featured=@is_featured, sort_order=@sort_order WHERE id=@id`).run({ ...normalize({ ...data, slug }), id });
  return byId(id);
}
function remove(id) {
  getDb().prepare('DELETE FROM plans WHERE id = ?').run(id);
}
function upsertBySlug(data) {
  const existing = bySlug(data.slug);
  return existing ? update(existing.id, data) : create(data);
}
function normalize(d) {
  return {
    name: d.name,
    slug: d.slug,
    description: d.description || '',
    features: d.features || '',
    price_cents: Number(d.price_cents) || 0,
    currency: d.currency || 'USD',
    duration_days: d.duration_days ? Number(d.duration_days) : null,
    is_active: d.is_active ? 1 : 0,
    is_featured: d.is_featured ? 1 : 0,
    sort_order: Number(d.sort_order) || 0,
  };
}

module.exports = { all, bySlug, byId, create, update, remove, upsertBySlug, slugExists };
