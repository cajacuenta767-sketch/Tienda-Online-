'use strict';
const crypto = require('crypto');

function randomToken(bytes = 16) {
  return crypto.randomBytes(bytes).toString('hex');
}

function orderReference(id) {
  return `DM-${String(id).padStart(6, '0')}`;
}

module.exports = { randomToken, orderReference };
