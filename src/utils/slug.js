'use strict';
const slugify = require('slugify');

function toSlug(text) {
  const s = slugify(String(text || ''), { lower: true, strict: true, locale: 'es', trim: true });
  return s || 'item';
}

function uniqueSlug(base, exists) {
  let slug = toSlug(base);
  let i = 2;
  while (exists(slug)) {
    slug = `${toSlug(base)}-${i}`;
    i += 1;
  }
  return slug;
}

module.exports = { toSlug, uniqueSlug };
