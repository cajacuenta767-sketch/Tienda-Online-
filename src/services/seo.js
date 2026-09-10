'use strict';
const config = require('../config');
const { escapeHtml } = require('../utils/format');

function productJsonLd(product, settings, reviewSummary) {
  const price = (product.discount_cents !== null && product.discount_cents < product.price_cents ? product.discount_cents : product.price_cents) / 100;
  const data = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: product.title,
    description: product.short_description,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    softwareVersion: product.version,
    image: product.images && product.images[0] ? `${config.BASE_URL}${product.images[0].path}` : undefined,
    url: `${config.BASE_URL}/producto/${product.slug}`,
    offers: { '@type': 'Offer', price: price.toFixed(2), priceCurrency: product.currency || 'USD', availability: 'https://schema.org/InStock', url: `${config.BASE_URL}/producto/${product.slug}` },
    brand: { '@type': 'Brand', name: settings.store_name || 'DevMarket' },
  };
  if (reviewSummary && reviewSummary.count) {
    data.aggregateRating = { '@type': 'AggregateRating', ratingValue: Number(reviewSummary.avg).toFixed(1), reviewCount: reviewSummary.count, bestRating: 5, worstRating: 1 };
  }
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}
function orgJsonLd(settings) {
  const data = { '@context': 'https://schema.org', '@type': 'Organization', name: settings.store_name || 'DevMarket', url: config.BASE_URL, logo: `${config.BASE_URL}/img/logo.svg` };
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
}
function metaTags({ title, description, image, url, type = 'website' }) {
  const img = image ? (image.startsWith('http') ? image : `${config.BASE_URL}${image}`) : `${config.BASE_URL}/img/og-default.svg`;
  return [
    `<link rel="canonical" href="${escapeHtml(url)}">`,
    `<meta property="og:type" content="${type}">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(description || '')}">`,
    `<meta property="og:url" content="${escapeHtml(url)}">`,
    `<meta property="og:image" content="${escapeHtml(img)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeHtml(title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(description || '')}">`,
    `<meta name="twitter:image" content="${escapeHtml(img)}">`,
  ].join('\n  ');
}

module.exports = { productJsonLd, orgJsonLd, metaTags };
