'use strict';
const { getDb } = require('../db');

const ACTIVE = "m.status = 'active' AND (m.ends_at IS NULL OR m.ends_at > datetime('now'))";

function activeForUser(userId) {
  return getDb().prepare(`SELECT m.*, p.name AS plan_name, p.slug AS plan_slug FROM memberships m LEFT JOIN plans p ON p.id = m.plan_id
    WHERE m.user_id = ? AND ${ACTIVE} ORDER BY (m.ends_at IS NULL) DESC, m.ends_at DESC LIMIT 1`).get(userId);
}
function allForUser(userId) {
  return getDb().prepare(`SELECT m.*, p.name AS plan_name FROM memberships m LEFT JOIN plans p ON p.id = m.plan_id WHERE m.user_id = ? ORDER BY m.created_at DESC`).all(userId);
}
function create({ user_id, plan_id, order_id, duration_days }) {
  const db = getDb();
  const info = db.prepare(`INSERT INTO memberships (user_id, plan_id, order_id, starts_at, ends_at)
    VALUES (?, ?, ?, datetime('now'), CASE WHEN ? IS NULL THEN NULL ELSE datetime('now', '+' || ? || ' days') END)`)
    .run(user_id, plan_id, order_id, duration_days ?? null, duration_days ?? null);
  return db.prepare('SELECT * FROM memberships WHERE id = ?').get(info.lastInsertRowid);
}
function countActive() {
  return getDb().prepare(`SELECT COUNT(*) AS c FROM memberships m WHERE ${ACTIVE}`).get().c;
}

module.exports = { activeForUser, allForUser, create, countActive };
