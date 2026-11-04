(function () {
  if (window.__dgBundleBoot) {
    window.__dgBundleBoot();
    return;
  }

  function formatMoney(cents, format) {
    var amount = (cents / 100).toFixed(2);
    var whole = String(Math.round(cents / 100));
    var comma = amount.replace('.', ',');
    var pattern = format || '${{amount}}';
    return pattern
      .replace(/\{\{\s*amount_no_decimals_with_comma_separator\s*\}\}/g, whole)
      .replace(/\{\{\s*amount_no_decimals\s*\}\}/g, whole)
      .replace(/\{\{\s*amount_with_comma_separator\s*\}\}/g, comma)
      .replace(/\{\{\s*amount_with_apostrophe_separator\s*\}\}/g, amount.replace('.', "'"))
      .replace(/\{\{\s*amount_with_space_separator\s*\}\}/g, amount)
      .replace(/\{\{\s*amount\s*\}\}/g, amount);
  }

  function formatOffer(cents, format) {
    return formatMoney(cents, format).replace(/([.,])00(?!\d)/, '');
  }

  function init(root) {
    if (!root || root.getAttribute('data-dg-ready') === 'true') return;
    root.setAttribute('data-dg-ready', 'true');

    var configNode = root.querySelector('[data-dg-config]');
    var config = {};
    if (configNode) {
      try { config = JSON.parse(configNode.textContent); } catch (error) { config = {}; }
    }
    var moneyFormat = config.moneyFormat || '${{amount}}';
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var main = root.querySelector('[data-dg-main]');
    var thumbs = root.querySelectorAll('[data-dg-thumb]');
    var thumbIndex = 0;

    function showThumb(index) {
      if (!thumbs.length || !main) return;
      if (index < 0) index = thumbs.length - 1;
      if (index >= thumbs.length) index = 0;
      thumbIndex = index;
      for (var i = 0; i < thumbs.length; i++) {
        thumbs[i].classList.toggle('is-active', i === index);
      }
      var full = thumbs[index].getAttribute('data-full');
      var alt = thumbs[index].getAttribute('data-alt') || '';
      if (full) {
        main.src = full;
        main.alt = alt;
      }
      if (thumbs[index].scrollIntoView) {
        thumbs[index].scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
      }
    }

    for (var t = 0; t < thumbs.length; t++) {
      thumbs[t].addEventListener('click', function () {
        var all = root.querySelectorAll('[data-dg-thumb]');
        for (var i = 0; i < all.length; i++) {
          if (all[i] === this) showThumb(i);
        }
      });
    }

    var prev = root.querySelector('[data-dg-prev]');
    var next = root.querySelector('[data-dg-next]');
    var mainPrev = root.querySelector('[data-dg-main-prev]');
    var mainNext = root.querySelector('[data-dg-main-next]');
    var track = root.querySelector('[data-dg-track]');
    if (prev && track) {
      prev.addEventListener('click', function () {
        track.scrollBy({ left: -90, behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    }
    if (next && track) {
      next.addEventListener('click', function () {
        track.scrollBy({ left: 90, behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    }
    if (mainPrev) mainPrev.addEventListener('click', function () { showThumb(thumbIndex - 1); });
    if (mainNext) mainNext.addEventListener('click', function () { showThumb(thumbIndex + 1); });

    function paintCard(card) {
      var qty = Number(card.getAttribute('data-qty') || 0);
      var stepper = card.querySelector('[data-dg-stepper]');
      var add = card.querySelector('[data-dg-add]');
      var label = card.querySelector('[data-dg-qty-label]');
      if (label) label.textContent = String(qty);
      if (stepper) stepper.hidden = qty <= 0;
      if (add) add.hidden = qty > 0;
      card.classList.toggle('is-selected', qty > 0);
    }

    function render() {
      var cards = root.querySelectorAll('[data-dg-item]');
      var visual = 0;
      var priced = 0;
      var subtotal = 0;
      for (var i = 0; i < cards.length; i++) {
        var qty = Number(cards[i].getAttribute('data-qty') || 0);
        var price = Number(cards[i].getAttribute('data-price') || 0);
        var variant = cards[i].getAttribute('data-variant');
        visual += qty;
        if (qty > 0 && price > 0 && variant) {
          priced += qty;
          subtotal += price * qty;
        }
      }

      var tiers = root.querySelectorAll('[data-dg-tier]');
      var hit = 0;
      var best = null;
      var next = null;
      for (var n = 0; n < tiers.length; n++) {
        var min = Number(tiers[n].getAttribute('data-min') || 0);
        var reached = visual >= min;
        tiers[n].classList.toggle('is-reached', reached);
        if (reached) hit += 1;
        if (reached && (!best || min >= Number(best.getAttribute('data-min') || 0))) best = tiers[n];
        if (!reached && (!next || min < Number(next.getAttribute('data-min') || 0))) next = tiers[n];
      }

      var fill = root.querySelector('[data-dg-fill]');
      if (fill) {
        var pct = 0;
        if (hit > 0 && tiers.length > 1) pct = Math.min(100, Math.round(((hit - 0.5) / (tiers.length - 1)) * 100));
        else if (hit > 0) pct = 100;
        fill.style.width = pct + '%';
      }

      var nudge = root.querySelector('[data-dg-nudge]');
      if (nudge) {
        if (next) {
          var diff = Number(next.getAttribute('data-min')) - visual;
          var noun = diff === 1 ? 'item' : 'items';
          nudge.textContent = 'Add ' + diff + ' more ' + noun + ' to save ' + formatOffer(Number(next.getAttribute('data-discount') || 0), moneyFormat);
        } else if (best) {
          nudge.textContent = "You're saving " + formatOffer(Number(best.getAttribute('data-discount') || 0), moneyFormat);
        } else {
          nudge.textContent = '';
        }
      }

      var discount = 0;
      if (subtotal > 0 && best) discount = Number(best.getAttribute('data-discount') || 0);
      if (discount > subtotal) discount = subtotal;
      var sale = subtotal - discount;

      var compareEl = root.querySelector('[data-dg-compare]');
      var saleEl = root.querySelector('[data-dg-sale]');
      var badgeEl = root.querySelector('[data-dg-save]');
      if (saleEl) saleEl.textContent = subtotal > 0 ? formatMoney(sale, moneyFormat) : '—';
      if (compareEl) {
        compareEl.hidden = !(subtotal > sale && subtotal > 0);
        if (!compareEl.hidden) compareEl.textContent = formatMoney(subtotal, moneyFormat);
      }
      if (badgeEl) {
        badgeEl.hidden = !(discount > 0 && subtotal > 0);
        if (!badgeEl.hidden && best) badgeEl.textContent = best.getAttribute('data-label') || ('Save ' + formatMoney(discount, moneyFormat));
      }

      var button = root.querySelector('[data-dg-atc]');
      var buttonLabel = root.querySelector('[data-dg-atc-label]');
      if (button && buttonLabel) {
        if (priced > 0) {
          button.disabled = false;
          var template = config.atcLabel || '[price] - ADD TO CART ([count] ITEMS)';
          buttonLabel.textContent = template.replace('[price]', formatMoney(sale, moneyFormat)).replace('[count]', String(priced));
        } else {
          button.disabled = true;
          buttonLabel.textContent = 'ADD TO CART';
        }
      }
    }

    var cards = root.querySelectorAll('[data-dg-item]');
    for (var c = 0; c < cards.length; c++) {
      cards[c].addEventListener('click', function (event) {
        var dec = event.target.closest('[data-dg-dec]');
        var inc = event.target.closest('[data-dg-inc]');
        var add = event.target.closest('[data-dg-add]');
        if (!dec && !inc && !add) return;
        var card = event.target.closest('[data-dg-item]');
        var qty = Number(card.getAttribute('data-qty') || 0);
        if (add) qty = 1;
        if (inc) qty += 1;
        if (dec) qty = Math.max(0, qty - 1);
        card.setAttribute('data-qty', String(qty));
        paintCard(card);
        render();
      });
    }

    var form = root.querySelector('form.dg-form');
    if (form) {
      form.addEventListener('submit', function (event) {
        var items = [];
        var nodes = root.querySelectorAll('[data-dg-item]');
        for (var i = 0; i < nodes.length; i++) {
          var qty = Number(nodes[i].getAttribute('data-qty') || 0);
          var id = nodes[i].getAttribute('data-variant');
          if (qty > 0 && id) items.push({ id: Number(id), quantity: qty });
        }
        if (!items.length) return;
        event.preventDefault();
        var button = root.querySelector('[data-dg-atc]');
        if (button) button.disabled = true;
        fetch(config.addUrl || '/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ items: items })
        }).then(function (response) {
          if (!response.ok) throw new Error('cart');
          window.location.href = config.cartUrl || '/cart';
        }).catch(function () {
          if (button) button.disabled = false;
          form.submit();
        });
      });
    }

    var play = root.querySelector('[data-dg-play]');
    if (play) {
      play.addEventListener('click', function () {
        var frame = root.querySelector('[data-dg-frame]');
        if (!frame) return;
        var file = frame.querySelector('video');
        var poster = frame.querySelector('[data-dg-poster]');
        if (file) {
          if (poster) poster.hidden = true;
          play.hidden = true;
          file.hidden = false;
          if (!reduceMotion && file.play) file.play();
          return;
        }
        var type = play.getAttribute('data-video-type');
        var id = play.getAttribute('data-video-id');
        if (!type || !id) return;
        var src = type === 'youtube'
          ? 'https://www.youtube.com/embed/' + id + (reduceMotion ? '' : '?autoplay=1')
          : 'https://player.vimeo.com/video/' + id + (reduceMotion ? '' : '?autoplay=1');
        var iframe = document.createElement('iframe');
        iframe.src = src;
        iframe.title = play.getAttribute('aria-label') || 'Video';
        iframe.allow = 'autoplay; fullscreen; picture-in-picture';
        iframe.setAttribute('allowfullscreen', '');
        if (poster) poster.hidden = true;
        play.hidden = true;
        frame.appendChild(iframe);
      });
    }

    render();
  }

  function boot() {
    var nodes = document.querySelectorAll('[data-dg-bundle]');
    for (var i = 0; i < nodes.length; i++) init(nodes[i]);
  }

  window.__dgBundleBoot = boot;
  document.addEventListener('shopify:section:load', function (event) {
    var root = event.target.querySelector('[data-dg-bundle]');
    if (root) init(root);
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
