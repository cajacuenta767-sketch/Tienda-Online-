'use strict';
const settings = require('../../models/settings');
const { defaultSettings } = require('../../services/bootstrap');
const v = require('../../utils/validate');

const KEYS = Object.keys(defaultSettings());
const BOOL_KEYS = ['promo_banner_active', 'show_pen'];

exports.form = (req, res) => {
  res.render('admin/settings', { title: 'Ajustes', values: settings.getAll(), keys: KEYS });
};
exports.save = (req, res) => {
  const values = {};
  for (const key of KEYS) {
    if (BOOL_KEYS.includes(key)) values[key] = req.body[key] ? '1' : '0';
    else values[key] = v.str(req.body[key], 2000);
  }
  values.whatsapp_number = values.whatsapp_number.replace(/\D/g, '');
  settings.setMany(values);
  req.flash('success', 'Ajustes guardados.');
  res.redirect('/admin/ajustes');
};
