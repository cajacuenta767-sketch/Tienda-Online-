'use strict';
const { Router } = require('express');
const auth = require('../controllers/auth');
const csrf = require('../middleware/csrf');
const { redirectIfLoggedIn, requireLogin } = require('../middleware/auth');

const r = Router();
r.get('/login', redirectIfLoggedIn, auth.loginForm);
r.post('/login', csrf.verify, auth.login);
r.get('/registro', redirectIfLoggedIn, auth.registerForm);
r.post('/registro', csrf.verify, auth.register);
r.post('/logout', csrf.verify, auth.logout);
r.get('/recuperar', redirectIfLoggedIn, auth.forgotForm);
r.post('/recuperar', csrf.verify, auth.forgot);
r.get('/restablecer/:token', auth.resetForm);
r.post('/restablecer/:token', csrf.verify, auth.reset);
r.get('/verificar/:token', auth.verify);
r.post('/verificar/reenviar', requireLogin, csrf.verify, auth.resendVerification);

module.exports = r;
