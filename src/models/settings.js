'use strict';
const { getDb } = require('../db');

let cache = null;

function refresh() {
  const rows = getDb().prepare('SELECT key, value FROM settings').all();
  cache = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return cache;
}

function getAll() {
  return cache || refresh();
}

function get(key, def = '') {
  const all = getAll();
  return Object.prototype.hasOwnProperty.call(all, key) ? all[key] : def;
}

function set(key, value) {
  getDb()
    .prepare(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`)
    .run(key, String(value ?? ''));
  cache = null;
}

function setMany(obj) {
  const db = getDb();
  const tx = db.transaction((entries) => {
    for (const [k, v] of entries) set(k, v);
  });
  tx(Object.entries(obj));
  cache = null;
}

function setDefaults(obj) {
  const db = getDb();
  const stmt = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  const tx = db.transaction((entries) => {
    for (const [k, v] of entries) stmt.run(k, String(v ?? ''));
  });
  tx(Object.entries(obj));
  cache = null;
}

function bool(key, def = false) {
  const v = get(key, def ? '1' : '0');
  return ['1', 'true', 'on', 'yes'].includes(String(v).toLowerCase());
}

module.exports = { getAll, get, set, setMany, setDefaults, refresh, bool, invalidate: () => { cache = null; } };
