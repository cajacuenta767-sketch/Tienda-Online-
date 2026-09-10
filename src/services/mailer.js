'use strict';
const config = require('../config');
const { getDb } = require('../db');
const settings = require('../models/settings');

let transport = null;
function isConfigured() {
  return Boolean(config.SMTP_HOST && config.MAIL_FROM);
}
function getTransport() {
  if (!transport) {
    const nodemailer = require('nodemailer');
    transport = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE,
      auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASS } : undefined,
    });
  }
  return transport;
}
function toText(html) {
  return String(html).replace(/<style[\s\S]*?<\/style>/g, '').replace(/<br\s*\/?>/g, '\n').replace(/<\/(p|div|h\d|li|tr)>/g, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim();
}

/** Encola el correo. Si hay SMTP lo envía de inmediato; si no, queda en la bandeja interna. */
async function send({ to, subject, html, kind = 'general' }) {
  const db = getDb();
  const text = toText(html);
  const info = db.prepare('INSERT INTO emails (to_email, subject, body_html, body_text, kind, status) VALUES (?, ?, ?, ?, ?, ?)')
    .run(to, subject, html, text, kind, isConfigured() ? 'queued' : 'outbox');
  const id = Number(info.lastInsertRowid);
  if (!isConfigured() || config.IS_TEST) return { id, delivered: false };
  return deliver(id);
}

async function deliver(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM emails WHERE id = ?').get(id);
  if (!row) return { id, delivered: false };
  try {
    await getTransport().sendMail({ from: config.MAIL_FROM, to: row.to_email, subject: row.subject, html: row.body_html, text: row.body_text });
    db.prepare("UPDATE emails SET status = 'sent', sent_at = datetime('now'), attempts = attempts + 1, error = NULL WHERE id = ?").run(id);
    return { id, delivered: true };
  } catch (err) {
    db.prepare("UPDATE emails SET status = 'failed', attempts = attempts + 1, error = ? WHERE id = ?").run(String(err.message || err).slice(0, 500), id);
    return { id, delivered: false, error: err.message };
  }
}

async function retryFailed(limit = 20) {
  const rows = getDb().prepare("SELECT id FROM emails WHERE status IN ('queued','failed') AND attempts < 5 ORDER BY id LIMIT ?").all(limit);
  const results = [];
  for (const r of rows) results.push(await deliver(r.id));
  return results;
}

function list({ status = '', page = 1, perPage = 30 } = {}) {
  const db = getDb();
  const where = status ? 'WHERE status = @status' : '';
  const params = { status, limit: perPage, offset: (page - 1) * perPage };
  const rows = db.prepare(`SELECT id, to_email, subject, kind, status, error, attempts, sent_at, created_at FROM emails ${where} ORDER BY id DESC LIMIT @limit OFFSET @offset`).all(params);
  const total = db.prepare(`SELECT COUNT(*) AS c FROM emails ${where}`).get(params).c;
  return { rows, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) };
}
function byId(id) {
  return getDb().prepare('SELECT * FROM emails WHERE id = ?').get(id);
}
function storeName() {
  return settings.get('store_name', 'DevMarket');
}

module.exports = { send, deliver, retryFailed, list, byId, isConfigured, storeName, toText };
