'use strict';
const orders = require('../models/orders');
const memberships = require('../models/memberships');

function userOwnsProduct(userId, productId) {
  return orders.userOwnsProduct(userId, productId);
}
function hasActiveMembership(userId) {
  return Boolean(memberships.activeForUser(userId));
}
function canDownload(user, product) {
  if (!user || !product) return false;
  if (user.is_blocked) return false;
  if (!product.file_name) return false;
  if (user.role === 'admin') return true;
  if (!product.is_active) return false;
  return userOwnsProduct(user.id, product.id) || hasActiveMembership(user.id);
}

module.exports = { userOwnsProduct, hasActiveMembership, canDownload };
