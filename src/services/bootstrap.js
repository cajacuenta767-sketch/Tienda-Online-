'use strict';
const fs = require('fs');
const config = require('../config');
const settings = require('../models/settings');
const users = require('../models/users');

function ensureDirs() {
  for (const dir of [config.STORAGE_DIR, config.UPLOADS_DIR]) fs.mkdirSync(dir, { recursive: true });
}

function defaultSettings() {
  return {
    store_name: config.STORE_NAME,
    tagline: 'Sistemas web, scripts y plantillas listos para tu negocio',
    whatsapp_number: config.WHATSAPP_NUMBER,
    support_email: config.SUPPORT_EMAIL,
    btc_address: config.BTC_ADDRESS,
    btc_usd_rate: config.BTC_USD_RATE,
    currency: config.CURRENCY,
    show_pen: '0',
    pen_rate: '3.75',
    hero_eyebrow: 'Marketplace de software hecho a medida',
    hero_title: 'Código listo para vender, instalar y crecer',
    hero_subtitle: 'Compra sistemas web completos con código fuente, demo en vivo y actualizaciones incluidas. Instálalo hoy en tu servidor.',
    promo_banner_text: '🔥 Oferta de lanzamiento: hasta 70% de descuento en sistemas seleccionados',
    promo_banner_active: '1',
    footer_text: 'Software con código fuente completo, demo en vivo y soporte directo.',
    terms_updated_at: new Date().toISOString().slice(0, 10),
    facebook_url: '',
    instagram_url: '',
    youtube_url: '',
  };
}

function ensureAdminFromEnv() {
  if (users.countAdmins() > 0) return null;
  if (!config.ADMIN_EMAIL || !config.ADMIN_PASSWORD) return null;
  const existing = users.findByEmail(config.ADMIN_EMAIL);
  if (existing) {
    users.updateRole(existing.id, 'admin');
    return existing;
  }
  return users.create({ name: 'Administrador', email: config.ADMIN_EMAIL, password: config.ADMIN_PASSWORD, role: 'admin' });
}

function bootstrap() {
  ensureDirs();
  settings.setDefaults(defaultSettings());
  ensureAdminFromEnv();
}

module.exports = { bootstrap, ensureDirs, defaultSettings, ensureAdminFromEnv };
