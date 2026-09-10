'use strict';
const crypto = require('crypto');
const config = require('../config');

function sign(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', config.SESSION_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}
function verify(token) {
  const [data, sig] = String(token || '').split('.');
  if (!data || !sig) return null;
  const expected = crypto.createHmac('sha256', config.SESSION_SECRET).update(data).digest('base64url');
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch (_) { return null; }
}
function issue(userId, productId) {
  return sign({ u: userId, p: productId, exp: Date.now() + config.DOWNLOAD_LINK_TTL_MIN * 60 * 1000, n: crypto.randomBytes(4).toString('hex') });
}

module.exports = { sign, verify, issue };
