'use strict';
const config = require('../config');
const settings = require('../models/settings');

let cached = { rate: null, at: 0 };
const TTL = 10 * 60 * 1000;

function settingsRate() {
  const n = Number(settings.get('btc_usd_rate', config.BTC_USD_RATE));
  return Number.isFinite(n) && n > 0 ? n : 60000;
}

async function getUsdRate() {
  if (!config.BTC_RATE_AUTO || typeof fetch !== 'function') return settingsRate();
  if (cached.rate && Date.now() - cached.at < TTL) return cached.rate;
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error('rate http ' + res.status);
    const json = await res.json();
    const rate = Number(json && json.bitcoin && json.bitcoin.usd);
    if (Number.isFinite(rate) && rate > 0) {
      cached = { rate, at: Date.now() };
      return rate;
    }
  } catch (_) {
    /* fall back */
  }
  return settingsRate();
}

function toBtc(cents, rate) {
  return (cents / 100 / rate).toFixed(8);
}

module.exports = { getUsdRate, settingsRate, toBtc };
