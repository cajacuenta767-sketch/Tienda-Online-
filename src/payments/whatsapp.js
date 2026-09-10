'use strict';
const { defaults } = require('./base');
const settings = require('../models/settings');
const config = require('../config');
const { formatCents } = require('../utils/money');

function number() {
  return String(settings.get('whatsapp_number', config.WHATSAPP_NUMBER) || '').replace(/\D/g, '');
}

function buildLink({ title, priceCents, url, kind = 'product' }) {
  const store = settings.get('store_name', 'DevMarket');
  const what = kind === 'plan' ? 'la membresía' : 'el producto';
  const text = `Hola ${store}, quiero comprar ${what} «${title}» (${formatCents(priceCents)}). ${url ? 'Enlace: ' + url : ''}`.trim();
  return `https://wa.me/${number()}?text=${encodeURIComponent(text)}`;
}

module.exports = defaults({
  id: 'whatsapp',
  name: 'WhatsApp',
  description: 'Coordina el pago directamente con nosotros (transferencia, Yape, Plin u otro medio).',
  kind: 'link',
  createsOrder: false,
  isEnabled: () => number().length >= 8,
  clientConfig: () => ({ number: number() }),
  buildLink,
  async createCheckout({ items }) {
    const first = items[0];
    return { type: 'redirect', url: buildLink({ title: first.title, priceCents: first.unit_cents, url: '' }) };
  },
});
