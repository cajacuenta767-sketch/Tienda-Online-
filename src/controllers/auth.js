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
  if (!errors.length && user.is_blocked) errors.push('Esta cuenta está bloqueada. Contacta a soporte.');
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
    req.currentUser = { id: user.id };
    require('../services/cart').restoreFromDb(req, user.id);
    req.flash('success', `Bienvenido de nuevo, ${user.name}.`);
    return res.redirect(next);
  });
};

exports.registerForm = (req, res) => {
  req.session.registerStarted = Date.now();
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
  if (req.body.website) errors.push('Registro no válido.');
  const antibots = !require('../config').IS_TEST;
  if (antibots && req.session.registerStarted && Date.now() - req.session.registerStarted < 1500) errors.push('Formulario enviado demasiado rápido. Inténtalo de nuevo.');
  if (antibots && isBlocked(req, 'register')) errors.push('Demasiados registros desde esta conexión. Espera unos minutos.');
  if (!errors.length && users.findByEmail(form.email)) errors.push('Ya existe una cuenta con ese correo.');
  if (!errors.length && antibots) registerFailure(req, 'register');
  if (errors.length) {
    return res.status(422).render('auth/register', { title: 'Crear cuenta', form, errors, next });
  }
  const user = users.create({ name: form.name, email: form.email, password });
  sendVerification(user).catch(() => {});
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

async function sendVerification(user) {
  const tokens = require('../models/tokens');
  const emails = require('../services/emails');
  const config = require('../config');
  const token = tokens.issue(user.id, 'verify', 60 * 24 * 3);
  return emails.verifyEmail({ user, url: `${config.BASE_URL}/verificar/${token}` });
}
exports.sendVerification = sendVerification;

exports.verify = (req, res) => {
  const tokens = require('../models/tokens');
  const t = tokens.find(req.params.token, 'verify');
  if (!t) {
    req.flash('error', 'El enlace de verificación no es válido o ha caducado.');
    return res.redirect('/login');
  }
  tokens.consume(t.id);
  users.setVerified(t.user_id);
  req.flash('success', 'Correo verificado. ¡Gracias!');
  return res.redirect(req.session && req.session.userId ? '/cuenta' : '/login');
};

exports.resendVerification = async (req, res) => {
  const user = users.findById(res.locals.currentUser.id);
  if (user && !user.verified_at) {
    await sendVerification(user).catch(() => {});
    req.flash('success', 'Te reenviamos el correo de verificación.');
  }
  res.redirect('/cuenta');
};

exports.forgotForm = (req, res) => {
  res.render('auth/forgot', { title: 'Recuperar contraseña', form: {} });
};

exports.forgot = async (req, res) => {
  const email = v.str(req.body.email, 160);
  const user = users.findByEmail(email);
  if (user && !user.is_blocked) {
    const tokens = require('../models/tokens');
    const emails = require('../services/emails');
    const config = require('../config');
    const token = tokens.issue(user.id, 'reset', 60);
    await emails.passwordReset({ user, url: `${config.BASE_URL}/restablecer/${token}` }).catch(() => {});
  }
  req.flash('success', 'Si el correo existe, te enviamos un enlace para restablecer la contraseña.');
  res.redirect('/login');
};

exports.resetForm = (req, res) => {
  const tokens = require('../models/tokens');
  const t = tokens.find(req.params.token, 'reset');
  if (!t) {
    req.flash('error', 'El enlace ha caducado. Solicita uno nuevo.');
    return res.redirect('/recuperar');
  }
  return res.render('auth/reset', { title: 'Nueva contraseña', token: req.params.token });
};

exports.reset = (req, res) => {
  const tokens = require('../models/tokens');
  const t = tokens.find(req.params.token, 'reset');
  if (!t) {
    req.flash('error', 'El enlace ha caducado. Solicita uno nuevo.');
    return res.redirect('/recuperar');
  }
  const password = String(req.body.password || '');
  const errors = [];
  v.minLen(password, 8, 'La contraseña', errors);
  if (password !== String(req.body.password_confirm || '')) errors.push('Las contraseñas no coinciden.');
  if (errors.length) return res.status(422).render('auth/reset', { title: 'Nueva contraseña', token: req.params.token, errors });
  users.updatePassword(t.user_id, password);
  tokens.consume(t.id);
  req.flash('success', 'Contraseña actualizada. Ya puedes iniciar sesión.');
  return res.redirect('/login');
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('devmarket.sid');
    res.redirect('/');
  });
};
