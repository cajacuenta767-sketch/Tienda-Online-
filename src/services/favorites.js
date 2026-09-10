'use strict';
const favoritesModel = require('../models/favorites');

function sessionIds(req) {
  return ((req.session && req.session.favorites) || []).map(Number).filter(Boolean);
}
function ids(req) {
  const user = req.currentUser;
  return user ? favoritesModel.idsForUser(user.id) : sessionIds(req);
}
function has(req, productId) {
  return ids(req).includes(Number(productId));
}
function toggle(req, productId) {
  const user = req.currentUser;
  if (user) return favoritesModel.toggle(user.id, productId);
  const list = sessionIds(req);
  const idx = list.indexOf(productId);
  if (idx >= 0) list.splice(idx, 1); else list.push(productId);
  req.session.favorites = list;
  return idx < 0;
}
function mergeOnLogin(req, userId) {
  const list = sessionIds(req);
  if (list.length) favoritesModel.mergeFromSession(userId, list);
  if (req.session) delete req.session.favorites;
}

module.exports = { ids, has, toggle, mergeOnLogin, sessionIds };
