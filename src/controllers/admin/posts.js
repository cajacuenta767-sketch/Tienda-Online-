'use strict';
const posts = require('../../models/posts');
const uploads = require('../../services/uploads');
const v = require('../../utils/validate');

function formData(body) {
  return { title: v.str(body.title, 200), slug: v.str(body.slug, 200), excerpt: v.str(body.excerpt, 400), body: v.str(body.body, 50000), status: body.status === 'published' ? 'published' : 'draft', published_at: v.str(body.published_at, 10) || null };
}
exports.index = (req, res) => res.render('admin/posts/index', { title: 'Blog', posts: posts.all() });
exports.newForm = (req, res) => res.render('admin/posts/form', { title: 'Nueva entrada', post: null, form: { status: 'draft' }, errors: [] });
exports.create = async (req, res) => {
  const data = formData(req.body);
  if (!data.title) return res.status(422).render('admin/posts/form', { title: 'Nueva entrada', post: null, form: data, errors: ['El título es obligatorio.'] });
  const cover = req.files && req.files.images && req.files.images[0];
  if (cover) data.cover_path = await uploads.optimizeImage(cover);
  const post = posts.create(data);
  req.flash('success', 'Entrada creada.');
  return res.redirect(`/admin/blog/${post.id}/editar`);
};
exports.editForm = (req, res, next) => {
  const post = posts.byId(Number(req.params.id));
  if (!post) return next();
  res.render('admin/posts/form', { title: `Editar: ${post.title}`, post, form: post, errors: [] });
};
exports.update = async (req, res, next) => {
  const post = posts.byId(Number(req.params.id));
  if (!post) return next();
  const data = formData(req.body);
  if (!data.title) return res.status(422).render('admin/posts/form', { title: `Editar: ${post.title}`, post, form: data, errors: ['El título es obligatorio.'] });
  const cover = req.files && req.files.images && req.files.images[0];
  if (cover) { uploads.removeImageByWebPath(post.cover_path); data.cover_path = await uploads.optimizeImage(cover); }
  posts.update(post.id, data);
  req.flash('success', 'Entrada guardada.');
  return res.redirect(`/admin/blog/${post.id}/editar`);
};
exports.destroy = (req, res, next) => {
  const post = posts.byId(Number(req.params.id));
  if (!post) return next();
  uploads.removeImageByWebPath(post.cover_path);
  posts.remove(post.id);
  req.flash('success', 'Entrada eliminada.');
  return res.redirect('/admin/blog');
};
