'use strict';

const SYMBOLS = { USD: '$', PEN: 'S/', EUR: '€' };

function formatCents(cents, currency = 'USD') {
  const n = (Number(cents) || 0) / 100;
  const symbol = SYMBOLS[currency] || currency + ' ';
  const formatted = n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${symbol}${formatted}`;
}

function toDecimal(cents) {
  return ((Number(cents) || 0) / 100).toFixed(2);
}

function parseToCents(input) {
  if (input === null || input === undefined) return null;
  const str = String(input).trim().replace(/[^0-9.,-]/g, '');
  if (!str) return null;
  const normalized = str.includes(',') && !str.includes('.') ? str.replace(',', '.') : str.replace(/,/g, '');
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function convert(cents, rate) {
  return Math.round((Number(cents) || 0) * Number(rate || 1));
}

module.exports = { formatCents, toDecimal, parseToCents, convert };
