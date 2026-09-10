'use strict';
const whatsapp = require('./whatsapp');
const stripe = require('./stripe');
const paypal = require('./paypal');
const btc = require('./btc');
const culqi = require('./culqi');

const providers = [whatsapp, stripe, paypal, btc, culqi];

function list() {
  return providers.map((p) => ({ ...p, enabled: p.isEnabled() }));
}
function get(id) {
  return providers.find((p) => p.id === id) || null;
}
function enabledIds() {
  return providers.filter((p) => p.isEnabled()).map((p) => p.id);
}

module.exports = { list, get, enabledIds, providers };
