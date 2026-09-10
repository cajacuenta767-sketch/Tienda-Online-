'use strict';
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

function migrate(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  const applied = new Set(db.prepare('SELECT name FROM schema_migrations').all().map((r) => r.name));
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  const insert = db.prepare('INSERT INTO schema_migrations (name) VALUES (?)');
  const run = db.transaction((name, sql) => {
    db.exec(sql);
    insert.run(name);
  });
  const ran = [];
  for (const file of files) {
    if (applied.has(file)) continue;
    run(file, fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'));
    ran.push(file);
  }
  return ran;
}

module.exports = { migrate };
