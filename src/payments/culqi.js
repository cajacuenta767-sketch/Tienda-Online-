'use strict';
/**
 * Culqi (Perú) — PRÓXIMAMENTE.
 *
 * Flujo previsto:
 *  1. La vista carga Culqi Checkout JS con CULQI_PUBLIC_KEY y obtiene un token de tarjeta.
 *  2. El navegador envía el token a POST /pago/culqi/cargar.
 *  3. El servidor crea el cargo con CULQI_SECRET_KEY:
 *       POST https://api.culqi.com/v2/charges
 *       { amount: <centavos>, currency_code: 'PEN' | 'USD', email, source_id: <token> }
 *  4. Si la respuesta es exitosa se llama a ordersService.markPaid(order.id, { provider_ref: charge.id }).
 * El proveedor queda deshabilitado hasta que ambas claves existan en el .env.
 */
const { defaults } = require('./base');
const config = require('../config');

module.exports = defaults({
  id: 'culqi',
  name: 'Culqi (Perú)',
  description: 'Tarjetas, Yape y PagoEfectivo en soles. Muy pronto.',
  kind: 'inline',
  comingSoon: true,
  isEnabled: () => Boolean(config.CULQI_PUBLIC_KEY && config.CULQI_SECRET_KEY),
  clientConfig: () => ({ publicKey: config.CULQI_PUBLIC_KEY }),
  async createCheckout() {
    throw Object.assign(new Error('Culqi estará disponible próximamente.'), { status: 503, code: 'PROVIDER_SOON' });
  },
});
