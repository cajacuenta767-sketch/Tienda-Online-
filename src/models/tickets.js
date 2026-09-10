'use strict';
const { getDb } = require('../db');

const BASE = `SELECT t.*, u.name AS user_name, u.email AS user_email, p.title AS product_title,
  (SELECT COUNT(*) FROM ticket_messages m WHERE m.ticket_id = t.id) AS message_count
  FROM tickets t JOIN users u ON u.id = t.user_id LEFT JOIN products p ON p.id = t.product_id`;

function create({ user_id, product_id = null, subject, body }) {
  const db = getDb();
  const tx = db.transaction(() => {
    const info = db.prepare('INSERT INTO tickets (user_id, product_id, subject) VALUES (?, ?, ?)').run(user_id, product_id, subject);
    const id = Number(info.lastInsertRowid);
    db.prepare('INSERT INTO ticket_messages (ticket_id, user_id, is_admin, body) VALUES (?, ?, 0, ?)').run(id, user_id, body);
    return id;
  });
  return byId(tx());
}
function byId(id) { return getDb().prepare(`${BASE} WHERE t.id = ?`).get(id); }
function messages(ticketId) {
  return getDb().prepare('SELECT m.*, u.name AS user_name FROM ticket_messages m LEFT JOIN users u ON u.id = m.user_id WHERE m.ticket_id = ? ORDER BY m.id').all(ticketId);
}
function reply(ticketId, { user_id, is_admin, body }) {
  const db = getDb();
  db.prepare('INSERT INTO ticket_messages (ticket_id, user_id, is_admin, body) VALUES (?, ?, ?, ?)').run(ticketId, user_id, is_admin ? 1 : 0, body);
  db.prepare("UPDATE tickets SET status = ?, updated_at = datetime('now') WHERE id = ?").run(is_admin ? 'answered' : 'open', ticketId);
}
function setStatus(id, status) { getDb().prepare("UPDATE tickets SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id); }
function forUser(userId) { return getDb().prepare(`${BASE} WHERE t.user_id = ? ORDER BY t.updated_at DESC`).all(userId); }
function list({ status = '', page = 1, perPage = 30 } = {}) {
  const db = getDb();
  const where = status ? 'WHERE t.status = @status' : '';
  const params = { status, limit: perPage, offset: (page - 1) * perPage };
  const rows = db.prepare(`${BASE} ${where} ORDER BY (t.status = 'open') DESC, t.updated_at DESC LIMIT @limit OFFSET @offset`).all(params);
  const total = db.prepare(`SELECT COUNT(*) AS c FROM tickets t ${where}`).get(params).c;
  return { rows, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) };
}
function openCount() { return getDb().prepare("SELECT COUNT(*) AS c FROM tickets WHERE status = 'open'").get().c; }

module.exports = { create, byId, messages, reply, setStatus, forUser, list, openCount };
