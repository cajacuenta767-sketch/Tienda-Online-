'use strict';
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const config = require('../config');
const { randomToken } = require('../utils/ids');

const IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

function safeExt(name) {
  return path.extname(String(name || '')).toLowerCase().replace(/[^a-z0-9.]/g, '');
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = file.fieldname === 'zip' ? config.STORAGE_DIR : config.UPLOADS_DIR;
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    cb(null, `${randomToken(12)}${safeExt(file.originalname)}`);
  },
});

function fileFilter(req, file, cb) {
  const ext = safeExt(file.originalname);
  if (file.fieldname === 'images') {
    if (!IMAGE_MIMES.has(file.mimetype) || !IMAGE_EXTS.has(ext)) {
      return cb(Object.assign(new Error('Solo se permiten imágenes PNG, JPG, WEBP o GIF.'), { status: 400 }));
    }
    return cb(null, true);
  }
  if (file.fieldname === 'zip') {
    const okMime = ['application/zip', 'application/x-zip-compressed', 'application/octet-stream'].includes(file.mimetype);
    if (ext !== '.zip' || !okMime) {
      return cb(Object.assign(new Error('El archivo del producto debe ser un .zip.'), { status: 400 }));
    }
    return cb(null, true);
  }
  return cb(Object.assign(new Error('Campo de archivo no permitido.'), { status: 400 }));
}

const productUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.MAX_ZIP_MB * 1024 * 1024, files: 11 },
}).fields([{ name: 'images', maxCount: 10 }, { name: 'zip', maxCount: 1 }]);

function removeFile(absPath) {
  try {
    if (absPath && fs.existsSync(absPath)) fs.unlinkSync(absPath);
  } catch (_) { /* ignore */ }
}

function removeImageByWebPath(webPath) {
  if (!webPath || !webPath.startsWith('/uploads/')) return;
  removeFile(path.join(config.UPLOADS_DIR, path.basename(webPath)));
}

function removeProductFile(fileName) {
  if (!fileName) return;
  removeFile(path.join(config.STORAGE_DIR, path.basename(fileName)));
}

function validateImages(files) {
  const tooBig = (files || []).filter((f) => f.size > config.MAX_IMAGE_MB * 1024 * 1024);
  for (const f of tooBig) removeFile(f.path);
  return tooBig.length ? `Alguna imagen supera ${config.MAX_IMAGE_MB} MB y fue descartada.` : null;
}

module.exports = { productUpload, removeFile, removeImageByWebPath, removeProductFile, validateImages };
