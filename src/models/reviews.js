'use strict';
const { getDb } = require('../db');

const BASE = `SELECT r.*, u.name AS user_name, p.title AS product_title, p.slug AS product_slug
  FROM reviews r JOIN users u ON u.id = r.user_id JOIN products p ON p.id = r.product_id`;

function approvedForProduct(productId) {
  return getDb().prepare(`${BASE} WHERE r.product_id = ? AND r.status = 'approved' ORDER BY r.created_at DESC`).all(productId);
}
function byUserAndProduct(userId, productId) {
  return getDb().prepare(`${BASE} WHERE r.user_id = ? AND r.product_id = ?`).get(userId, productId);
}
function byId(id) {
  return getDb().prepare(`${BASE} WHERE r.id = ?`).get(id);
}
function create({ product_id, user_id, rating, title, body, status = 'pending' }) {
  const info = getDb().prepare(`INSERT INTO reviews (product_id, user_id, rating, title, body, status) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(product_id, user_id) DO UPDATE SET rating = excluded.rating, title = excluded.title, body = excluded.body, status = excluded.status, created_at = datetime('now')`)
    .run(product_id, user_id, rating, title, body, status);
  return byUserAndProduct(user_id, product_id);
}
function setStatus(id, status) {
  getDb().prepare('UPDATE reviews SET status = ? WHERE id = ?').run(status, id);
}
function remove(id) {
  getDb().prepare('DELETE FROM reviews WHERE id = ?').run(id);
}
function summary(productId) {
  return getDb().prepare(`SELECT COUNT(*) AS count, COALESCE(AVG(rating), 0) AS avg,
    SUM(rating = 5) AS s5, SUM(rating = 4) AS s4, SUM(rating = 3) AS s3, SUM(rating = 2) AS s2, SUM(rating = 1) AS s1
    FROM reviews WHERE product_id = ? AND status = 'approved'`).get(productId);
}
function list({ status = '', page = 1, perPage = 30 } = {}) {
  const db = getDb();
  const where = status ? 'WHERE r.status = @status' : '';
  const params = { status, limit: perPage, offset: (page - 1) * perPage };
  const rows = db.prepare(`${BASE} ${where} ORDER BY r.created_at DESC LIMIT @limit OFFSET @offset`).all(params);
  const total = db.prepare(`SELECT COUNT(*) AS c FROM reviews r ${where}`).get(params).c;
  return { rows, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) };
}
function pendingCount() {
  return getDb().prepare("SELECT COUNT(*) AS c FROM reviews WHERE status = 'pending'").get().c;
}
function latestApproved(limit = 6) {
  return getDb().prepare(`${BASE} WHERE r.status = 'approved' AND p.is_active = 1 ORDER BY r.created_at DESC LIMIT ?`).all(limit);
}

module.exports = { approvedForProduct, byUserAndProduct, byId, create, setStatus, remove, summary, list, pendingCount, latestApproved };
