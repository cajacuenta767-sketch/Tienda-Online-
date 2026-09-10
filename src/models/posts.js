'use strict';
const { getDb } = require('../db');
const { uniqueSlug } = require('../utils/slug');

function slugExists(slug, exceptId = null) { return Boolean(getDb().prepare('SELECT id FROM posts WHERE slug = ? AND (? IS NULL OR id != ?)').get(slug, exceptId, exceptId)); }
function published({ page = 1, perPage = 9 } = {}) {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM posts WHERE status = 'published' ORDER BY published_at DESC, id DESC LIMIT ? OFFSET ?").all(perPage, (page - 1) * perPage);
  const total = db.prepare("SELECT COUNT(*) AS c FROM posts WHERE status = 'published'").get().c;
  return { rows, total, page, perPage, pages: Math.max(1, Math.ceil(total / perPage)) };
}
function latest(limit = 3) { return getDb().prepare("SELECT * FROM posts WHERE status = 'published' ORDER BY published_at DESC, id DESC LIMIT ?").all(limit); }
function bySlug(slug) { return getDb().prepare('SELECT * FROM posts WHERE slug = ?').get(slug); }
function byId(id) { return getDb().prepare('SELECT * FROM posts WHERE id = ?').get(id); }
function all() { return getDb().prepare('SELECT * FROM posts ORDER BY updated_at DESC').all(); }
function normalize(d) {
  return { title: d.title, slug: d.slug, excerpt: d.excerpt || '', body: d.body || '', cover_path: d.cover_path || null, status: d.status === 'published' ? 'published' : 'draft', published_at: d.published_at || null };
}
function create(data) {
  const slug = uniqueSlug(data.slug || data.title, (s) => slugExists(s));
  const n = normalize({ ...data, slug });
  if (n.status === 'published' && !n.published_at) n.published_at = new Date().toISOString().slice(0, 10);
  const info = getDb().prepare('INSERT INTO posts (title, slug, excerpt, body, cover_path, status, published_at) VALUES (@title, @slug, @excerpt, @body, @cover_path, @status, @published_at)').run(n);
  return byId(info.lastInsertRowid);
}
function update(id, data) {
  const slug = uniqueSlug(data.slug || data.title, (s) => slugExists(s, id));
  const n = normalize({ ...data, slug });
  if (n.status === 'published' && !n.published_at) n.published_at = new Date().toISOString().slice(0, 10);
  getDb().prepare("UPDATE posts SET title=@title, slug=@slug, excerpt=@excerpt, body=@body, cover_path=COALESCE(@cover_path, cover_path), status=@status, published_at=@published_at, updated_at=datetime('now') WHERE id=@id").run({ ...n, id });
  return byId(id);
}
function remove(id) { getDb().prepare('DELETE FROM posts WHERE id = ?').run(id); }
function upsertBySlug(data) { const e = bySlug(data.slug); return e ? update(e.id, data) : create(data); }

module.exports = { published, latest, bySlug, byId, all, create, update, remove, upsertBySlug, slugExists };
