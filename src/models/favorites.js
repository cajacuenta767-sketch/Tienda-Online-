'use strict';
const { getDb } = require('../db');

function idsForUser(userId) {
  return getDb().prepare('SELECT product_id FROM favorites WHERE user_id = ? ORDER BY created_at DESC').all(userId).map((r) => r.product_id);
}
function has(userId, productId) {
  return Boolean(getDb().prepare('SELECT 1 FROM favorites WHERE user_id = ? AND product_id = ?').get(userId, productId));
}
function add(userId, productId) {
  getDb().prepare('INSERT OR IGNORE INTO favorites (user_id, product_id) VALUES (?, ?)').run(userId, productId);
}
function remove(userId, productId) {
  getDb().prepare('DELETE FROM favorites WHERE user_id = ? AND product_id = ?').run(userId, productId);
}
function toggle(userId, productId) {
  if (has(userId, productId)) { remove(userId, productId); return false; }
  add(userId, productId); return true;
}
function countForProduct(productId) {
  return getDb().prepare('SELECT COUNT(*) AS c FROM favorites WHERE product_id = ?').get(productId).c;
}
function mergeFromSession(userId, ids) {
  const stmt = getDb().prepare('INSERT OR IGNORE INTO favorites (user_id, product_id) VALUES (?, ?)');
  getDb().transaction(() => ids.forEach((id) => stmt.run(userId, id)))();
}

module.exports = { idsForUser, has, add, remove, toggle, countForProduct, mergeFromSession };
