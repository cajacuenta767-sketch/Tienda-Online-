'use strict';

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function lines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function nl2list(text) {
  const items = lines(text);
  if (!items.length) return '';
  return `<ul class="list">${items.map((l) => `<li>${escapeHtml(l.replace(/^[-*•]\s*/, ''))}</li>`).join('')}</ul>`;
}

function nl2paragraphs(text) {
  const blocks = String(text || '')
    .split(/\r?\n\s*\r?\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  return blocks.map((b) => `<p>${escapeHtml(b).replace(/\r?\n/g, '<br>')}</p>`).join('');
}

function fmtDate(value, opts = {}) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(String(value).replace(' ', 'T') + (String(value).length === 10 ? 'T00:00:00' : ''));
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('es-PE', { year: 'numeric', month: 'short', day: 'numeric', ...opts });
}

function fmtDateTime(value) {
  if (!value) return '';
  const d = new Date(String(value).replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('es-PE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function truncate(str, n = 120) {
  const s = String(str || '');
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
}

module.exports = { escapeHtml, lines, nl2list, nl2paragraphs, fmtDate, fmtDateTime, truncate };
