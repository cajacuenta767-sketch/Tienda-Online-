'use strict';
const { getDb } = require('../db');

function byProduct(productId) {
  return getDb().prepare('SELECT * FROM changelog WHERE product_id = ? ORDER BY released_at DESC, id DESC').all(productId);
}
function byId(id) {
  return getDb().prepare('SELECT * FROM changelog WHERE id = ?').get(id);
}
function add(productId, { version, notes, released_at }) {
  const info = getDb()
    .prepare("INSERT INTO changelog (product_id, version, notes, released_at) VALUES (?, ?, ?, COALESCE(?, date('now')))")
    .run(productId, version, notes, released_at || null);
  return byId(info.lastInsertRowid);
}
function remove(id) {
  getDb().prepare('DELETE FROM changelog WHERE id = ?').run(id);
}
function recent({ page = 1, perPage = 20 } = {}) {
  const db = getDb();
  const rows = db.prepare(`SELECT c.*, p.title AS product_title, p.slug AS product_slug,
      (SELECT path FROM product_images i WHERE i.product_id = p.id ORDER BY sort_order, id LIMIT 1) AS image
    FROM changelog c JOIN products p ON p.id = c.product_id
    WHERE p.is_active = 1 ORDER BY c.released_at DESC, c.id DESC LIMIT ? OFFSET ?`).all(perPage, (page - 1) * perPage);
  const total = db.prepare('SELECT COUNT(*) AS c FROM changelog c JOIN products p ON p.id = c.product_id WHERE p.is_active = 1').get().c;
  return { rows, total };
}
function count() {
  return getDb().prepare('SELECT COUNT(*) AS c FROM changelog').get().c;
}
function replaceAll(productId, entries) {
  const db = getDb();
  db.transaction(() => {
    db.prepare('DELETE FROM changelog WHERE product_id = ?').run(productId);
    for (const e of entries) add(productId, e);
  })();
}

module.exports = { byProduct, byId, add, remove, recent, count, replaceAll };
