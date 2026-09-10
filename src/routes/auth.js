'use strict';
const { Router } = require('express');
const auth = require('../controllers/auth');
const csrf = require('../middleware/csrf');
const { redirectIfLoggedIn } = require('../middleware/auth');

const r = Router();
r.get('/login', redirectIfLoggedIn, auth.loginForm);
r.post('/login', csrf.verify, auth.login);
r.get('/registro', redirectIfLoggedIn, auth.registerForm);
r.post('/registro', csrf.verify, auth.register);
r.post('/logout', csrf.verify, auth.logout);

module.exports = r;
