'use strict';
const { getDb } = require('../db');

function byProduct(productId) {
  return getDb().prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order, id').all(productId);
}
function byId(id) {
  return getDb().prepare('SELECT * FROM product_images WHERE id = ?').get(id);
}
function add(productId, path, alt = '', sortOrder = null) {
  const db = getDb();
  const order = sortOrder ?? (db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM product_images WHERE product_id = ?').get(productId).n);
  const info = db.prepare('INSERT INTO product_images (product_id, path, alt, sort_order) VALUES (?, ?, ?, ?)').run(productId, path, alt, order);
  return byId(info.lastInsertRowid);
}
function remove(id) {
  getDb().prepare('DELETE FROM product_images WHERE id = ?').run(id);
}
function removeAllForProduct(productId) {
  getDb().prepare('DELETE FROM product_images WHERE product_id = ?').run(productId);
}
function reorder(productId, orderedIds) {
  const db = getDb();
  const stmt = db.prepare('UPDATE product_images SET sort_order = ? WHERE id = ? AND product_id = ?');
  db.transaction(() => orderedIds.forEach((id, i) => stmt.run(i, id, productId)))();
}
function replaceAll(productId, entries) {
  const db = getDb();
  db.transaction(() => {
    removeAllForProduct(productId);
    entries.forEach((e, i) => add(productId, e.path, e.alt || '', i));
  })();
}

module.exports = { byProduct, byId, add, remove, removeAllForProduct, reorder, replaceAll };
