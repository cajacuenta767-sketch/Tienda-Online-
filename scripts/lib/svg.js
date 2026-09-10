'use strict';
// Genera "capturas de pantalla" SVG de 1280x800 con la paleta Azul océano (claro).
const T = { bg: '#F8FAFC', surface: '#FFFFFF', surface2: '#EEF2F7', border: '#E2E8F0', text: '#0F172A', muted: '#64748B', amber: '#2563EB', mint: '#06B6D4', red: '#F43F5E' };

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function chrome(title) {
  return `<rect width="1280" height="800" fill="${T.bg}"/>
  <rect x="0" y="0" width="1280" height="44" fill="${T.surface}"/>
  <circle cx="24" cy="22" r="6" fill="${T.red}"/><circle cx="44" cy="22" r="6" fill="${T.amber}"/><circle cx="64" cy="22" r="6" fill="${T.mint}"/>
  <rect x="380" y="12" width="520" height="20" rx="4" fill="${T.surface2}"/>
  <text x="640" y="26" font-family="monospace" font-size="12" fill="${T.muted}" text-anchor="middle">${esc(title)}</text>`;
}

function bars(x, y, w, h, values, color) {
  const max = Math.max(...values);
  const gap = 8;
  const bw = (w - gap * (values.length - 1)) / values.length;
  return values.map((v, i) => `<rect x="${x + i * (bw + gap)}" y="${y + h - (v / max) * h}" width="${bw}" height="${(v / max) * h}" rx="3" fill="${color}" opacity="${0.55 + (i / values.length) * 0.45}"/>`).join('');
}

function dashboard(title, seed) {
  const vals = Array.from({ length: 12 }, (_, i) => 30 + ((seed * (i + 3) * 7) % 70));
  const kpis = ['Ventas hoy', 'Pedidos', 'Clientes', 'Ingresos'];
  return `${chrome(title)}
  <rect x="0" y="44" width="240" height="756" fill="${T.surface}"/>
  <text x="24" y="84" font-family="sans-serif" font-size="18" font-weight="700" fill="${T.amber}">${esc(title.split(' ')[0])}</text>
  ${['Panel', 'Ventas', 'Productos', 'Clientes', 'Reportes', 'Ajustes'].map((l, i) => `<rect x="16" y="${112 + i * 44}" width="208" height="34" rx="6" fill="${i === 0 ? T.surface2 : 'none'}"/><text x="32" y="${134 + i * 44}" font-family="sans-serif" font-size="14" fill="${i === 0 ? T.text : T.muted}">${l}</text>`).join('')}
  <text x="272" y="92" font-family="sans-serif" font-size="24" font-weight="700" fill="${T.text}">Resumen general</text>
  ${kpis.map((k, i) => `<rect x="${272 + i * 246}" y="116" width="230" height="96" rx="10" fill="${T.surface}" stroke="${T.border}"/><text x="${292 + i * 246}" y="146" font-family="sans-serif" font-size="13" fill="${T.muted}">${k}</text><text x="${292 + i * 246}" y="188" font-family="monospace" font-size="26" font-weight="700" fill="${i === 3 ? T.amber : T.text}">${(seed * (i + 1) * 137) % 9000 + 120}</text>`).join('')}
  <rect x="272" y="236" width="720" height="320" rx="10" fill="${T.surface}" stroke="${T.border}"/>
  <text x="292" y="266" font-family="sans-serif" font-size="15" fill="${T.text}">Ventas por mes</text>
  ${bars(292, 290, 680, 240, vals, T.amber)}
  <rect x="1016" y="236" width="240" height="320" rx="10" fill="${T.surface}" stroke="${T.border}"/>
  <text x="1036" y="266" font-family="sans-serif" font-size="15" fill="${T.text}">Actividad</text>
  ${Array.from({ length: 6 }, (_, i) => `<circle cx="1046" cy="${296 + i * 42}" r="5" fill="${i % 2 ? T.mint : T.amber}"/><rect x="1062" y="${290 + i * 42}" width="${120 + ((seed * (i + 1)) % 60)}" height="12" rx="3" fill="${T.surface2}"/>`).join('')}
  <rect x="272" y="580" width="984" height="196" rx="10" fill="${T.surface}" stroke="${T.border}"/>
  ${Array.from({ length: 4 }, (_, i) => `<rect x="292" y="${606 + i * 40}" width="944" height="1" fill="${T.border}"/><rect x="292" y="${616 + i * 40}" width="180" height="12" rx="3" fill="${T.surface2}"/><rect x="520" y="${616 + i * 40}" width="120" height="12" rx="3" fill="${T.surface2}"/><rect x="1120" y="${612 + i * 40}" width="90" height="20" rx="4" fill="${i % 3 === 0 ? T.mint : T.amber}" opacity="0.25"/>`).join('')}`;
}

function table(title, seed) {
  return `${chrome(title)}
  <rect x="0" y="44" width="1280" height="64" fill="${T.surface}"/>
  <text x="32" y="84" font-family="sans-serif" font-size="20" font-weight="700" fill="${T.text}">${esc(title)}</text>
  <rect x="980" y="62" width="120" height="30" rx="6" fill="${T.amber}"/><text x="1040" y="82" font-family="sans-serif" font-size="13" font-weight="700" fill="#fff" text-anchor="middle">+ Nuevo</text>
  <rect x="1116" y="62" width="132" height="30" rx="6" fill="none" stroke="${T.border}"/><text x="1182" y="82" font-family="sans-serif" font-size="13" fill="${T.muted}" text-anchor="middle">Exportar</text>
  <rect x="32" y="132" width="1216" height="620" rx="10" fill="${T.surface}" stroke="${T.border}"/>
  <rect x="32" y="132" width="1216" height="44" rx="10" fill="${T.surface2}"/>
  ${['Código', 'Nombre', 'Categoría', 'Stock', 'Precio', 'Estado'].map((h, i) => `<text x="${56 + i * 200}" y="160" font-family="sans-serif" font-size="12" font-weight="700" fill="${T.muted}">${h.toUpperCase()}</text>`).join('')}
  ${Array.from({ length: 12 }, (_, r) => `<rect x="32" y="${176 + r * 46}" width="1216" height="1" fill="${T.border}"/>
    <text x="56" y="${204 + r * 46}" font-family="monospace" font-size="13" fill="${T.muted}">SKU-${(seed * 31 + r * 17) % 900 + 100}</text>
    <rect x="256" y="${192 + r * 46}" width="${110 + ((seed + r) * 13) % 70}" height="14" rx="3" fill="${T.surface2}"/>
    <rect x="456" y="${192 + r * 46}" width="90" height="14" rx="3" fill="${T.surface2}"/>
    <text x="656" y="${204 + r * 46}" font-family="monospace" font-size="13" fill="${T.text}">${(seed * (r + 2)) % 120}</text>
    <text x="856" y="${204 + r * 46}" font-family="monospace" font-size="13" fill="${T.amber}">$${((seed * (r + 5)) % 900) / 10 + 9}.90</text>
    <rect x="1056" y="${190 + r * 46}" width="72" height="20" rx="4" fill="${r % 4 === 3 ? T.red : T.mint}" opacity="0.2"/>
    <text x="1092" y="${204 + r * 46}" font-family="sans-serif" font-size="11" fill="${r % 4 === 3 ? T.red : T.mint}" text-anchor="middle">${r % 4 === 3 ? 'Bajo' : 'Activo'}</text>`).join('')}`;
}

function landing(title, seed) {
  return `${chrome(title)}
  <rect x="0" y="44" width="1280" height="60" fill="${T.surface}"/>
  <text x="32" y="82" font-family="sans-serif" font-size="18" font-weight="700" fill="${T.amber}">${esc(title.split(' ')[0])}</text>
  ${['Inicio', 'Servicios', 'Precios', 'Blog', 'Contacto'].map((l, i) => `<text x="${640 + i * 100}" y="80" font-family="sans-serif" font-size="14" fill="${T.muted}">${l}</text>`).join('')}
  <rect x="1140" y="60" width="108" height="30" rx="6" fill="${T.amber}"/>
  <text x="80" y="230" font-family="sans-serif" font-size="46" font-weight="800" fill="${T.text}">Haz crecer tu</text>
  <text x="80" y="286" font-family="sans-serif" font-size="46" font-weight="800" fill="${T.amber}">negocio online</text>
  <rect x="80" y="316" width="420" height="12" rx="3" fill="${T.surface2}"/><rect x="80" y="340" width="360" height="12" rx="3" fill="${T.surface2}"/>
  <rect x="80" y="386" width="150" height="44" rx="8" fill="${T.amber}"/><rect x="246" y="386" width="150" height="44" rx="8" fill="none" stroke="${T.border}"/>
  <rect x="700" y="150" width="500" height="320" rx="14" fill="${T.surface}" stroke="${T.border}"/>
  ${bars(730, 190, 440, 240, Array.from({ length: 9 }, (_, i) => 20 + ((seed * (i + 2) * 11) % 80)), T.mint)}
  ${[0, 1, 2].map((i) => `<rect x="${80 + i * 380}" y="540" width="360" height="200" rx="12" fill="${T.surface}" stroke="${T.border}"/><circle cx="${120 + i * 380}" cy="590" r="18" fill="${i === 1 ? T.mint : T.amber}" opacity="0.8"/><rect x="${104 + i * 380}" y="630" width="220" height="14" rx="3" fill="${T.surface2}"/><rect x="${104 + i * 380}" y="656" width="300" height="10" rx="3" fill="${T.surface2}"/><rect x="${104 + i * 380}" y="676" width="260" height="10" rx="3" fill="${T.surface2}"/>`).join('')}`;
}

const VARIANTS = { dashboard, table, landing };

function screenshot({ title, variant = 'dashboard', seed = 1 }) {
  const body = (VARIANTS[variant] || dashboard)(title, seed);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 800" width="1280" height="800">${body}</svg>`;
}

module.exports = { screenshot, VARIANTS: Object.keys(VARIANTS) };
