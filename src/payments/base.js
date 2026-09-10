'use strict';
/**
 * Interfaz común de proveedores de pago.
 *
 * Cada módulo en src/payments/ exporta un objeto con:
 *   id            'whatsapp' | 'stripe' | 'paypal' | 'btc' | 'culqi'
 *   name          etiqueta para el checkout
 *   description   texto corto para la tarjeta del checkout
 *   kind          'link' | 'redirect' | 'inline' | 'manual'
 *   createsOrder  true si genera un pedido en la base de datos
 *   comingSoon    true para mostrar "Próximamente"
 *   isEnabled()   boolean según claves/ajustes configurados
 *   clientConfig() datos públicos para la vista (clientId de PayPal, etc.)
 *   createCheckout({ order, items, user, req }) → { type:'redirect', url } | { type:'render', view, data } | { type:'json', body }
 *   handleReturn?(req)  → { orderId, paid, providerRef, providerData }
 *   handleWebhook?(req) → { orderId, paid, providerRef, providerData } | null
 *   capture?(req)       → { orderId, paid, providerRef, providerData }
 *   adminConfirm?(order)→ providerData a guardar al confirmar manualmente
 */
function defaults(provider) {
  return {
    description: '',
    kind: 'redirect',
    createsOrder: true,
    comingSoon: false,
    isEnabled: () => false,
    clientConfig: () => ({}),
    async createCheckout() { throw Object.assign(new Error('Proveedor no disponible.'), { status: 503 }); },
    ...provider,
  };
}
module.exports = { defaults };
