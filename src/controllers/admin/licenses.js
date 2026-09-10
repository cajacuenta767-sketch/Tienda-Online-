'use strict';
const licenses = require('../../models/licenses');
const v = require('../../utils/validate');

exports.index = (req, res) => {
  const q = v.str(req.query.q, 100);
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  res.render('admin/licenses/index', { title: 'Licencias', result: licenses.list({ q, page }), q });
};
exports.update = (req, res, next) => {
  const lic = licenses.byId(Number(req.params.id));
  if (!lic) return next();
  const action = req.body.action;
  if (action === 'revoke') licenses.setStatus(lic.id, 'revoked');
  else if (action === 'activate') licenses.setStatus(lic.id, 'active');
  else if (action === 'reset') licenses.resetActivations(lic.id);
  else if (action === 'max') licenses.setMaxActivations(lic.id, parseInt(req.body.max_activations, 10) || 1);
  req.flash('success', 'Licencia actualizada.');
  return res.redirect('/admin/licencias');
};
