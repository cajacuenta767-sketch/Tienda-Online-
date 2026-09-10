'use strict';
const { getDb } = require('../db');

function create({ name, email, subject, message }) {
  getDb().prepare('INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)').run(name, email, subject, message);
}
function list() {
  return getDb().prepare('SELECT * FROM contact_messages ORDER BY created_at DESC').all();
}
function markRead(id) {
  getDb().prepare("UPDATE contact_messages SET read_at = datetime('now') WHERE id = ?").run(id);
}
function remove(id) {
  getDb().prepare('DELETE FROM contact_messages WHERE id = ?').run(id);
}
function unreadCount() {
  return getDb().prepare('SELECT COUNT(*) AS c FROM contact_messages WHERE read_at IS NULL').get().c;
}

module.exports = { create, list, markRead, remove, unreadCount };
