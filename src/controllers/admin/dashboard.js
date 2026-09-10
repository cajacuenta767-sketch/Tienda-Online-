'use strict';
const products = require('../../models/products');
const orders = require('../../models/orders');
const users = require('../../models/users');
const memberships = require('../../models/memberships');
const contactMessages = require('../../models/contactMessages');
const downloads = require('../../models/downloads');

exports.index = (req, res) => {
  const o = orders.stats();
  res.render('admin/dashboard', {
    title: 'Panel',
    stats: {
      products: products.stats(),
      revenue: o.paid.revenue,
      paidOrders: o.paid.c,
      pendingOrders: o.pending,
      users: users.count(),
      memberships: memberships.countActive(),
      downloads: downloads.count(),
      unread: contactMessages.unreadCount(),
    },
    pendingManual: orders.pendingManual(),
    recentOrders: orders.recent(8),
  });
};
