'use strict';
const QRCode = require('qrcode');
const payments = require('../payments');
const ordersModel = require('../models/orders');
const ordersService = require('../services/orders');
const cart = require('../services/cart');
const coupons = require('../models/coupons');

function selectionFrom(src) {
  if (src.producto || src.product) return { kind: 'product', ref: String(src.producto || src.product) };
  if (src.plan) return { kind: 'plan', ref: String(src.plan) };
  if (src.paquete || src.bundle) return { kind: 'bundle', ref: String(src.paquete || src.bundle) };
  return { kind: 'cart', ref: '' };
}

exports.show = (req, res, next) => {
  const selection = selectionFrom(req.query);
  let items;
  try {
    items = ordersService.resolveItems(req, selection);
  } catch (err) {
    if (err.status === 404) return next();
    req.flash('error', err.message);
    return res.redirect('/carrito');
  }
  const subtotal = items.reduce((s, it) => s + it.unit_cents * (it.quantity || 1), 0);
  const applied = ordersService.couponFor(req, items);
  const discount = applied ? applied.discount_cents : 0;
  res.render('checkout/checkout', {
    title: 'Finalizar compra',
    selection,
    items,
    subtotal,
    discount,
    coupon: applied ? applied.coupon : null,
    total: Math.max(0, subtotal - discount),
    providers: payments.list(),
    clientConfig: Object.fromEntries(payments.providers.map((p) => [p.id, p.clientConfig()])),
  });
};

async function createAndStart(req, res, providerId) {
  const provider = payments.get(providerId);
  const src = req.method === 'POST' ? req.body : req.query;
  const selection = selectionFrom(src);
  const wantsJson = req.is('application/json') || (req.get('accept') || '').includes('application/json');
  if (!provider || !provider.isEnabled()) {
    const msg = provider && provider.comingSoon ? `${provider ? provider.name : 'Este método'} estará disponible próximamente.` : 'Este método de pago no está configurado todavía. Elige otro método.';
    if (wantsJson) return res.status(503).json({ error: msg });
    req.flash('error', msg);
    return res.redirect(backTo(selection));
  }
  const user = res.locals.currentUser;
  if (require('../config').REQUIRE_EMAIL_VERIFICATION && !user.verified_at && user.role !== 'admin') {
    const msg = 'Verifica tu correo antes de comprar. Revisa tu bandeja o reenvía el correo desde tu cuenta.';
    if (wantsJson) return res.status(403).json({ error: msg });
    req.flash('error', msg);
    return res.redirect('/cuenta?tab=perfil');
  }
  const { order, items } = ordersService.createFromSelection(req, user.id, selection, providerId);
  if (provider.kind === 'manual') require('../services/emails').orderReceived({ user, order, items }).catch(() => {});
  if (selection.kind === 'cart') cart.clear(req);
  if (order.amount_cents === 0) {
    ordersService.markPaid(order.id, { provider_data: { free: true } });
    return res.redirect(`/pedidos/${order.id}`);
  }
  const result = await provider.createCheckout({ order, items, user, req });
  if (result.providerRef || result.providerData) {
    ordersModel.updateProvider(order.id, { provider_ref: result.providerRef || null, provider_data: result.providerData || {} });
  }
  if (result.type === 'redirect') return res.redirect(303, result.url);
  if (result.type === 'json') return res.json(result.body);
  if (result.type === 'render') return res.render(result.view, { title: 'Pago', order, ...result.data });
  return res.redirect(`/pedidos/${order.id}`);
}

function backTo(selection) {
  if (selection.kind === 'product') return `/pagar?producto=${encodeURIComponent(selection.ref)}`;
  if (selection.kind === 'bundle') return `/pagar?paquete=${encodeURIComponent(selection.ref)}`;
  if (selection.kind === 'plan') return `/pagar?plan=${encodeURIComponent(selection.ref)}`;
  return '/pagar';
}

exports.applyCoupon = (req, res, next) => {
  const selection = selectionFrom(req.body);
  const code = String(req.body.code || '').trim().toUpperCase();
  let items;
  try { items = ordersService.resolveItems(req, selection); } catch (err) { return next(err); }
  if (!code) {
    delete req.session.coupon;
    req.flash('info', 'Cupón quitado.');
    return res.redirect(backTo(selection));
  }
  const result = coupons.evaluate(code, items);
  if (!result.ok) {
    delete req.session.coupon;
    req.flash('error', result.error);
  } else {
    req.session.coupon = result.coupon.code;
    req.flash('success', `Cupón ${result.coupon.code} aplicado: ahorras ${(result.discount_cents / 100).toFixed(2)} USD.`);
  }
  return res.redirect(backTo(selection));
};

exports.whatsapp = (req, res, next) => {
  const provider = payments.get('whatsapp');
  const selection = req.query.plan ? { kind: 'plan', ref: req.params.slug } : { kind: 'product', ref: req.params.slug };
  let items;
  try { items = ordersService.resolveItems(req, selection); } catch (err) { return next(); }
  const first = items[0];
  const url = selection.kind === 'plan' ? `${res.locals.baseUrl}/membresia` : `${res.locals.baseUrl}/producto/${first.product.slug}`;
  if (!provider.isEnabled()) {
    req.flash('error', 'El número de WhatsApp no está configurado.');
    return res.redirect(selection.kind === 'plan' ? '/membresia' : `/producto/${req.params.slug}`);
  }
  res.redirect(provider.buildLink({ title: selection.kind === 'plan' ? items[0].title : first.product.title, priceCents: first.unit_cents, url, kind: selection.kind }));
};

exports.stripeCreate = (req, res, next) => createAndStart(req, res, 'stripe').catch(next);
exports.paypalCreate = (req, res, next) => createAndStart(req, res, 'paypal').catch(next);
exports.btcCreate = (req, res, next) => createAndStart(req, res, 'btc').catch(next);
exports.culqiCreate = (req, res, next) => {
  const provider = payments.get('culqi');
  if (!provider.isEnabled()) return res.status(503).render('checkout/not-configured', { title: 'Próximamente', provider });
  return createAndStart(req, res, 'culqi').catch(next);
};

exports.culqiCharge = async (req, res, next) => {
  try {
    const provider = payments.get('culqi');
    if (!provider.isEnabled()) return res.status(503).json({ error: 'Culqi no está configurado.' });
    const orderId = Number(req.body.orderId);
    const token = String(req.body.token || '');
    const order = ordersModel.byId(orderId);
    if (!order || order.user_id !== res.locals.currentUser.id || order.provider !== 'culqi') return res.status(404).json({ error: 'Pedido no encontrado.' });
    if (order.status === 'paid') return res.json({ ok: true, redirect: `/pedidos/${order.id}` });
    if (!token) return res.status(400).json({ error: 'Falta el token de Culqi.' });
    const result = await provider.charge({ order, token, email: res.locals.currentUser.email });
    if (result.paid) ordersService.markPaid(order.id, { provider_ref: result.providerRef, provider_data: result.providerData });
    else ordersModel.updateProvider(order.id, { provider_ref: result.providerRef, provider_data: result.providerData });
    return res.json({ ok: result.paid, redirect: `/pedidos/${order.id}` });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
};

exports.stripeReturn = async (req, res, next) => {
  try {
    const provider = payments.get('stripe');
    const result = await provider.handleReturn(req);
    const order = ordersModel.byId(result.orderId);
    if (!order || (order.user_id !== res.locals.currentUser.id && res.locals.currentUser.role !== 'admin')) return next();
    if (result.paid) ordersService.markPaid(order.id, { provider_ref: result.providerRef, provider_data: result.providerData });
    return res.render('checkout/success', { title: 'Pago recibido', order: ordersModel.byId(order.id), paid: result.paid });
  } catch (err) {
    return next(err);
  }
};

exports.stripeCancel = (req, res) => {
  const order = ordersModel.byId(Number(req.query.order));
  res.render('checkout/cancel', { title: 'Pago cancelado', order: order && order.user_id === res.locals.currentUser.id ? order : null });
};

exports.stripeWebhook = async (req, res) => {
  try {
    const provider = payments.get('stripe');
    const result = await provider.handleWebhook(req);
    if (result && result.paid && result.orderId) {
      ordersService.markPaid(result.orderId, { provider_ref: result.providerRef, provider_data: result.providerData });
    }
    res.json({ received: true });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
};

exports.paypalCapture = async (req, res, next) => {
  try {
    const provider = payments.get('paypal');
    const paypalOrderId = String((req.body && req.body.paypalOrderId) || req.query.token || '');
    if (!paypalOrderId) return res.status(400).json({ error: 'Falta paypalOrderId.' });
    const local = ordersModel.byProviderRef('paypal', paypalOrderId);
    if (!local || local.user_id !== res.locals.currentUser.id) return res.status(404).json({ error: 'Pedido no encontrado.' });
    if (local.status === 'paid') return res.json({ ok: true, redirect: `/pedidos/${local.id}` });
    const result = await provider.capture(paypalOrderId);
    if (result.orderId !== local.id) return res.status(400).json({ error: 'El pedido de PayPal no coincide.' });
    if (result.paid) ordersService.markPaid(local.id, { provider_ref: result.providerRef, provider_data: result.providerData });
    return res.json({ ok: result.paid, redirect: `/pedidos/${local.id}` });
  } catch (err) {
    return next(err);
  }
};

exports.paypalReturn = async (req, res, next) => {
  try {
    const token = String(req.query.token || '');
    const local = ordersModel.byProviderRef('paypal', token);
    if (!local || local.user_id !== res.locals.currentUser.id) return next();
    if (local.status !== 'paid') {
      const result = await payments.get('paypal').capture(token);
      if (result.paid) ordersService.markPaid(local.id, { provider_ref: result.providerRef, provider_data: result.providerData });
    }
    return res.redirect(`/pedidos/${local.id}`);
  } catch (err) {
    return next(err);
  }
};

exports.paypalCancel = (req, res) => {
  const order = ordersModel.byId(Number(req.query.order));
  res.render('checkout/cancel', { title: 'Pago cancelado', order: order && order.user_id === res.locals.currentUser.id ? order : null });
};

exports.btcShow = async (req, res, next) => {
  const order = ordersModel.byId(Number(req.params.orderId));
  const user = res.locals.currentUser;
  if (!order || order.provider !== 'btc' || (order.user_id !== user.id && user.role !== 'admin')) return next();
  const uri = order.data.uri || `bitcoin:${order.data.address || order.provider_ref}`;
  let qrDataUrl = '';
  try { qrDataUrl = await QRCode.toDataURL(uri, { margin: 1, width: 240 }); } catch (_) { /* ignore */ }
  res.render('checkout/btc', { title: `Pago en Bitcoin · ${order.reference}`, order, qrDataUrl, uri });
};

exports.btcConfirm = (req, res, next) => {
  const order = ordersModel.byId(Number(req.params.orderId));
  const user = res.locals.currentUser;
  if (!order || order.provider !== 'btc' || order.user_id !== user.id) return next();
  if (order.status === 'pending') {
    ordersModel.updateProvider(order.id, { provider_data: { claimed_at: new Date().toISOString(), txid: String(req.body.txid || '').trim().slice(0, 120) } });
    req.flash('success', 'Gracias. Verificaremos tu pago y activaremos tu descarga en menos de 24 horas.');
  }
  res.redirect(`/pedidos/${order.id}`);
};

exports.retry = async (req, res, next) => {
  const order = ordersModel.byId(Number(req.params.id));
  const user = res.locals.currentUser;
  if (!order || order.user_id !== user.id) return next();
  if (order.status !== 'pending') return res.redirect(`/pedidos/${order.id}`);
  const provider = payments.get(order.provider);
  if (!provider || !provider.isEnabled() || provider.kind === 'inline') return res.redirect(`/pedidos/${order.id}`);
  try {
    const items = ordersModel.items(order.id);
    const result = await provider.createCheckout({ order, items, user, req });
    if (result.providerRef || result.providerData) ordersModel.updateProvider(order.id, { provider_ref: result.providerRef || null, provider_data: result.providerData || {} });
    if (result.type === 'redirect') return res.redirect(303, result.url);
    return res.redirect(`/pedidos/${order.id}`);
  } catch (err) {
    return next(err);
  }
};
