'use strict';
const { getDb } = require('../db');
const ordersModel = require('../models/orders');
const products = require('../models/products');
const plans = require('../models/plans');
const memberships = require('../models/memberships');
const cart = require('./cart');
const coupons = require('../models/coupons');

function resolveItems(req, { kind, ref }) {
  if (kind === 'product') {
    const p = products.bySlug(ref, { withRelations: false });
    if (!p || !p.is_active) throw httpError(404, 'Producto no encontrado.');
    return [{ item_type: 'product', product_id: p.id, title: p.title, unit_cents: products.effectivePrice(p), quantity: 1, product: p }];
  }
  if (kind === 'plan') {
    const pl = plans.bySlug(ref);
    if (!pl || !pl.is_active) throw httpError(404, 'Plan no encontrado.');
    return [{ item_type: 'plan', plan_id: pl.id, title: `Membresía ${pl.name}`, unit_cents: pl.price_cents, quantity: 1, plan: pl }];
  }
  if (kind === 'cart') {
    const rows = cart.items(req);
    if (!rows.length) throw httpError(400, 'Tu carrito está vacío.');
    return rows.map((p) => ({ item_type: 'product', product_id: p.id, title: p.title, unit_cents: products.effectivePrice(p), quantity: 1, product: p }));
  }
  throw httpError(400, 'Selección de compra no válida.');
}

function couponFor(req, items) {
  const code = req.session && req.session.coupon;
  if (!code) return null;
  const result = coupons.evaluate(code, items);
  if (!result.ok) { delete req.session.coupon; return null; }
  return result;
}

function createFromSelection(req, userId, selection, providerId) {
  const items = resolveItems(req, selection);
  const subtotal = items.reduce((s, it) => s + it.unit_cents * (it.quantity || 1), 0);
  const applied = couponFor(req, items);
  const discount = applied ? applied.discount_cents : 0;
  const order = ordersModel.create({
    user_id: userId, provider: providerId, amount_cents: Math.max(0, subtotal - discount), currency: 'USD',
    coupon_code: applied ? applied.coupon.code : null, discount_cents: discount, subtotal_cents: subtotal,
  }, items);
  if (applied && req.session) delete req.session.coupon;
  return { order, items: ordersModel.items(order.id) };
}

function markPaid(orderId, { provider_ref = null, provider_data = {} } = {}) {
  const db = getDb();
  const tx = db.transaction(() => {
    const order = ordersModel.byId(orderId);
    if (!order) throw httpError(404, 'Pedido no encontrado.');
    if (order.status === 'paid') return order;
    ordersModel.setStatus(orderId, 'paid', { provider_ref, provider_data });
    if (order.coupon_code) coupons.incrementUsed(order.coupon_code);
    for (const it of ordersModel.items(orderId)) {
      if (it.item_type === 'product' && it.product_id) products.incrementSales(it.product_id, it.quantity || 1);
      if (it.item_type === 'plan' && it.plan_id && order.user_id) {
        const plan = plans.byId(it.plan_id);
        memberships.create({ user_id: order.user_id, plan_id: it.plan_id, order_id: orderId, duration_days: plan ? plan.duration_days : null });
      }
    }
    return ordersModel.byId(orderId);
  });
  return tx();
}

function cancel(orderId) {
  const order = ordersModel.byId(orderId);
  if (!order) throw httpError(404, 'Pedido no encontrado.');
  if (order.status !== 'pending') throw httpError(400, 'Solo se pueden cancelar pedidos pendientes.');
  ordersModel.setStatus(orderId, 'cancelled');
  return ordersModel.byId(orderId);
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

module.exports = { resolveItems, couponFor, createFromSelection, markPaid, cancel, httpError };
