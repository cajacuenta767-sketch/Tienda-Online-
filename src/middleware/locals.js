'use strict';
const config = require('../config');
const settings = require('../models/settings');
const categories = require('../models/categories');
const users = require('../models/users');
const products = require('../models/products');
const cart = require('../services/cart');
const payments = require('../payments');
const whatsapp = require('../payments/whatsapp');
const { formatCents, convert } = require('../utils/money');
const format = require('../utils/format');

module.exports = function locals(req, res, next) {
  const all = settings.getAll();
  res.locals.settings = all;
  res.locals.storeName = all.store_name || 'DevMarket';
  res.locals.baseUrl = config.BASE_URL;
  res.locals.currentPath = req.path;
  res.locals.title = null;
  res.locals.navCategories = categories.all();
  res.locals.cartCount = cart.count(req);
  res.locals.providers = payments.list();
  res.locals.currentUser = null;
  if (req.session && req.session.userId) {
    const user = users.findById(req.session.userId);
    if (user) {
      res.locals.currentUser = { id: user.id, name: user.name, email: user.email, role: user.role };
    } else {
      delete req.session.userId;
    }
  }
  req.currentUser = res.locals.currentUser;

  res.locals.money = (cents, currency = 'USD') => formatCents(cents, currency);
  res.locals.pen = (cents) => (all.show_pen === '1' ? formatCents(convert(cents, all.pen_rate || 3.75), 'PEN') : '');
  res.locals.fmtDate = format.fmtDate;
  res.locals.fmtDateTime = format.fmtDateTime;
  res.locals.truncate = format.truncate;
  res.locals.nl2list = format.nl2list;
  res.locals.nl2paragraphs = format.nl2paragraphs;
  res.locals.lines = format.lines;
  res.locals.effectivePrice = products.effectivePrice;
  res.locals.discountPct = products.discountPct;
  res.locals.isActive = (p) => (p === '/' ? req.path === '/' : req.path.startsWith(p));
  res.locals.waLink = (item, kind = 'product') => whatsapp.buildLink({
    title: kind === 'plan' ? `Membresía ${item.name}` : item.title,
    priceCents: kind === 'plan' ? item.price_cents : products.effectivePrice(item),
    url: kind === 'plan' ? `${config.BASE_URL}/membresia` : `${config.BASE_URL}/producto/${item.slug}`,
    kind,
  });
  res.locals.waEnabled = whatsapp.isEnabled();
  res.locals.statusLabel = (s) => ({ pending: 'Pendiente', paid: 'Pagado', cancelled: 'Cancelado' }[s] || s);
  res.locals.providerLabel = (id) => { const p = payments.get(id); return p ? p.name : id; };
  next();
};
