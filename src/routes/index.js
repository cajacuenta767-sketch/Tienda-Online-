'use strict';

module.exports = function mountRoutes(app) {
  app.use(require('./public'));
  app.use(require('./auth'));
  app.use(require('./cart'));
  app.use(require('./account'));
  app.use(require('./pay'));
  app.use('/admin', require('./admin'));
};
