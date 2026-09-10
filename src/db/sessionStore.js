'use strict';
const { Store } = require('express-session');

class SqliteStore extends Store {
  constructor(db, { purgeIntervalMs = 15 * 60 * 1000 } = {}) {
    super();
    this.db = db;
    this.stmts = {
      get: db.prepare('SELECT sess, expires FROM sessions WHERE sid = ?'),
      set: db.prepare(`INSERT INTO sessions (sid, sess, expires) VALUES (?, ?, ?)
        ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expires = excluded.expires`),
      destroy: db.prepare('DELETE FROM sessions WHERE sid = ?'),
      touch: db.prepare('UPDATE sessions SET expires = ? WHERE sid = ?'),
      purge: db.prepare('DELETE FROM sessions WHERE expires < ?'),
    };
    if (purgeIntervalMs > 0) {
      this.timer = setInterval(() => this.purge(), purgeIntervalMs);
      if (this.timer.unref) this.timer.unref();
    }
  }

  expiresFor(sess) {
    const maxAge = (sess && sess.cookie && sess.cookie.maxAge) || 7 * 24 * 60 * 60 * 1000;
    const explicit = sess && sess.cookie && sess.cookie.expires ? new Date(sess.cookie.expires).getTime() : NaN;
    return Number.isFinite(explicit) ? explicit : Date.now() + maxAge;
  }

  get(sid, cb) {
    try {
      const row = this.stmts.get.get(sid);
      if (!row) return cb(null, null);
      if (row.expires < Date.now()) {
        this.stmts.destroy.run(sid);
        return cb(null, null);
      }
      return cb(null, JSON.parse(row.sess));
    } catch (err) {
      return cb(err);
    }
  }

  set(sid, sess, cb) {
    try {
      this.stmts.set.run(sid, JSON.stringify(sess), this.expiresFor(sess));
      cb && cb(null);
    } catch (err) {
      cb && cb(err);
    }
  }

  destroy(sid, cb) {
    try {
      this.stmts.destroy.run(sid);
      cb && cb(null);
    } catch (err) {
      cb && cb(err);
    }
  }

  touch(sid, sess, cb) {
    try {
      this.stmts.touch.run(this.expiresFor(sess), sid);
      cb && cb(null);
    } catch (err) {
      cb && cb(err);
    }
  }

  purge() {
    try {
      this.stmts.purge.run(Date.now());
    } catch (_) {
      /* ignore */
    }
  }
}

module.exports = { SqliteStore };
