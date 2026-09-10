'use strict';
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('../config');
const { migrate } = require('./migrate');

let db = null;

function open(dbPath = config.DB_PATH) {
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const instance = new Database(dbPath);
  if (dbPath !== ':memory:') instance.pragma('journal_mode = WAL');
  instance.pragma('foreign_keys = ON');
  migrate(instance);
  return instance;
}

function getDb() {
  if (!db) db = open();
  return db;
}

function setDb(instance) {
  db = instance;
  return db;
}

module.exports = { getDb, setDb, open };
