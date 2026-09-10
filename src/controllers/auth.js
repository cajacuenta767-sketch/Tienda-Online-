'use strict';
const users = require('../models/users');
const v = require('../utils/validate');
const { safeNext } = require('../middleware/auth');
const favorites = require('../services/favorites');

const attempts = new Map();
const WINDOW = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function key(req, email) {
  return `${req.ip}|${String(email || '').toLowerCase()}`;
}
function isBlocked(req, email) {
  const rec = attempts.get(key(req, email));
  if (!rec) return false;
  if (Date.now() - rec.first > WINDOW) { attempts.delete(key(req, email)); return false; }
  return rec.count >= MAX_ATTEMPTS;
}
function registerFailure(req, email) {
  const k = key(req, email);
  const rec = attempts.get(k);
  if (!rec || Date.now() - rec.first > WINDOW) attempts.set(k, { first: Date.now(), count: 1 });
  else rec.count += 1;
}

exports.loginForm = (req, res) => {
  res.render('auth/login', { title: 'Iniciar sesión', next: safeNext(req.query.next), form: {} });
};

exports.login = (req, res) => {
  const email = v.str(req.body.email, 160);
  const password = String(req.body.password || '');
  const next = safeNext(req.body.next);
  const errors = [];
  if (isBlocked(req, email)) errors.push('Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.');
  const user = errors.length ? null : users.findByEmail(email);
  if (!errors.length && !users.verifyPassword(user, password)) {
    registerFailure(req, email);
    errors.push('Correo o contraseña incorrectos.');
  }
  if (errors.length) {
    return res.status(401).render('auth/login', { title: 'Iniciar sesión', next, form: { email }, errors });
  }
  const pendingFavorites = favorites.sessionIds(req);
  const pendingCart = (req.session && req.session.cart) || [];
  req.session.regenerate((err) => {
    if (err) return res.status(500).render('errors/500', { title: 'Error', status: 500, message: 'No se pudo iniciar sesión.' });
    req.session.userId = user.id;
    req.session.cart = pendingCart;
    if (pendingFavorites.length) require('../models/favorites').mergeFromSession(user.id, pendingFavorites);
    req.flash('success', `Bienvenido de nuevo, ${user.name}.`);
    return res.redirect(next);
  });
};

exports.registerForm = (req, res) => {
  res.render('auth/register', { title: 'Crear cuenta', form: {}, next: safeNext(req.query.next) });
};

exports.register = (req, res) => {
  const form = { name: v.str(req.body.name, 120), email: v.str(req.body.email, 160) };
  const password = String(req.body.password || '');
  const confirm = String(req.body.password_confirm || '');
  const next = safeNext(req.body.next);
  const errors = [];
  v.required(form.name, 'El nombre', errors);
  v.email(form.email, errors);
  v.minLen(password, 8, 'La contraseña', errors);
  if (password !== confirm) errors.push('Las contraseñas no coinciden.');
  if (!errors.length && users.findByEmail(form.email)) errors.push('Ya existe una cuenta con ese correo.');
  if (errors.length) {
    return res.status(422).render('auth/register', { title: 'Crear cuenta', form, errors, next });
  }
  const user = users.create({ name: form.name, email: form.email, password });
  const pendingFavorites = favorites.sessionIds(req);
  const pendingCart = (req.session && req.session.cart) || [];
  req.session.regenerate(() => {
    req.session.userId = user.id;
    req.session.cart = pendingCart;
    if (pendingFavorites.length) require('../models/favorites').mergeFromSession(user.id, pendingFavorites);
    req.flash('success', 'Cuenta creada. ¡Bienvenido a DevMarket!');
    res.redirect(next);
  });
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('devmarket.sid');
    res.redirect('/');
  });
};
