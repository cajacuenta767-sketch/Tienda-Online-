'use strict';
const { defaults } = require('./base');
const config = require('../config');

let client = null;
function stripe() {
  if (!client) {
    const Stripe = require('stripe');
    client = new Stripe(config.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  }
  return client;
}

module.exports = defaults({
  id: 'stripe',
  name: 'Tarjeta (Stripe)',
  description: 'Paga con tarjeta de crédito o débito de forma segura. Acceso inmediato tras el pago.',
  kind: 'redirect',
  isEnabled: () => Boolean(config.STRIPE_SECRET_KEY),
  async createCheckout({ order, items }) {
    const session = await stripe().checkout.sessions.create({
      mode: 'payment',
      line_items: items.map((it) => ({
        price_data: {
          currency: (order.currency || 'USD').toLowerCase(),
          unit_amount: it.unit_cents,
          product_data: { name: it.title },
        },
        quantity: it.quantity || 1,
      })),
      success_url: `${config.BASE_URL}/pago/stripe/retorno?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.BASE_URL}/pago/stripe/cancelar?order=${order.id}`,
      client_reference_id: String(order.id),
      metadata: { order_id: String(order.id), reference: order.reference },
    });
    return { type: 'redirect', url: session.url, providerRef: session.id };
  },
  async handleReturn(req) {
    const sessionId = String(req.query.session_id || '');
    if (!sessionId) throw Object.assign(new Error('Falta el identificador de sesión de Stripe.'), { status: 400 });
    const session = await stripe().checkout.sessions.retrieve(sessionId);
    return {
      orderId: Number(session.metadata && session.metadata.order_id) || Number(session.client_reference_id),
      paid: session.payment_status === 'paid',
      providerRef: session.id,
      providerData: { payment_intent: session.payment_intent, payment_status: session.payment_status },
    };
  },
  async handleWebhook(req) {
    if (!config.STRIPE_WEBHOOK_SECRET) throw Object.assign(new Error('STRIPE_WEBHOOK_SECRET no configurado.'), { status: 400 });
    const sig = req.get('stripe-signature');
    const event = stripe().webhooks.constructEvent(req.body, sig, config.STRIPE_WEBHOOK_SECRET);
    if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
      const session = event.data.object;
      if (session.payment_status !== 'paid') return null;
      return {
        orderId: Number(session.metadata && session.metadata.order_id) || Number(session.client_reference_id),
        paid: true,
        providerRef: session.id,
        providerData: { payment_intent: session.payment_intent, event_id: event.id },
      };
    }
    return null;
  },
});
