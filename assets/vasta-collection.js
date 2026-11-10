/* VASTA collection page: sort, filter drawer and "load more". Scoped per section instance, idempotent. */
(function () {
  'use strict';

  function initGrid(root) {
    if (!root || root.dataset.vastaInit === 'true') return;
    root.dataset.vastaInit = 'true';

    var filters = root.querySelector('[data-vasta-filters]');
    var overlay = root.querySelector('[data-vasta-overlay]');
    var toggle = root.querySelector('[data-vasta-filter-toggle]');
    var closeBtn = root.querySelector('[data-vasta-filter-close]');
    var sort = root.querySelector('[data-vasta-sort]');
    var list = root.querySelector('[data-vasta-products]');
    var moreWrap = root.querySelector('[data-vasta-more]');
    var moreBtn = root.querySelector('[data-vasta-more-btn]');
    var countEnd = root.querySelector('[data-vasta-count-end]');

    /* Filter drawer (small screens) */
    function setDrawer(open) {
      if (!filters) return;
      filters.classList.toggle('is-open', open);
      if (overlay) overlay.classList.toggle('is-open', open);
      if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.documentElement.style.overflow = open ? 'hidden' : '';
      if (open) {
        var first = filters.querySelector('input, button, a');
        if (first) first.focus();
      } else if (toggle) {
        toggle.focus();
      }
    }

    if (toggle) toggle.addEventListener('click', function () { setDrawer(true); });
    if (closeBtn) closeBtn.addEventListener('click', function () { setDrawer(false); });
    if (overlay) overlay.addEventListener('click', function () { setDrawer(false); });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && filters && filters.classList.contains('is-open')) setDrawer(false);
    });

    /* Sort: keep the filters that are already in the URL */
    if (sort) {
      sort.addEventListener('change', function () {
        var url = new URL(window.location.href);
        url.searchParams.set('sort_by', sort.value);
        url.searchParams.delete('page');
        window.location.href = url.toString();
      });
    }

    /* Load more */
    if (moreBtn && list) {
      moreBtn.addEventListener('click', function (e) {
        var href = moreBtn.getAttribute('href');
        if (!href) return;
        e.preventDefault();
        if (moreBtn.getAttribute('aria-busy') === 'true') return;
        moreBtn.setAttribute('aria-busy', 'true');

        fetch(href, { credentials: 'same-origin' })
          .then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.text();
          })
          .then(function (html) {
            var doc = new DOMParser().parseFromString(html, 'text/html');
            var sectionId = root.getAttribute('data-section-id');
            var nextRoot = sectionId ? doc.querySelector('[data-section-id="' + sectionId + '"]') : doc;
            var items = (nextRoot || doc).querySelectorAll('[data-vasta-products] > li');
            items.forEach(function (li) { list.appendChild(document.importNode(li, true)); });

            var nextBtn = (nextRoot || doc).querySelector('[data-vasta-more-btn]');
            if (nextBtn) {
              moreBtn.setAttribute('href', nextBtn.getAttribute('href'));
            } else if (moreWrap) {
              moreWrap.hidden = true;
            }

            var nextEnd = (nextRoot || doc).querySelector('[data-vasta-count-end]');
            if (nextEnd && countEnd) countEnd.textContent = nextEnd.textContent;
          })
          .catch(function () {
            window.location.href = href;
          })
          .then(function () {
            moreBtn.removeAttribute('aria-busy');
          });
      });
    }
  }

  function initAll(scope) {
    (scope || document).querySelectorAll('[data-vasta-grid]').forEach(initGrid);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); });
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', function (e) { initAll(e.target); });
})();
