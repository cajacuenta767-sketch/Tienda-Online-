'use strict';
const config = require('../config');
const dicts = { es: require('./es'), en: require('./en') };

function lookup(dict, key) {
  return key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), dict);
}
function translator(locale) {
  const dict = dicts[locale] || dicts.es;
  return (key, vars = {}) => {
    let value = lookup(dict, key);
    if (value === undefined) value = lookup(dicts.es, key);
    if (value === undefined) return key;
    return String(value).replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m));
  };
}

/** Middleware: idioma por ?lang, cookie o preferencia del usuario. */
function middleware(req, res, next) {
  let locale = null;
  if (req.query.lang === 'en' || req.query.lang === 'es') {
    locale = req.query.lang;
    res.cookie('dm-lang', locale, { maxAge: 365 * 24 * 3600 * 1000, sameSite: 'lax', httpOnly: false });
    if (req.currentUser) require('../models/users').setLocale(req.currentUser.id, locale);
  } else if (req.currentUser && req.currentUser.locale) {
    locale = req.currentUser.locale;
  } else {
    const cookie = (req.headers.cookie || '').match(/(?:^|;\s*)dm-lang=(es|en)/);
    locale = cookie ? cookie[1] : config.DEFAULT_LOCALE;
  }
  req.locale = locale;
  res.locals.locale = locale;
  res.locals.t = translator(locale);
  res.locals.tr = (obj, field) => (locale === 'en' && obj && obj[`${field}_en`] ? obj[`${field}_en`] : (obj ? obj[field] : ''));
  res.locals.otherLocale = locale === 'en' ? 'es' : 'en';
  next();
}

module.exports = { middleware, translator, dicts };
