'use strict';
const { getDb } = require('../db');
const { uniqueSlug } = require('../utils/slug');

function all() {
  return getDb().prepare(`SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) AS product_count
    FROM categories c ORDER BY sort_order, name`).all();
}
function bySlug(slug) {
  return getDb().prepare('SELECT * FROM categories WHERE slug = ?').get(slug);
}
function byId(id) {
  return getDb().prepare('SELECT * FROM categories WHERE id = ?').get(id);
}
function slugExists(slug, exceptId = null) {
  const row = getDb().prepare('SELECT id FROM categories WHERE slug = ? AND (? IS NULL OR id != ?)').get(slug, exceptId, exceptId);
  return Boolean(row);
}
function create({ name, slug, description = '', sort_order = 0 }) {
  const finalSlug = uniqueSlug(slug || name, (s) => slugExists(s));
  const info = getDb().prepare('INSERT INTO categories (name, slug, description, sort_order) VALUES (?, ?, ?, ?)').run(name, finalSlug, description, sort_order);
  return byId(info.lastInsertRowid);
}
function update(id, { name, slug, description = '', sort_order = 0 }) {
  const finalSlug = uniqueSlug(slug || name, (s) => slugExists(s, id));
  getDb().prepare('UPDATE categories SET name = ?, slug = ?, description = ?, sort_order = ? WHERE id = ?').run(name, finalSlug, description, sort_order, id);
  return byId(id);
}
function remove(id) {
  getDb().prepare('DELETE FROM categories WHERE id = ?').run(id);
}
function upsertBySlug(data) {
  const existing = bySlug(data.slug);
  if (existing) return update(existing.id, data);
  return create(data);
}

module.exports = { all, bySlug, byId, create, update, remove, upsertBySlug, slugExists };
