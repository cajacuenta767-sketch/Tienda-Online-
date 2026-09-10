'use strict';

function safeNext(value) {
  const v = String(value || '');
  if (!v.startsWith('/') || v.startsWith('//') || v.includes('\\')) return '/cuenta';
  return v;
}

function requireLogin(req, res, next) {
  if (req.session && req.session.userId) return next();
  const wantsJson = req.xhr || (req.get('accept') || '').includes('application/json') || req.is('application/json');
  if (wantsJson) {
    const err = new Error('Inicia sesión para continuar.');
    err.status = 401;
    return next(err);
  }
  req.flash && req.flash('info', 'Inicia sesión para continuar.');
  return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
  }
  if (res.locals.currentUser && res.locals.currentUser.role === 'admin') return next();
  const err = new Error('No tienes permisos para acceder a esta sección.');
  err.status = 403;
  return next(err);
}

function redirectIfLoggedIn(req, res, next) {
  if (req.session && req.session.userId) return res.redirect('/cuenta');
  next();
}

module.exports = { requireLogin, requireAdmin, redirectIfLoggedIn, safeNext };
