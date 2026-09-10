'use strict';
/**
 * Culqi (Perú): tarjetas, Yape y PagoEfectivo.
 * Flujo: la vista carga Culqi Checkout JS con CULQI_PUBLIC_KEY → el cliente obtiene un token →
 * el navegador envía { token, orderId } a POST /pago/culqi/cargar → el servidor crea el cargo con
 * CULQI_SECRET_KEY en https://api.culqi.com/v2/charges → si responde OK se marca el pedido pagado.
 * Se habilita automáticamente cuando ambas claves existen en el .env.
 */
const { defaults } = require('./base');
const config = require('../config');
const settings = require('../models/settings');

async function api(path, body) {
  const res = await fetch(`https://api.culqi.com/v2${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.CULQI_SECRET_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((json && (json.user_message || json.merchant_message)) || 'Culqi rechazó la operación.');
    err.status = 402;
    err.details = json;
    throw err;
  }
  return json;
}

function penRate() {
  const n = Number(settings.get('pen_rate', '3.75'));
  return Number.isFinite(n) && n > 0 ? n : 3.75;
}

module.exports = defaults({
  id: 'culqi',
  name: 'Culqi (Perú)',
  description: 'Tarjetas, Yape y PagoEfectivo en soles.',
  kind: 'inline',
  comingSoon: !(config.CULQI_PUBLIC_KEY && config.CULQI_SECRET_KEY),
  isEnabled: () => Boolean(config.CULQI_PUBLIC_KEY && config.CULQI_SECRET_KEY),
  clientConfig: () => ({ publicKey: config.CULQI_PUBLIC_KEY, currency: 'PEN', penRate: penRate() }),
  /** Crea el pedido y devuelve los datos para abrir Culqi Checkout en el navegador. */
  async createCheckout({ order }) {
    const amountPen = Math.round(order.amount_cents * penRate());
    return { type: 'json', body: { orderId: order.id, reference: order.reference, amount: amountPen, currency: 'PEN', publicKey: config.CULQI_PUBLIC_KEY }, providerData: { amount_pen_cents: amountPen, pen_rate: penRate() } };
  },
  /** Cobra con el token generado por Culqi Checkout. */
  async charge({ order, token, email }) {
    const amountPen = (order.data && order.data.amount_pen_cents) || Math.round(order.amount_cents * penRate());
    const charge = await api('/charges', {
      amount: amountPen,
      currency_code: 'PEN',
      email,
      source_id: token,
      description: `DevMarket ${order.reference}`,
      metadata: { order_id: String(order.id), reference: order.reference },
    });
    const ok = charge.object === 'charge' && (charge.outcome ? charge.outcome.type === 'venta_exitosa' : true);
    return { orderId: order.id, paid: ok, providerRef: charge.id, providerData: { charge_id: charge.id, outcome: charge.outcome && charge.outcome.type, amount_pen_cents: amountPen } };
  },
});
