'use strict';
const crypto = require('crypto');
const { getDb } = require('../db');

const BASE = `SELECT l.*, p.title AS product_title, p.slug AS product_slug, p.version AS product_version, u.email AS user_email, u.name AS user_name
  FROM licenses l LEFT JOIN products p ON p.id = l.product_id LEFT JOIN users u ON u.id = l.user_id`;

function generateKey() {
  const chunk = () => crypto.randomBytes(2).toString('hex').toUpperCase();
  return `DM-${chunk()}-${chunk()}-${chunk()}-${chunk()}`;
}
function parse(row) { if (row) { try { row.activationsList = JSON.parse(row.activations || '[]'); } catch (_) { row.activationsList = []; } } return row; }
function create({ user_id, product_id, order_id, max_activations = 1 }) {
  let key = generateKey();
  while (getDb().prepare('SELECT 1 FROM licenses WHERE key = ?').get(key)) key = generateKey();
  const info = getDb().prepare('INSERT INTO licenses (key, user_id, product_id, order_id, max_activations) VALUES (?, ?, ?, ?, ?)').run(key, user_id, product_id, order_id, max_activations);
  return byId(info.lastInsertRowid);
}
function byId(id) { return parse(getDb().prepare(`${BASE} WHERE l.id = ?`).get(id)); }
function byKey(key) { return parse(getDb().prepare(`${BASE} WHERE l.key = ?`).get(String(key || '').trim().toUpperCase())); }
function forUser(userId) { return getDb().prepare(`${BASE} WHERE l.user_id = ? ORDER BY l.created_at DESC`).all(userId).map(parse); }
function forOrder(orderId) { return getDb().prepare(`${BASE} WHERE l.order_id = ? ORDER BY l.id`).all(orderId).map(parse); }
function existsForOrderProduct(orderId, productId) { return Boolean(getDb().prepare('SELECT 1 FROM licenses WHERE order_id = ? AND product_id = ?').get(orderId, productId)); }
function list({ q = '', page = 1, perPage = 40 } = {}) {
  const db = getDb();
  const where = q ? 'WHERE l.key LIKE @q OR u.email LIKE @q OR p.title LIKE @q' : '';
  const params = { q: `%${q}%`, limit: perPage, offset: (page - 1) * perPage };
  const rows = db.prepare(`${BASE} ${where} ORDER BY l.created_at DESC LIMIT @limit OFFSET @offset`).all(params).map(parse);
  const total = db.prepare(`SELECT COUNT(*) AS c FROM licenses l LEFT JOIN products p ON p.id = l.product_id LEFT JOIN users u ON u.id = l.user_id ${where}`).get(params).c;
  return { rows, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) };
}
function setStatus(id, status) { getDb().prepare('UPDATE licenses SET status = ? WHERE id = ?').run(status, id); }
function setMaxActivations(id, n) { getDb().prepare('UPDATE licenses SET max_activations = ? WHERE id = ?').run(Math.max(1, n), id); }
function resetActivations(id) { getDb().prepare("UPDATE licenses SET activations = '[]' WHERE id = ?").run(id); }

/** Valida (y activa) una clave para un producto y dominio. */
function validate({ key, productSlug, domain }) {
  const lic = byKey(key);
  if (!lic) return { valid: false, reason: 'not_found' };
  if (lic.status !== 'active') return { valid: false, reason: 'revoked' };
  if (productSlug && lic.product_slug !== productSlug) return { valid: false, reason: 'product_mismatch' };
  const host = String(domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const list = lic.activationsList;
  if (host && !list.includes(host)) {
    if (list.length >= lic.max_activations) return { valid: false, reason: 'max_activations', activations: list.length, max: lic.max_activations };
    list.push(host);
  }
  getDb().prepare("UPDATE licenses SET activations = ?, last_validated_at = datetime('now') WHERE id = ?").run(JSON.stringify(list), lic.id);
  return { valid: true, product: lic.product_slug, version: lic.product_version, activations: list.length, max: lic.max_activations };
}

module.exports = { create, byId, byKey, forUser, forOrder, existsForOrderProduct, list, setStatus, setMaxActivations, resetActivations, validate, generateKey };
