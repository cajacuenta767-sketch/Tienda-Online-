'use strict';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(v, max = 5000) {
  return String(v ?? '').trim().slice(0, max);
}

function required(value, label, errors) {
  if (!String(value ?? '').trim()) errors.push(`${label} es obligatorio.`);
}

function email(value, errors) {
  if (!EMAIL_RE.test(String(value || '').trim())) errors.push('Ingresa un correo válido.');
}

function minLen(value, n, label, errors) {
  if (String(value || '').length < n) errors.push(`${label} debe tener al menos ${n} caracteres.`);
}

function url(value, errors, label = 'La URL') {
  if (!value) return;
  try {
    const u = new URL(value);
    if (!['http:', 'https:'].includes(u.protocol)) throw new Error('bad');
  } catch (_) {
    errors.push(`${label} no es válida (debe empezar por http:// o https://).`);
  }
}

module.exports = { str, required, email, minLen, url, EMAIL_RE };
