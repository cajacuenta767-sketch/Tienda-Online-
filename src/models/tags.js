'use strict';
const { getDb } = require('../db');
const { toSlug } = require('../utils/slug');

function bySlug(slug) {
  return getDb().prepare('SELECT * FROM tags WHERE slug = ?').get(slug);
}
function byProduct(productId) {
  return getDb().prepare('SELECT t.* FROM tags t JOIN product_tags pt ON pt.tag_id = t.id WHERE pt.product_id = ? ORDER BY t.name').all(productId);
}
function popular(limit = 20) {
  return getDb().prepare(`SELECT t.*, COUNT(pt.product_id) AS product_count FROM tags t
    JOIN product_tags pt ON pt.tag_id = t.id JOIN products p ON p.id = pt.product_id AND p.is_active = 1
    GROUP BY t.id ORDER BY product_count DESC, t.name LIMIT ?`).all(limit);
}
function parseList(input) {
  if (Array.isArray(input)) return input.map((s) => String(s).trim()).filter(Boolean);
  return String(input || '').split(',').map((s) => s.trim()).filter(Boolean);
}
function setForProduct(productId, names) {
  const db = getDb();
  const insertTag = db.prepare('INSERT OR IGNORE INTO tags (name, slug) VALUES (?, ?)');
  const getTag = db.prepare('SELECT id FROM tags WHERE slug = ?');
  const link = db.prepare('INSERT OR IGNORE INTO product_tags (product_id, tag_id) VALUES (?, ?)');
  const unlinkAll = db.prepare('DELETE FROM product_tags WHERE product_id = ?');
  const tx = db.transaction(() => {
    unlinkAll.run(productId);
    const seen = new Set();
    for (const raw of parseList(names)) {
      const slug = toSlug(raw);
      if (seen.has(slug)) continue;
      seen.add(slug);
      insertTag.run(raw, slug);
      const tag = getTag.get(slug);
      if (tag) link.run(productId, tag.id);
    }
    db.prepare('DELETE FROM tags WHERE id NOT IN (SELECT DISTINCT tag_id FROM product_tags)').run();
  });
  tx();
}

module.exports = { bySlug, byProduct, popular, parseList, setForProduct };
