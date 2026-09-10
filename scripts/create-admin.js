'use strict';
const config = require('../src/config');
const { getDb } = require('../src/db');
const users = require('../src/models/users');

getDb();
const email = process.argv[2] || config.ADMIN_EMAIL;
const password = process.argv[3] || config.ADMIN_PASSWORD;
if (!email || !password) {
  console.error('Uso: node scripts/create-admin.js <email> <password>  (o define ADMIN_EMAIL/ADMIN_PASSWORD en .env)');
  process.exit(1);
}
const existing = users.findByEmail(email);
if (existing) {
  users.updateRole(existing.id, 'admin');
  users.updatePassword(existing.id, password);
  console.log(`Usuario ${email} ahora es administrador (contraseña actualizada).`);
} else {
  users.create({ name: 'Administrador', email, password, role: 'admin' });
  console.log(`Administrador ${email} creado.`);
}
