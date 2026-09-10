'use strict';
const bcrypt = require('bcryptjs');
const { getDb } = require('../db');

function findByEmail(email) {
  return getDb().prepare('SELECT * FROM users WHERE email = ?').get(String(email || '').trim());
}
function findById(id) {
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id);
}
function create({ name, email, password, role = 'user' }) {
  const hash = bcrypt.hashSync(password, 10);
  const info = getDb()
    .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(name.trim(), email.trim(), hash, role);
  return findById(info.lastInsertRowid);
}
function verifyPassword(user, password) {
  return Boolean(user) && bcrypt.compareSync(String(password || ''), user.password_hash);
}
function updatePassword(id, password) {
  getDb().prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(bcrypt.hashSync(password, 10), id);
}
function updateRole(id, role) {
  getDb().prepare("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?").run(role, id);
}
function list({ q = '', page = 1, perPage = 30 } = {}) {
  const db = getDb();
  const where = q ? 'WHERE name LIKE @q OR email LIKE @q' : '';
  const params = { q: `%${q}%`, limit: perPage, offset: (page - 1) * perPage };
  const rows = db.prepare(`SELECT u.*, (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id AND o.status='paid') AS paid_orders
    FROM users u ${where} ORDER BY created_at DESC LIMIT @limit OFFSET @offset`).all(params);
  const total = db.prepare(`SELECT COUNT(*) AS c FROM users ${where}`).get(params).c;
  return { rows, total };
}
function countAdmins() {
  return getDb().prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'").get().c;
}
function count() {
  return getDb().prepare('SELECT COUNT(*) AS c FROM users').get().c;
}

module.exports = { findByEmail, findById, create, verifyPassword, updatePassword, updateRole, list, countAdmins, count };
