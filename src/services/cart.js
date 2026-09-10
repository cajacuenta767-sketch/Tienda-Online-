'use strict';
const products = require('../models/products');
const carts = require('../models/carts');

function persist(req) {
  if (req.currentUser) carts.save(req.currentUser.id, ids(req));
}

function ids(req) {
  const cart = (req.session && req.session.cart) || [];
  return cart.map(Number).filter((n) => Number.isInteger(n) && n > 0);
}
function add(req, productId) {
  const list = ids(req);
  if (!list.includes(productId)) list.push(productId);
  req.session.cart = list;
  persist(req);
}
function remove(req, productId) {
  req.session.cart = ids(req).filter((id) => id !== productId);
  persist(req);
}
function clear(req) {
  if (req.session) req.session.cart = [];
  if (req.currentUser) carts.clear(req.currentUser.id);
}
function restoreFromDb(req, userId) {
  const saved = carts.get(userId);
  const current = ids(req);
  if (saved && saved.ids.length) req.session.cart = Array.from(new Set([...current, ...saved.ids]));
}
function items(req) {
  const list = ids(req);
  const rows = products.byIds(list);
  const byId = new Map(rows.map((r) => [r.id, r]));
  return list.map((id) => byId.get(id)).filter(Boolean);
}
function total(rows) {
  return rows.reduce((sum, p) => sum + products.effectivePrice(p), 0);
}
function count(req) {
  return ids(req).length;
}

module.exports = { ids, add, remove, clear, items, total, count, persist, restoreFromDb };
