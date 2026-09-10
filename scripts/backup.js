'use strict';
// Copia de seguridad: base de datos (API de backup de SQLite) + ZIPs de productos + capturas subidas.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const config = require('../src/config');
const { getDb } = require('../src/db');

async function run() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir = path.join(config.BACKUP_DIR, stamp);
  fs.mkdirSync(dir, { recursive: true });
  await getDb().backup(path.join(dir, 'devmarket.sqlite'));
  for (const [name, src] of [['products', config.STORAGE_DIR], ['uploads', config.UPLOADS_DIR]]) {
    if (!fs.existsSync(src)) continue;
    try {
      execFileSync('tar', ['-czf', path.join(dir, `${name}.tar.gz`), '-C', path.dirname(src), path.basename(src)]);
    } catch (_) {
      fs.cpSync(src, path.join(dir, name), { recursive: true });
    }
  }
  const all = fs.readdirSync(config.BACKUP_DIR).filter((d) => fs.statSync(path.join(config.BACKUP_DIR, d)).isDirectory()).sort();
  for (const old of all.slice(0, Math.max(0, all.length - config.BACKUP_KEEP))) fs.rmSync(path.join(config.BACKUP_DIR, old), { recursive: true, force: true });
  return dir;
}

if (require.main === module) {
  run().then((dir) => console.log(`Copia creada en ${dir}`)).catch((e) => { console.error(e); process.exit(1); });
}
module.exports = { run };
