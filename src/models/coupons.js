'use strict';
const { getDb } = require('../db');

function all() {
  return getDb().prepare('SELECT * FROM coupons ORDER BY created_at DESC').all();
}
function byId(id) {
  return getDb().prepare('SELECT * FROM coupons WHERE id = ?').get(id);
}
function byCode(code) {
  return getDb().prepare('SELECT * FROM coupons WHERE code = ?').get(String(code || '').trim());
}
function normalize(d) {
  return {
    code: String(d.code || '').trim().toUpperCase().replace(/\s+/g, ''),
    type: d.type === 'fixed' ? 'fixed' : 'percent',
    value: Math.max(1, Number(d.value) || 0),
    min_amount_cents: Number(d.min_amount_cents) || 0,
    max_uses: d.max_uses ? Number(d.max_uses) : null,
    applies_to: ['all', 'products', 'plans'].includes(d.applies_to) ? d.applies_to : 'all',
    expires_at: d.expires_at || null,
    is_active: d.is_active ? 1 : 0,
  };
}
function create(data) {
  const info = getDb().prepare(`INSERT INTO coupons (code, type, value, min_amount_cents, max_uses, applies_to, expires_at, is_active)
    VALUES (@code, @type, @value, @min_amount_cents, @max_uses, @applies_to, @expires_at, @is_active)`).run(normalize(data));
  return byId(info.lastInsertRowid);
}
function update(id, data) {
  getDb().prepare(`UPDATE coupons SET code=@code, type=@type, value=@value, min_amount_cents=@min_amount_cents, max_uses=@max_uses,
    applies_to=@applies_to, expires_at=@expires_at, is_active=@is_active WHERE id=@id`).run({ ...normalize(data), id });
  return byId(id);
}
function remove(id) {
  getDb().prepare('DELETE FROM coupons WHERE id = ?').run(id);
}
function upsertByCode(data) {
  const existing = byCode(data.code);
  return existing ? update(existing.id, data) : create(data);
}
function incrementUsed(code) {
  getDb().prepare('UPDATE coupons SET used_count = used_count + 1 WHERE code = ?').run(code);
}

/** Devuelve { ok, error?, coupon?, discount_cents? } para un conjunto de ítems. */
function evaluate(code, items) {
  const coupon = byCode(code);
  if (!coupon) return { ok: false, error: 'El cupón no existe.' };
  if (!coupon.is_active) return { ok: false, error: 'El cupón no está activo.' };
  if (coupon.expires_at && new Date(coupon.expires_at + 'T23:59:59') < new Date()) return { ok: false, error: 'El cupón ha vencido.' };
  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) return { ok: false, error: 'El cupón alcanzó su límite de usos.' };
  const eligible = items.filter((it) => coupon.applies_to === 'all' || (coupon.applies_to === 'products' && it.item_type === 'product') || (coupon.applies_to === 'plans' && it.item_type === 'plan'));
  const base = eligible.reduce((s, it) => s + it.unit_cents * (it.quantity || 1), 0);
  if (!base) return { ok: false, error: 'El cupón no aplica a estos productos.' };
  if (base < coupon.min_amount_cents) return { ok: false, error: `El cupón requiere una compra mínima de $${(coupon.min_amount_cents / 100).toFixed(2)}.` };
  const discount = coupon.type === 'percent' ? Math.round(base * Math.min(coupon.value, 100) / 100) : Math.min(coupon.value, base);
  return { ok: true, coupon, discount_cents: discount };
}

module.exports = { all, byId, byCode, create, update, remove, upsertByCode, incrementUsed, evaluate };
