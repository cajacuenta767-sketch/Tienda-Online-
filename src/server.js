'use strict';
const config = require('./config');
const { createApp } = require('./app');

const app = createApp();
app.listen(config.PORT, () => {
  console.log(`DevMarket escuchando en ${config.BASE_URL} (${config.NODE_ENV})`);
});
