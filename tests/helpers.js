'use strict';
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret-test-secret-test-secret';
process.env.DB_PATH = ':memory:';
process.env.STORAGE_DIR = require('path').join(require('os').tmpdir(), `devmarket-test-storage-${process.pid}`);
process.env.UPLOADS_DIR = require('path').join(require('os').tmpdir(), `devmarket-test-uploads-${process.pid}`);
process.env.ADMIN_EMAIL = 'admin@test.local';
process.env.ADMIN_PASSWORD = 'admin-test-123';
process.env.WHATSAPP_NUMBER = '51999999999';
process.env.BTC_ADDRESS = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
process.env.STRIPE_SECRET_KEY = '';
process.env.PAYPAL_CLIENT_ID = '';

const request = require('supertest');
const { createApp } = require('../src/app');
const { seed } = require('../scripts/seed');

let app = null;

function buildApp() {
  if (!app) {
    app = createApp();
    seed({ minimal: true });
  }
  return app;
}

function extractCsrf(html) {
  const m = String(html).match(/name="_csrf" value="([^"]+)"/);
  return m ? m[1] : '';
}

function cookiesFrom(res, previous = '') {
  const set = res.headers['set-cookie'] || [];
  const jar = new Map(previous.split('; ').filter(Boolean).map((c) => c.split('=')));
  for (const c of set) {
    const [pair] = c.split(';');
    const [k, v] = pair.split('=');
    jar.set(k, v);
  }
  return Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

/** Sesión HTTP simple con cookies persistentes y token CSRF. */
class Session {
  constructor(application) {
    this.app = application;
    this.cookie = '';
  }
  async get(url) {
    const res = await request(this.app).get(url).set('Cookie', this.cookie);
    this.cookie = cookiesFrom(res, this.cookie);
    return res;
  }
  async csrf(url = '/login') {
    const res = await this.get(url);
    return extractCsrf(res.text);
  }
  async post(url, body = {}, { csrfFrom = '/login', json = false } = {}) {
    const token = await this.csrf(csrfFrom);
    let req = request(this.app).post(url).set('Cookie', this.cookie);
    if (json) req = req.set('X-CSRF-Token', token).set('Accept', 'application/json').send(body);
    else req = req.type('form').send({ _csrf: token, ...body });
    const res = await req;
    this.cookie = cookiesFrom(res, this.cookie);
    return res;
  }
  async login(email, password) {
    return this.post('/login', { email, password, next: '/cuenta' });
  }
  async register(name, email, password) {
    return this.post('/registro', { name, email, password, password_confirm: password, next: '/cuenta' }, { csrfFrom: '/registro' });
  }
}

module.exports = { buildApp, Session, extractCsrf, request };
