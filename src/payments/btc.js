'use strict';
const { defaults } = require('./base');
const config = require('../config');
const settings = require('../models/settings');
const btcRate = require('../services/btcRate');

function address() {
  return String(settings.get('btc_address', config.BTC_ADDRESS) || '').trim();
}

module.exports = defaults({
  id: 'btc',
  name: 'Bitcoin (BTC)',
  description: 'Envía el monto exacto en BTC a nuestra dirección. Confirmamos manualmente en menos de 24 h.',
  kind: 'manual',
  isEnabled: () => address().length > 20,
  clientConfig: () => ({ address: address() }),
  async createCheckout({ order }) {
    const rate = await btcRate.getUsdRate();
    const btc_amount = btcRate.toBtc(order.amount_cents, rate);
    const addr = address();
    const uri = `bitcoin:${addr}?amount=${btc_amount}&label=${encodeURIComponent('DevMarket ' + order.reference)}`;
    return {
      type: 'redirect',
      url: `/pago/btc/${order.id}`,
      providerRef: addr,
      providerData: { btc_amount, rate, uri, address: addr },
    };
  },
  adminConfirm() {
    return { confirmed_by: 'admin', confirmed_at: new Date().toISOString() };
  },
});
