'use strict';
const products = require('../../models/products');
const users = require('../../models/users');

exports.index = (req, res) => {
  const m = products.metrics();
  const months = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push(d.toISOString().slice(0, 7));
  }
  const byMonth = Object.fromEntries(m.months.map((r) => [r.month, r]));
  const newUsers = Object.fromEntries(users.newByMonth().map((r) => [r.month, r.users]));
  const series = months.map((month) => ({ month, label: month.slice(5) + '/' + month.slice(2, 4), revenue: (byMonth[month] || {}).revenue || 0, orders: (byMonth[month] || {}).orders || 0, users: newUsers[month] || 0 }));
  res.render('admin/metrics', { title: 'Métricas', series, metrics: m });
};
