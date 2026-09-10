'use strict';
const crypto = require('crypto');

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

function attach(req, res, next) {
  if (req.session) {
    if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(24).toString('hex');
    res.locals.csrfToken = req.session.csrfToken;
  }
  next();
}

function tokenFrom(req) {
  return (
    (req.body && req.body._csrf) ||
    req.get('x-csrf-token') ||
    (req.query && req.query._csrf) ||
    ''
  );
}

function verify(req, res, next) {
  if (SAFE.has(req.method)) return next();
  const expected = req.session && req.session.csrfToken;
  const given = String(tokenFrom(req) || '');
  if (expected && given && given.length === expected.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
    return next();
  }
  const err = new Error('El formulario expiró o el token de seguridad no es válido. Vuelve a intentarlo.');
  err.status = 403;
  err.code = 'EBADCSRFTOKEN';
  return next(err);
}

module.exports = { attach, verify };
