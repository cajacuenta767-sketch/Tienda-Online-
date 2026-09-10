'use strict';
const { getDb } = require('../db');

function save(userId, ids) {
  getDb().prepare(`INSERT INTO carts (user_id, items, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET items = excluded.items, updated_at = excluded.updated_at, reminded_at = CASE WHEN excluded.items = carts.items THEN carts.reminded_at ELSE NULL END`).run(userId, JSON.stringify(ids));
}
function get(userId) {
  const row = getDb().prepare('SELECT * FROM carts WHERE user_id = ?').get(userId);
  if (!row) return null;
  try { row.ids = JSON.parse(row.items || '[]'); } catch (_) { row.ids = []; }
  return row;
}
function clear(userId) { getDb().prepare("UPDATE carts SET items = '[]', updated_at = datetime('now') WHERE user_id = ?").run(userId); }
function abandoned(hours = 24) {
  return getDb().prepare(`SELECT c.*, u.name, u.email FROM carts c JOIN users u ON u.id = c.user_id
    WHERE c.items != '[]' AND c.reminded_at IS NULL AND c.updated_at < datetime('now', '-' || ? || ' hours') AND u.is_blocked = 0`).all(hours)
    .map((r) => { try { r.ids = JSON.parse(r.items); } catch (_) { r.ids = []; } return r; });
}
function markReminded(userId) { getDb().prepare("UPDATE carts SET reminded_at = datetime('now') WHERE user_id = ?").run(userId); }

module.exports = { save, get, clear, abandoned, markReminded };
