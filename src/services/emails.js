'use strict';
const config = require('../config');
const settings = require('../models/settings');
const mailer = require('./mailer');
const { formatCents } = require('../utils/money');
const { escapeHtml } = require('../utils/format');

function layout(title, bodyHtml) {
  const store = settings.get('store_name', 'DevMarket');
  const base = config.BASE_URL;
  return `<!doctype html><html lang="es"><body style="margin:0;background:#F1F5F9;font-family:Segoe UI,Arial,sans-serif;color:#0F172A">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px">
  <table role="presentation" width="560" style="max-width:560px;width:100%;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0">
    <tr><td style="background:linear-gradient(90deg,#2563EB,#06B6D4);padding:18px 24px;color:#fff;font-weight:800;font-size:18px">${escapeHtml(store)}</td></tr>
    <tr><td style="padding:24px"><h1 style="margin:0 0 12px;font-size:22px">${escapeHtml(title)}</h1>${bodyHtml}</td></tr>
    <tr><td style="padding:16px 24px;background:#F8FAFC;color:#64748B;font-size:12px">Este correo se envió desde <a href="${base}" style="color:#2563EB">${escapeHtml(store)}</a>. Si tienes dudas responde a este mensaje o escríbenos por WhatsApp.</td></tr>
  </table></td></tr></table></body></html>`;
}
const btn = (url, label) => `<p style="margin:20px 0"><a href="${url}" style="display:inline-block;background:#2563EB;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px">${escapeHtml(label)}</a></p>`;
const p = (t) => `<p style="margin:0 0 12px;line-height:1.6;color:#334155">${t}</p>`;

async function orderConfirmed({ user, order, items, licenses = [] }) {
  const base = config.BASE_URL;
  const rows = items.map((it) => `<li>${escapeHtml(it.title)} — <b>${formatCents(it.unit_cents)}</b></li>`).join('');
  const lic = licenses.length ? p('Tus claves de licencia:') + `<ul style="font-family:monospace">${licenses.map((l) => `<li>${escapeHtml(l.key)}</li>`).join('')}</ul>` : '';
  const html = layout('¡Pago confirmado!', p(`Hola ${escapeHtml(user.name)}, tu pedido <b>${escapeHtml(order.reference)}</b> está pagado. Ya puedes descargar tus archivos desde tu cuenta.`) + `<ul>${rows}</ul>` + lic + btn(`${base}/pedidos/${order.id}`, 'Ver pedido y descargar') + p('Las actualizaciones futuras estarán disponibles en la misma sección sin costo.'));
  return mailer.send({ to: user.email, subject: `Pago confirmado · ${order.reference}`, html, kind: 'order_paid' });
}
async function orderReceived({ user, order, items }) {
  const base = config.BASE_URL;
  const html = layout('Recibimos tu pedido', p(`Hola ${escapeHtml(user.name)}, registramos el pedido <b>${escapeHtml(order.reference)}</b> por <b>${formatCents(order.amount_cents)}</b> (${escapeHtml(items.map((i) => i.title).join(', '))}).`) + p('En cuanto confirmemos el pago te avisaremos por este medio y activaremos tus descargas.') + btn(`${base}/pedidos/${order.id}`, 'Ver estado del pedido'));
  return mailer.send({ to: user.email, subject: `Pedido recibido · ${order.reference}`, html, kind: 'order_received' });
}
async function membershipExpiring({ user, membership }) {
  const html = layout('Tu membresía vence pronto', p(`Hola ${escapeHtml(user.name)}, tu plan <b>${escapeHtml(membership.plan_name || '')}</b> vence el <b>${escapeHtml(String(membership.ends_at).slice(0, 10))}</b>.`) + p('Renuévala para seguir descargando todo el catálogo y las nuevas versiones.') + btn(`${config.BASE_URL}/membresia`, 'Renovar membresía'));
  return mailer.send({ to: user.email, subject: 'Tu membresía vence pronto', html, kind: 'membership_expiring' });
}
async function newVersion({ user, product, entry }) {
  const html = layout(`Nueva versión de ${product.title}`, p(`Hola ${escapeHtml(user.name)}, publicamos la versión <b>v${escapeHtml(entry.version)}</b> de <b>${escapeHtml(product.title)}</b>.`) + `<pre style="white-space:pre-wrap;background:#F8FAFC;padding:12px;border-radius:8px;font-family:inherit;color:#334155">${escapeHtml(entry.notes)}</pre>` + btn(`${config.BASE_URL}/cuenta?tab=descargas`, 'Descargar la nueva versión'));
  return mailer.send({ to: user.email, subject: `Nueva versión v${entry.version} · ${product.title}`, html, kind: 'new_version' });
}
async function cartReminder({ user, items, coupon }) {
  const rows = items.map((it) => `<li>${escapeHtml(it.title)} — ${formatCents(it.unit_cents)}</li>`).join('');
  const html = layout('Dejaste algo en tu carrito', p(`Hola ${escapeHtml(user.name)}, estos productos siguen esperándote:`) + `<ul>${rows}</ul>` + (coupon ? p(`Usa el cupón <b style="font-family:monospace">${escapeHtml(coupon)}</b> al pagar y llévatelos con descuento.`) : '') + btn(`${config.BASE_URL}/carrito`, 'Terminar la compra'));
  return mailer.send({ to: user.email, subject: 'Tu carrito te espera', html, kind: 'cart_reminder' });
}
async function passwordReset({ user, url }) {
  const html = layout('Restablecer contraseña', p(`Hola ${escapeHtml(user.name)}, recibimos una solicitud para cambiar tu contraseña. El enlace vale 1 hora.`) + btn(url, 'Crear nueva contraseña') + p('Si no fuiste tú, ignora este correo.'));
  return mailer.send({ to: user.email, subject: 'Restablecer contraseña', html, kind: 'password_reset' });
}
async function verifyEmail({ user, url }) {
  const html = layout('Confirma tu correo', p(`Hola ${escapeHtml(user.name)}, confirma tu dirección para activar todas las funciones de tu cuenta.`) + btn(url, 'Confirmar correo'));
  return mailer.send({ to: user.email, subject: 'Confirma tu correo', html, kind: 'verify_email' });
}
async function ticketReply({ user, ticket, message }) {
  const html = layout(`Respuesta a tu ticket #${ticket.id}`, p(`<b>${escapeHtml(ticket.subject)}</b>`) + `<pre style="white-space:pre-wrap;background:#F8FAFC;padding:12px;border-radius:8px;font-family:inherit;color:#334155">${escapeHtml(message)}</pre>` + btn(`${config.BASE_URL}/cuenta/tickets/${ticket.id}`, 'Ver conversación'));
  return mailer.send({ to: user.email, subject: `Respuesta a tu ticket #${ticket.id}`, html, kind: 'ticket_reply' });
}
async function adminNotice({ subject, text }) {
  const to = settings.get('support_email', config.SUPPORT_EMAIL);
  if (!to) return null;
  return mailer.send({ to, subject, html: layout(subject, p(escapeHtml(text))), kind: 'admin_notice' });
}
async function accessGranted({ user, product }) {
  const html = layout('Tienes un nuevo producto', p(`Hola ${escapeHtml(user.name)}, te hemos dado acceso a <b>${escapeHtml(product.title)}</b>.`) + btn(`${config.BASE_URL}/cuenta?tab=descargas`, 'Ir a mis descargas'));
  return mailer.send({ to: user.email, subject: `Acceso a ${product.title}`, html, kind: 'access_granted' });
}

module.exports = { orderConfirmed, orderReceived, membershipExpiring, newVersion, cartReminder, passwordReset, verifyEmail, ticketReply, adminNotice, accessGranted, layout };
