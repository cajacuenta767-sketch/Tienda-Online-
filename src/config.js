'use strict';
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const ROOT = path.resolve(__dirname, '..');
const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile)) dotenv.config({ path: envFile, quiet: true });

const env = process.env;
const NODE_ENV = env.NODE_ENV || 'development';
const IS_TEST = NODE_ENV === 'test';
const IS_PROD = NODE_ENV === 'production';

function bool(v, def = false) {
  if (v === undefined || v === '') return def;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
}
function int(v, def) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
}
function resolvePath(p, def) {
  const value = p || def;
  if (value === ':memory:') return value;
  return path.isAbsolute(value) ? value : path.join(ROOT, value);
}

const EXAMPLE_SECRET = 'cambia-esto-por-una-cadena-larga-aleatoria';
const SESSION_SECRET = env.SESSION_SECRET || (IS_PROD ? '' : 'devmarket-dev-secret');
if (IS_PROD && (!SESSION_SECRET || SESSION_SECRET === EXAMPLE_SECRET || SESSION_SECRET.length < 24)) {
  throw new Error('SESSION_SECRET debe ser una cadena larga y aleatoria en producción.');
}

module.exports = {
  ROOT,
  NODE_ENV,
  IS_TEST,
  IS_PROD,
  PORT: int(env.PORT, 3000),
  BASE_URL: (env.BASE_URL || `http://localhost:${int(env.PORT, 3000)}`).replace(/\/$/, ''),
  SESSION_SECRET,
  DB_PATH: IS_TEST ? ':memory:' : resolvePath(env.DB_PATH, './data/devmarket.sqlite'),
  STORAGE_DIR: resolvePath(env.STORAGE_DIR, './storage/products'),
  UPLOADS_DIR: resolvePath(env.UPLOADS_DIR, './public/uploads'),
  PUBLIC_DIR: path.join(ROOT, 'public'),
  VIEWS_DIR: path.join(ROOT, 'views'),
  MAX_ZIP_MB: int(env.MAX_ZIP_MB, 200),
  MAX_IMAGE_MB: int(env.MAX_IMAGE_MB, 5),
  CURRENCY: env.CURRENCY || 'USD',
  ADMIN_EMAIL: env.ADMIN_EMAIL || '',
  ADMIN_PASSWORD: env.ADMIN_PASSWORD || '',
  STORE_NAME: env.STORE_NAME || 'DevMarket',
  WHATSAPP_NUMBER: env.WHATSAPP_NUMBER || '',
  SUPPORT_EMAIL: env.SUPPORT_EMAIL || '',
  BTC_ADDRESS: env.BTC_ADDRESS || '',
  BTC_USD_RATE: env.BTC_USD_RATE || '60000',
  BTC_RATE_AUTO: bool(env.BTC_RATE_AUTO, false),
  STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: env.STRIPE_WEBHOOK_SECRET || '',
  PAYPAL_CLIENT_ID: env.PAYPAL_CLIENT_ID || '',
  PAYPAL_CLIENT_SECRET: env.PAYPAL_CLIENT_SECRET || '',
  PAYPAL_ENV: env.PAYPAL_ENV === 'live' ? 'live' : 'sandbox',
  CULQI_PUBLIC_KEY: env.CULQI_PUBLIC_KEY || '',
  CULQI_SECRET_KEY: env.CULQI_SECRET_KEY || '',
  SEED_ALLOW_FRESH: bool(env.SEED_ALLOW_FRESH, false),
};
