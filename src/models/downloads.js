'use strict';
const { getDb } = require('../db');

function log(userId, productId) {
  getDb().prepare('INSERT INTO downloads (user_id, product_id) VALUES (?, ?)').run(userId, productId);
}
function count() {
  return getDb().prepare('SELECT COUNT(*) AS c FROM downloads').get().c;
}

module.exports = { log, count };
