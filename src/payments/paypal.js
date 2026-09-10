'use strict';
const { defaults } = require('./base');
const config = require('../config');
const { toDecimal } = require('../utils/money');

const BASE = () => (config.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com');
let token = { value: null, exp: 0 };

async function getToken() {
  if (token.value && Date.now() < token.exp) return token.value;
  const auth = Buffer.from(`${config.PAYPAL_CLIENT_ID}:${config.PAYPAL_CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${BASE()}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw Object.assign(new Error('No se pudo autenticar con PayPal.'), { status: 502 });
  const json = await res.json();
  token = { value: json.access_token, exp: Date.now() + (Number(json.expires_in || 3600) - 60) * 1000 };
  return token.value;
}

async function api(path, { method = 'POST', body } = {}) {
  const t = await getToken();
  const res = await fetch(`${BASE()}${path}`, {
    method,
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((json && (json.message || json.error_description)) || 'Error de PayPal');
    err.status = 502;
    err.details = json;
    throw err;
  }
  return json;
}

module.exports = defaults({
  id: 'paypal',
  name: 'PayPal',
  description: 'Paga con tu cuenta PayPal o con tarjeta a través de PayPal.',
  kind: 'inline',
  isEnabled: () => Boolean(config.PAYPAL_CLIENT_ID && config.PAYPAL_CLIENT_SECRET),
  clientConfig: () => ({ clientId: config.PAYPAL_CLIENT_ID, currency: 'USD', env: config.PAYPAL_ENV }),
  async createCheckout({ order }) {
    const pp = await api('/v2/checkout/orders', {
      body: {
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: String(order.id),
          custom_id: String(order.id),
          description: `DevMarket ${order.reference}`,
          amount: { currency_code: order.currency || 'USD', value: toDecimal(order.amount_cents) },
        }],
        application_context: {
          brand_name: 'DevMarket',
          user_action: 'PAY_NOW',
          return_url: `${config.BASE_URL}/pago/paypal/retorno`,
          cancel_url: `${config.BASE_URL}/pago/paypal/cancelar?order=${order.id}`,
        },
      },
    });
    return { type: 'json', body: { paypalOrderId: pp.id, orderId: order.id }, providerRef: pp.id };
  },
  async capture(paypalOrderId) {
    const result = await api(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`);
    const unit = (result.purchase_units && result.purchase_units[0]) || {};
    const capture = unit.payments && unit.payments.captures && unit.payments.captures[0];
    return {
      orderId: Number(unit.custom_id || unit.reference_id),
      paid: result.status === 'COMPLETED',
      providerRef: result.id,
      providerData: { capture_id: capture && capture.id, payer_email: result.payer && result.payer.email_address, status: result.status },
    };
  },
});
