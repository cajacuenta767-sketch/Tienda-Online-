'use strict';
const { getDb } = require('../db');
const { orderReference } = require('../utils/ids');

function parse(row) {
  if (!row) return row;
  try { row.data = JSON.parse(row.provider_data || '{}'); } catch (_) { row.data = {}; }
  return row;
}
function byId(id) {
  return parse(getDb().prepare('SELECT o.*, u.name AS user_name, u.email AS user_email FROM orders o LEFT JOIN users u ON u.id = o.user_id WHERE o.id = ?').get(id));
}
function byReference(reference) {
  return parse(getDb().prepare('SELECT * FROM orders WHERE reference = ?').get(reference));
}
function byProviderRef(provider, ref) {
  return parse(getDb().prepare('SELECT * FROM orders WHERE provider = ? AND provider_ref = ?').get(provider, ref));
}
function items(orderId) {
  return getDb().prepare(`SELECT oi.*, p.slug AS product_slug, p.file_name, p.version AS product_version, pl.slug AS plan_slug
    FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id LEFT JOIN plans pl ON pl.id = oi.plan_id
    WHERE oi.order_id = ? ORDER BY oi.id`).all(orderId);
}
function create({ user_id, provider, amount_cents, currency = 'USD', provider_ref = null, provider_data = {}, customer_note = null, coupon_code = null, discount_cents = 0, subtotal_cents = null }, lineItems) {
  const db = getDb();
  const insertOrder = db.prepare(`INSERT INTO orders (user_id, provider, amount_cents, currency, provider_ref, provider_data, customer_note, coupon_code, discount_cents, subtotal_cents)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const setRef = db.prepare('UPDATE orders SET reference = ? WHERE id = ?');
  const insertItem = db.prepare(`INSERT INTO order_items (order_id, item_type, product_id, plan_id, title, unit_cents, quantity)
    VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const tx = db.transaction(() => {
    const info = insertOrder.run(user_id, provider, amount_cents, currency, provider_ref, JSON.stringify(provider_data || {}), customer_note, coupon_code, discount_cents || 0, subtotal_cents ?? amount_cents + (discount_cents || 0));
    const id = Number(info.lastInsertRowid);
    setRef.run(orderReference(id), id);
    for (const it of lineItems) {
      insertItem.run(id, it.item_type, it.product_id || null, it.plan_id || null, it.title, it.unit_cents, it.quantity || 1);
    }
    return id;
  });
  return byId(tx());
}
function updateProvider(id, { provider_ref, provider_data }) {
  const current = byId(id);
  const merged = { ...(current ? current.data : {}), ...(provider_data || {}) };
  getDb().prepare("UPDATE orders SET provider_ref = COALESCE(?, provider_ref), provider_data = ?, updated_at = datetime('now') WHERE id = ?")
    .run(provider_ref ?? null, JSON.stringify(merged), id);
}
function setStatus(id, status, extra = {}) {
  const current = byId(id);
  const merged = { ...(current ? current.data : {}), ...(extra.provider_data || {}) };
  getDb().prepare(`UPDATE orders SET status = ?, provider_ref = COALESCE(?, provider_ref), provider_data = ?,
    paid_at = CASE WHEN ? = 'paid' THEN COALESCE(paid_at, datetime('now')) ELSE paid_at END, updated_at = datetime('now') WHERE id = ?`)
    .run(status, extra.provider_ref ?? null, JSON.stringify(merged), status, id);
}
function byUser(userId) {
  return getDb().prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC, id DESC').all(userId).map(parse);
}
function list({ status = '', provider = '', page = 1, perPage = 25 } = {}) {
  const db = getDb();
  const where = [];
  const params = { limit: perPage, offset: (page - 1) * perPage };
  if (status) { where.push('o.status = @status'); params.status = status; }
  if (provider) { where.push('o.provider = @provider'); params.provider = provider; }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = db.prepare(`SELECT o.*, u.name AS user_name, u.email AS user_email FROM orders o LEFT JOIN users u ON u.id = o.user_id
    ${whereSql} ORDER BY o.created_at DESC, o.id DESC LIMIT @limit OFFSET @offset`).all(params).map(parse);
  const total = db.prepare(`SELECT COUNT(*) AS c FROM orders o ${whereSql}`).get(params).c;
  return { rows, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) };
}
function recent(limit = 8) {
  return getDb().prepare('SELECT o.*, u.name AS user_name, u.email AS user_email FROM orders o LEFT JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC, o.id DESC LIMIT ?').all(limit).map(parse);
}
function pendingManual() {
  return getDb().prepare(`SELECT o.*, u.name AS user_name, u.email AS user_email FROM orders o LEFT JOIN users u ON u.id = o.user_id
    WHERE o.status = 'pending' AND o.provider IN ('btc','manual') ORDER BY o.created_at DESC`).all().map(parse);
}
function stats() {
  const db = getDb();
  return {
    paid: db.prepare("SELECT COUNT(*) AS c, COALESCE(SUM(amount_cents),0) AS revenue FROM orders WHERE status = 'paid'").get(),
    pending: db.prepare("SELECT COUNT(*) AS c FROM orders WHERE status = 'pending'").get().c,
  };
}
function purchasedProductIds(userId) {
  return getDb().prepare(`SELECT DISTINCT oi.product_id FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE o.user_id = ? AND o.status = 'paid' AND oi.item_type = 'product' AND oi.product_id IS NOT NULL`).all(userId).map((r) => r.product_id);
}
function userOwnsProduct(userId, productId) {
  return Boolean(getDb().prepare(`SELECT 1 FROM order_items oi JOIN orders o ON o.id = oi.order_id
    WHERE o.user_id = ? AND o.status = 'paid' AND oi.product_id = ? LIMIT 1`).get(userId, productId));
}

module.exports = { byId, byReference, byProviderRef, items, create, updateProvider, setStatus, byUser, list, recent, pendingManual, stats, purchasedProductIds, userOwnsProduct };
