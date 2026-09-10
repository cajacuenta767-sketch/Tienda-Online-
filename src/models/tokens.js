'use strict';
const crypto = require('crypto');
const { getDb } = require('../db');

function issue(userId, kind, ttlMinutes) {
  const token = crypto.randomBytes(24).toString('hex');
  getDb().prepare("DELETE FROM tokens WHERE user_id = ? AND kind = ? AND used_at IS NULL").run(userId, kind);
  getDb().prepare("INSERT INTO tokens (user_id, kind, token, expires_at) VALUES (?, ?, ?, datetime('now', '+' || ? || ' minutes'))").run(userId, kind, token, ttlMinutes);
  return token;
}
function find(token, kind) {
  return getDb().prepare("SELECT * FROM tokens WHERE token = ? AND kind = ? AND used_at IS NULL AND expires_at > datetime('now')").get(String(token || ''), kind);
}
function consume(id) {
  getDb().prepare("UPDATE tokens SET used_at = datetime('now') WHERE id = ?").run(id);
}

module.exports = { issue, find, consume };
