(function () {
  'use strict';
  var root = document.documentElement;

  // Tema claro/oscuro
  function currentTheme() {
    var stored = root.getAttribute('data-theme');
    if (stored) return stored;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('dm-theme', next); } catch (e) {}
    });
  });

  // Menú móvil
  var navToggle = document.querySelector('[data-nav-toggle]');
  var navMobile = document.getElementById('nav-mobile');
  if (navToggle && navMobile) {
    navToggle.addEventListener('click', function () {
      var open = navMobile.hidden;
      navMobile.hidden = !open;
      navToggle.setAttribute('aria-expanded', String(open));
    });
  }

  // Sidebar admin
  var adminNav = document.querySelector('[data-admin-nav]');
  var sidebar = document.getElementById('admin-sidebar');
  if (adminNav && sidebar) {
    adminNav.addEventListener('click', function () { sidebar.classList.toggle('is-open'); });
    document.addEventListener('click', function (e) {
      if (sidebar.classList.contains('is-open') && !sidebar.contains(e.target) && !adminNav.contains(e.target)) sidebar.classList.remove('is-open');
    });
  }

  // Dropdowns (clic para táctil)
  document.querySelectorAll('[data-dropdown]').forEach(function (dd) {
    var btn = dd.querySelector('button');
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = dd.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
    });
  });
  document.addEventListener('click', function () {
    document.querySelectorAll('[data-dropdown].is-open').forEach(function (dd) { dd.classList.remove('is-open'); });
  });

  // Galería
  var gallery = document.querySelector('[data-gallery]');
  if (gallery) {
    var main = gallery.querySelector('[data-gallery-main]');
    gallery.querySelectorAll('.gallery__thumb').forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        main.src = thumb.getAttribute('data-src');
        main.alt = thumb.getAttribute('data-alt') || '';
        gallery.querySelectorAll('.gallery__thumb').forEach(function (t) { t.classList.remove('is-active'); });
        thumb.classList.add('is-active');
      });
    });
  }

  // Copiar al portapapeles
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      var done = function () { var old = btn.textContent; btn.textContent = 'Copiado ✔'; setTimeout(function () { btn.textContent = old; }, 1600); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done);
      else { var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} document.body.removeChild(ta); done(); }
    });
  });

  // Confirmaciones
  document.querySelectorAll('form[data-confirm]').forEach(function (form) {
    form.addEventListener('submit', function (e) { if (!window.confirm(form.getAttribute('data-confirm'))) e.preventDefault(); });
  });
  document.querySelectorAll('button[data-confirm][form]').forEach(function (btn) {
    btn.addEventListener('click', function (e) { if (!window.confirm(btn.getAttribute('data-confirm'))) e.preventDefault(); });
  });

  // Tabs
  document.querySelectorAll('[data-tabs]').forEach(function (tabs) {
    var buttons = tabs.querySelectorAll('[data-tab]');
    var panels = tabs.querySelectorAll('[data-panel]');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-tab');
        buttons.forEach(function (b) { b.setAttribute('aria-selected', String(b === btn)); });
        panels.forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== id; });
        try { history.replaceState(null, '', '?tab=' + id); } catch (e) {}
      });
    });
  });

  // Auto-submit en selects de filtro
  document.querySelectorAll('[data-auto-submit]').forEach(function (sel) {
    sel.addEventListener('change', function () { sel.form && sel.form.submit(); });
  });

  // Flash auto-cierre
  document.querySelectorAll('[data-flash]').forEach(function (el) {
    var close = el.querySelector('[data-flash-close]');
    if (close) close.addEventListener('click', function () { el.remove(); });
    setTimeout(function () { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 400); }, 6000);
  });

  // Slug automático (admin)
  var slugSource = document.querySelector('[data-slug-source]');
  var slugTarget = document.querySelector('[data-slug-target]');
  if (slugSource && slugTarget) {
    var touched = slugTarget.value !== '';
    slugTarget.addEventListener('input', function () { touched = slugTarget.value !== ''; });
    slugSource.addEventListener('input', function () {
      if (touched) return;
      slugTarget.placeholder = slugSource.value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    });
  }

  // Reordenar imágenes (admin)
  var reorderBtn = document.querySelector('[data-reorder-submit]');
  var reorderForm = document.getElementById('reorder-form');
  if (reorderBtn && reorderForm) {
    reorderBtn.addEventListener('click', function () {
      var inputs = Array.prototype.slice.call(document.querySelectorAll('[data-order-id]'));
      inputs.sort(function (a, b) { return Number(a.value) - Number(b.value); });
      inputs.forEach(function (inp) {
        var h = document.createElement('input'); h.type = 'hidden'; h.name = 'order[]'; h.value = inp.getAttribute('data-order-id'); reorderForm.appendChild(h);
      });
      reorderForm.submit();
    });
  }
})();
