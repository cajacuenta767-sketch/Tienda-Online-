(function () {
  'use strict';
  var container = document.getElementById('paypal-buttons');
  if (!container) return;
  var status = document.querySelector('[data-paypal-status]');
  var sdk = window.paypal_sdk || window.paypal;
  if (!sdk || !sdk.Buttons) {
    if (status) status.textContent = 'No se pudo cargar PayPal. Recarga la página o elige otro método.';
    return;
  }
  var csrf = container.getAttribute('data-csrf');
  var kind = container.getAttribute('data-kind');
  var ref = container.getAttribute('data-ref');
  function post(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-Token': csrf },
      body: JSON.stringify(body),
      credentials: 'same-origin',
    }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'Error'); return j; }); });
  }
  sdk.Buttons({
    style: { layout: 'vertical', shape: 'rect', color: 'gold', label: 'pay' },
    createOrder: function () {
      var body = {};
      if (kind === 'product') body.producto = ref;
      if (kind === 'plan') body.plan = ref;
      return post('/pago/paypal/crear', body).then(function (j) { return j.paypalOrderId; });
    },
    onApprove: function (data) {
      if (status) status.textContent = 'Confirmando pago…';
      return post('/pago/paypal/capturar', { paypalOrderId: data.orderID }).then(function (j) {
        window.location.href = j.redirect || '/cuenta';
      });
    },
    onError: function (err) {
      if (status) status.textContent = 'PayPal: ' + (err && err.message ? err.message : 'ocurrió un error. Intenta de nuevo.');
    },
    onCancel: function () {
      if (status) status.textContent = 'Pago cancelado. Puedes intentarlo de nuevo o elegir otro método.';
    },
  }).render('#paypal-buttons');
})();
