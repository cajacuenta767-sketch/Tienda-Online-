'use strict';
// Tareas programadas: ejecutar con cron cada hora, p. ej.  0 * * * * cd /ruta && npm run jobs
const { getDb } = require('../src/db');
const config = require('../src/config');
const users = require('../src/models/users');
const products = require('../src/models/products');
const carts = require('../src/models/carts');
const coupons = require('../src/models/coupons');
const mailer = require('../src/services/mailer');
const emails = require('../src/services/emails');

async function membershipReminders(days = 3) {
  const db = getDb();
  const rows = db.prepare(`SELECT m.*, p.name AS plan_name FROM memberships m LEFT JOIN plans p ON p.id = m.plan_id
    WHERE m.status = 'active' AND m.ends_at IS NOT NULL AND m.reminded_at IS NULL
      AND m.ends_at > datetime('now') AND m.ends_at <= datetime('now', '+' || ? || ' days')`).all(days);
  let sent = 0;
  for (const m of rows) {
    const user = users.findById(m.user_id);
    if (!user || user.is_blocked) continue;
    await emails.membershipExpiring({ user, membership: m });
    db.prepare("UPDATE memberships SET reminded_at = datetime('now') WHERE id = ?").run(m.id);
    sent += 1;
  }
  return sent;
}

async function expireMemberships() {
  return getDb().prepare("UPDATE memberships SET status = 'expired' WHERE status = 'active' AND ends_at IS NOT NULL AND ends_at <= datetime('now')").run().changes;
}

async function cartReminders(hours = 24) {
  let sent = 0;
  const coupon = coupons.byCode('BIENVENIDO10');
  for (const cart of carts.abandoned(hours)) {
    const items = products.byIds(cart.ids).map((p) => ({ title: p.title, unit_cents: products.effectivePrice(p) }));
    if (items.length) {
      await emails.cartReminder({ user: { name: cart.name, email: cart.email }, items, coupon: coupon && coupon.is_active ? coupon.code : null });
      sent += 1;
    }
    carts.markReminded(cart.user_id);
  }
  return sent;
}

async function run() {
  const result = {
    membresias_expiradas: await expireMemberships(),
    avisos_vencimiento: await membershipReminders(),
    carritos_recordados: await cartReminders(),
    correos_reintentados: mailer.isConfigured() ? (await mailer.retryFailed()).length : 0,
  };
  return result;
}

if (require.main === module) {
  run().then((r) => { console.log('Tareas ejecutadas:', r); process.exit(0); }).catch((e) => { console.error(e); process.exit(1); });
}
module.exports = { run, membershipReminders, cartReminders, expireMemberships };
