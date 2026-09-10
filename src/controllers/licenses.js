'use strict';
const licenses = require('../models/licenses');

/** POST /api/licencias/validar  { key, product, domain } → { valid, ... }  */
exports.validate = (req, res) => {
  const src = req.body && Object.keys(req.body).length ? req.body : req.query;
  const key = String(src.key || src.license || '').trim();
  if (!key) return res.status(400).json({ valid: false, reason: 'missing_key' });
  const result = licenses.validate({ key, productSlug: src.product ? String(src.product) : null, domain: src.domain || req.get('origin') || '' });
  res.status(result.valid ? 200 : 403).json(result);
};
