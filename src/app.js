'use strict';
const path = require('path');
const express = require('express');
const session = require('express-session');
const config = require('./config');
const { getDb } = require('./db');
const { SqliteStore } = require('./db/sessionStore');
const security = require('./middleware/security');
const flash = require('./middleware/flash');
const csrf = require('./middleware/csrf');
const locals = require('./middleware/locals');
const { notFound, errorHandler } = require('./middleware/errors');
const checkout = require('./controllers/checkout');
const { bootstrap } = require('./services/bootstrap');

function createApp() {
  const app = express();
  const db = getDb();
  bootstrap();

  app.disable('x-powered-by');
  if (config.IS_PROD) app.set('trust proxy', 1);
  app.set('view engine', 'ejs');
  app.set('views', config.VIEWS_DIR);
  app.locals.config = { IS_PROD: config.IS_PROD, MAX_IMAGE_MB: config.MAX_IMAGE_MB, MAX_ZIP_MB: config.MAX_ZIP_MB };

  app.use(security);
  app.use(express.static(config.PUBLIC_DIR, { maxAge: config.IS_PROD ? '7d' : 0 }));
  app.use('/uploads', express.static(config.UPLOADS_DIR, { maxAge: config.IS_PROD ? '30d' : 0, immutable: config.IS_PROD, etag: true }));

  // Webhook de Stripe: cuerpo crudo, antes de los parsers y sin sesión/CSRF.
  app.post('/pago/stripe/webhook', express.raw({ type: 'application/json', limit: '1mb' }), checkout.stripeWebhook);

  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(express.json({ limit: '1mb' }));

  app.use(session({
    name: 'devmarket.sid',
    secret: config.SESSION_SECRET,
    store: new SqliteStore(db, { purgeIntervalMs: config.IS_TEST ? 0 : 15 * 60 * 1000 }),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.IS_PROD,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }));

  app.use(flash);
  app.use(csrf.attach);
  app.use(locals);
  app.use(require('./i18n').middleware);

  require('./routes')(app);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
