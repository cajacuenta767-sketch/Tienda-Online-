'use strict';
const products = require('../../models/products');
const categories = require('../../models/categories');
const images = require('../../models/productImages');
const tags = require('../../models/tags');
const changelog = require('../../models/changelog');
const uploads = require('../../services/uploads');
const { parseToCents } = require('../../utils/money');
const v = require('../../utils/validate');

function formData(body) {
  const price = parseToCents(body.price);
  const discount = parseToCents(body.discount_price);
  return {
    title: v.str(body.title, 160),
    slug: v.str(body.slug, 160),
    category_id: body.category_id ? Number(body.category_id) : null,
    short_description: v.str(body.short_description, 300),
    long_description: v.str(body.long_description, 20000),
    features: v.str(body.features, 5000),
    requirements: v.str(body.requirements, 5000),
    price_cents: price ?? 0,
    discount_cents: discount !== null && price !== null && discount < price ? discount : null,
    currency: 'USD',
    demo_url: v.str(body.demo_url, 500) || null,
    version: v.str(body.version, 40) || '1.0.0',
    license: v.str(body.license, 300) || 'Licencia estándar: uso en 1 proyecto',
    is_featured: Boolean(body.is_featured),
    is_new: Boolean(body.is_new),
    is_active: Boolean(body.is_active),
    tags: v.str(body.tags, 500),
  };
}
function validate(data) {
  const errors = [];
  v.required(data.title, 'El título', errors);
  if (data.price_cents === null || data.price_cents === undefined) errors.push('El precio no es válido.');
  v.url(data.demo_url, errors, 'La URL de la demo');
  return errors;
}
function cleanupUploaded(files) {
  for (const f of [...((files && files.images) || []), ...((files && files.zip) || [])]) uploads.removeFile(f.path);
}
function attachFiles(product, files, req) {
  const imgs = (files && files.images) || [];
  const warn = uploads.validateImages(imgs);
  if (warn) req.flash('error', warn);
  for (const f of imgs.filter((x) => x.size <= (require('../../config').MAX_IMAGE_MB * 1024 * 1024))) {
    images.add(product.id, `/uploads/${f.filename}`, product.title);
  }
  const zip = files && files.zip && files.zip[0];
  if (zip) {
    if (product.file_name) uploads.removeProductFile(product.file_name);
    products.setFile(product.id, { file_name: zip.filename, file_original_name: zip.originalname, file_size: zip.size });
  }
}

exports.index = (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const q = v.str(req.query.q, 100);
  res.render('admin/products/index', { title: 'Productos', result: products.adminList({ q, page }), q });
};
exports.newForm = (req, res) => {
  res.render('admin/products/form', { title: 'Nuevo producto', product: null, form: {}, categories: categories.all(), errors: [] });
};
exports.create = (req, res) => {
  const data = formData(req.body);
  const errors = validate(data);
  if (errors.length) {
    cleanupUploaded(req.files);
    return res.status(422).render('admin/products/form', { title: 'Nuevo producto', product: null, form: data, categories: categories.all(), errors });
  }
  const product = products.create(data);
  tags.setForProduct(product.id, data.tags);
  attachFiles(product, req.files, req);
  req.flash('success', 'Producto creado.');
  return res.redirect(`/admin/productos/${product.id}/editar`);
};
exports.editForm = (req, res, next) => {
  const product = products.byId(Number(req.params.id), { withRelations: true });
  if (!product) return next();
  res.render('admin/products/form', {
    title: `Editar: ${product.title}`,
    product,
    form: { ...product, tags: product.tags.map((t) => t.name).join(', ') },
    categories: categories.all(),
    errors: [],
  });
};
exports.update = (req, res, next) => {
  const existing = products.byId(Number(req.params.id), { withRelations: true });
  if (!existing) return next();
  const data = formData(req.body);
  const errors = validate(data);
  if (errors.length) {
    cleanupUploaded(req.files);
    return res.status(422).render('admin/products/form', { title: `Editar: ${existing.title}`, product: existing, form: data, categories: categories.all(), errors });
  }
  const product = products.update(existing.id, data);
  tags.setForProduct(product.id, data.tags);
  attachFiles(product, req.files, req);
  req.flash('success', 'Producto actualizado.');
  return res.redirect(`/admin/productos/${product.id}/editar`);
};
exports.destroy = (req, res, next) => {
  const product = products.byId(Number(req.params.id), { withRelations: true });
  if (!product) return next();
  for (const img of product.images) uploads.removeImageByWebPath(img.path);
  uploads.removeProductFile(product.file_name);
  products.remove(product.id);
  req.flash('success', `«${product.title}» eliminado.`);
  res.redirect('/admin/productos');
};
exports.deleteImage = (req, res, next) => {
  const img = images.byId(Number(req.params.imageId));
  if (!img || img.product_id !== Number(req.params.id)) return next();
  uploads.removeImageByWebPath(img.path);
  images.remove(img.id);
  req.flash('success', 'Imagen eliminada.');
  res.redirect(`/admin/productos/${req.params.id}/editar`);
};
exports.reorderImages = (req, res) => {
  const ids = [].concat(req.body.order || []).map(Number).filter(Boolean);
  images.reorder(Number(req.params.id), ids);
  req.flash('success', 'Orden de imágenes guardado.');
  res.redirect(`/admin/productos/${req.params.id}/editar`);
};
exports.addChangelog = (req, res, next) => {
  const product = products.byId(Number(req.params.id));
  if (!product) return next();
  const version = v.str(req.body.version, 40);
  const notes = v.str(req.body.notes, 5000);
  const released_at = v.str(req.body.released_at, 10) || null;
  if (!version || !notes) {
    req.flash('error', 'Versión y notas son obligatorias.');
  } else {
    changelog.add(product.id, { version, notes, released_at });
    if (req.body.update_version) products.setVersion(product.id, version);
    req.flash('success', `Versión ${version} registrada.`);
  }
  res.redirect(`/admin/productos/${product.id}/editar`);
};
exports.deleteChangelog = (req, res, next) => {
  const entry = changelog.byId(Number(req.params.entryId));
  if (!entry || entry.product_id !== Number(req.params.id)) return next();
  changelog.remove(entry.id);
  req.flash('success', 'Entrada eliminada.');
  res.redirect(`/admin/productos/${req.params.id}/editar`);
};
