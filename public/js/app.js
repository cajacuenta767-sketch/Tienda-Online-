(function () {
  'use strict';
  var root = document.documentElement;
  var toastEl = document.querySelector('[data-toast]');
  var toastTimer = null;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-visible'); }, 2400);
  }

  // Franja promocional cerrable (se recuerda 7 días)
  var promo = document.querySelector('[data-promo]');
  if (promo) {
    var hiddenUntil = 0;
    try { hiddenUntil = Number(localStorage.getItem('dm-promo-hidden') || 0); } catch (e) {}
    if (hiddenUntil < Date.now()) promo.hidden = false;
    var closeBtn = promo.querySelector('[data-promo-close]');
    if (closeBtn) closeBtn.addEventListener('click', function () {
      promo.hidden = true;
      try { localStorage.setItem('dm-promo-hidden', String(Date.now() + 7 * 24 * 3600 * 1000)); } catch (e) {}
    });
  }
  function syncThemeLabel() {
    var dark = root.getAttribute('data-theme') === 'dark';
    document.querySelectorAll('[data-theme-label]').forEach(function (l) { l.textContent = dark ? 'claro' : 'oscuro'; });
  }
  syncThemeLabel();

  // Tema claro/oscuro (claro por defecto)
  document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var dark = root.getAttribute('data-theme') !== 'dark';
      if (dark) root.setAttribute('data-theme', 'dark'); else root.removeAttribute('data-theme');
      try { localStorage.setItem('dm-theme', dark ? 'dark' : 'light'); } catch (e) {}
      syncThemeLabel();
      toast(dark ? 'Modo oscuro activado' : 'Modo claro activado');
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

  // Dropdowns
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

  // Búsqueda instantánea
  var searchForm = document.querySelector('[data-search]');
  if (searchForm) {
    var input = searchForm.querySelector('input[name="q"]');
    var box = searchForm.querySelector('[data-search-results]');
    var timer = null, active = -1, items = [];
    function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
    function money(c) { return '$' + (c / 100).toFixed(2); }
    function close() { box.hidden = true; box.innerHTML = ''; active = -1; items = []; }
    function render(data) {
      items = data.items || [];
      if (!items.length) { box.innerHTML = '<span class="search-suggest__more text-muted">Sin resultados</span>'; box.hidden = false; return; }
      box.innerHTML = items.map(function (p) {
        return '<a href="/producto/' + esc(p.slug) + '"><img src="' + esc(p.image || '/img/placeholder.svg') + '" alt=""><span><strong>' + esc(p.title) + '</strong><small>' + esc(p.category || '') + '</small></span><span class="price__current">' + money(p.price_cents) + '</span></a>';
      }).join('') + '<a class="search-suggest__more" href="' + esc(data.more) + '">Ver todos los resultados →</a>';
      box.hidden = false;
    }
    input.addEventListener('input', function () {
      clearTimeout(timer);
      var q = input.value.trim();
      if (q.length < 2) return close();
      timer = setTimeout(function () {
        fetch('/api/buscar?q=' + encodeURIComponent(q), { headers: { Accept: 'application/json' } }).then(function (r) { return r.json(); }).then(render).catch(close);
      }, 180);
    });
    input.addEventListener('keydown', function (e) {
      var links = box.querySelectorAll('a');
      if (box.hidden || !links.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        active = e.key === 'ArrowDown' ? Math.min(active + 1, links.length - 1) : Math.max(active - 1, 0);
        links.forEach(function (l, i) { l.classList.toggle('is-active', i === active); });
      } else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); links[active].click(); }
      else if (e.key === 'Escape') close();
    });
    document.addEventListener('click', function (e) { if (!searchForm.contains(e.target)) close(); });
  }

  // Favoritos sin recargar
  document.querySelectorAll('[data-fav-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('.fav-btn');
      var token = form.querySelector('[name="_csrf"]').value;
      fetch(form.getAttribute('action'), { method: 'POST', headers: { Accept: 'application/json', 'X-CSRF-Token': token, 'Content-Type': 'application/json' }, credentials: 'same-origin', body: '{}' })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          btn.classList.toggle('is-active', j.added);
          btn.setAttribute('aria-pressed', String(j.added));
          document.querySelectorAll('[data-fav-count]').forEach(function (c) { c.textContent = j.count || ''; });
          toast(j.added ? 'Añadido a favoritos ♥' : 'Quitado de favoritos');
          if (!j.added && location.pathname === '/favoritos') { var card = form.closest('.product-card'); if (card) { card.style.opacity = '0'; setTimeout(function () { card.remove(); }, 250); } }
        })
        .catch(function () { form.submit(); });
    });
  });

  // Filtros en móvil
  var filters = document.querySelector('[data-filters]');
  var filtersToggle = document.querySelector('[data-filters-toggle]');
  if (filters && filtersToggle) {
    filtersToggle.addEventListener('click', function () {
      var collapsed = filters.getAttribute('data-collapsed') === 'true';
      filters.setAttribute('data-collapsed', collapsed ? 'false' : 'true');
      filtersToggle.textContent = collapsed ? 'Ocultar' : 'Mostrar';
    });
  }

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
      var done = function () { var old = btn.textContent; btn.textContent = 'Copiado ✔'; toast('Copiado al portapapeles'); setTimeout(function () { btn.textContent = old; }, 1600); };
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

  // Auto-submit en selects
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
