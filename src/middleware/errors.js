'use strict';
const config = require('../config');

function notFound(req, res) {
  res.status(404);
  if (req.originalUrl.startsWith('/api') || req.is('application/json')) {
    return res.json({ error: 'No encontrado' });
  }
  return res.render('errors/404', { title: 'Página no encontrada' });
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Ocurrió un error inesperado.';
  if (err.code === 'LIMIT_FILE_SIZE') {
    status = 413;
    message = `El archivo supera el tamaño máximo permitido (${config.MAX_ZIP_MB} MB para ZIP, ${config.MAX_IMAGE_MB} MB por imagen).`;
  } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    status = 400;
    message = 'Se envió un archivo en un campo no esperado.';
  }
  if (status >= 500 && !config.IS_TEST) console.error(err);
  res.status(status);
  const wantsJson = req.xhr || req.is('application/json') || (req.get('accept') || '').includes('application/json');
  if (wantsJson) return res.json({ error: message });
  if (status === 404) return res.render('errors/404', { title: 'Página no encontrada' });
  if (err.code === 'EBADCSRFTOKEN' || status === 413 || status === 400) {
    if (req.flash) req.flash('error', message);
    const back = req.get('Referer');
    if (back && back.startsWith(config.BASE_URL)) return res.redirect(back);
  }
  return res.render('errors/500', {
    title: status === 403 ? 'Acceso denegado' : 'Error',
    status,
    message: status >= 500 && config.IS_PROD ? 'Ocurrió un error inesperado. Inténtalo de nuevo.' : message,
  });
}

module.exports = { notFound, errorHandler };
