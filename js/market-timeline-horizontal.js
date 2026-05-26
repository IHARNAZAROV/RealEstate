/**
 * market-timeline-horizontal.js
 * Cinematic horizontal storytelling timeline for the real estate market page.
 */

(function () {
  'use strict';

  const DATA_URL = '/data/market-timeline.json';
  const CARD_WIDTH_COMPACT = 280;
  const YEAR_SPACING = 340; // px between year markers
  const LINE_Y = 220;        // px from canvas top to center of line
  const CARD_GAP_LINE = 24;  // gap between card edge and line
  const COMPACT_CARD_H = 168; // approx height of compact card

  /* ---- Trend labels & icons ---- */
  const TREND_LABELS = {
    positive: { label: 'Рост', icon: '↑' },
    negative: { label: 'Спад', icon: '↓' },
    neutral:  { label: 'Стабильно', icon: '→' },
  };

  /* ---- Metric labels ---- */
  const METRIC_LABELS = {
    demand:      'Спрос',
    priceGrowth: 'Цены',
    supply:      'Предложение',
  };

  let data = [];
  let expandedYear = null;

  /* ================================================
     FETCH & INIT
  ================================================ */
  async function init() {
    const section = document.querySelector('.market-timeline-section');
    if (!section) return;

    try {
      const res = await fetch(DATA_URL);
      if (!res.ok) throw new Error('fetch failed');
      data = await res.json();
    } catch (e) {
      console.warn('market-timeline: failed to load data', e);
      return;
    }

    buildDOM(section);
    initScrollDrag(section);
    initIntersectionObserver(section);
    initScrollArrows(section);
    initParticles(section);
    initKeyboard(section);
  }

  /* ================================================
     BUILD DOM
  ================================================ */
  function buildDOM(section) {
    const inner = section.querySelector('.market-timeline-inner') || section;
    const track = inner.querySelector('.market-timeline-track');
    if (!track) return;

    const canvas = track.querySelector('.market-timeline-canvas');
    if (!canvas) return;

    /* glowing line */
    const line = document.createElement('div');
    line.className = 'mtl-line';
    canvas.appendChild(line);

    const totalWidth = 60 + data.length * YEAR_SPACING + 120;
    canvas.style.width = totalWidth + 'px';
    canvas.style.minWidth = totalWidth + 'px';
    line.style.left = '0';
    line.style.right = '0';

    data.forEach((item, i) => {
      const xCenter = 60 + i * YEAR_SPACING + YEAR_SPACING / 2;
      const isTop = i % 2 === 0;

      /* year marker */
      const marker = document.createElement('div');
      marker.className = 'mtl-year-marker';
      marker.style.left = xCenter + 'px';
      marker.setAttribute('aria-label', 'Год: ' + item.year);
      marker.innerHTML = `<div class="mtl-year-dot"></div>`;
      canvas.appendChild(marker);

      /* card */
      const card = buildCard(item, i, isTop, xCenter);
      canvas.appendChild(card);

      /* click on marker opens card */
      marker.addEventListener('click', () => toggleCard(card, item, canvas, marker));
    });
  }

  function buildCard(item, i, isTop, xCenter) {
    const trendInfo = TREND_LABELS[item.trend] || TREND_LABELS.neutral;
    const card = document.createElement('div');
    const staggerDir = isTop ? 'mtl-stagger--top' : 'mtl-stagger--bottom';
    card.className = `mtl-card mtl-card--${isTop ? 'top' : 'bottom'} mtl-card--${item.trend} mtl-stagger ${staggerDir}`;
    card.style.left = (xCenter - CARD_WIDTH_COMPACT / 2) + 'px';

    /* vertical: top cards bottom edge = LINE_Y - CARD_GAP_LINE, bottom cards top = LINE_Y + CARD_GAP_LINE */
    if (isTop) {
      card.style.top = (LINE_Y - CARD_GAP_LINE - COMPACT_CARD_H) + 'px';
    } else {
      card.style.top = (LINE_Y + CARD_GAP_LINE) + 'px';
    }

    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-expanded', 'false');
    card.setAttribute('aria-label', `${item.year}: ${item.title}`);
    card.setAttribute('data-year', item.year);

    card.innerHTML = buildCardHTML(item, trendInfo);

    card.addEventListener('click', (e) => {
      const closeBtn = card.querySelector('.mtl-card__close');
      if (closeBtn && e.target === closeBtn) {
        collapseCard(card, document.querySelector('.market-timeline-canvas'));
        return;
      }
      const canvas = document.querySelector('.market-timeline-canvas');
      const marker = document.querySelector(`.mtl-year-marker[aria-label="Год: ${item.year}"]`);
      toggleCard(card, item, canvas, marker);
    });

    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const canvas = document.querySelector('.market-timeline-canvas');
        const marker = document.querySelector(`.mtl-year-marker[aria-label="Год: ${item.year}"]`);
        toggleCard(card, item, canvas, marker);
      }
      if (e.key === 'Escape' && card.classList.contains('is-expanded')) {
        const canvas = document.querySelector('.market-timeline-canvas');
        collapseCard(card, canvas);
      }
    });

    return card;
  }

  function buildCardHTML(item, trendInfo) {
    const statsHTML = Object.entries(item.stats || {}).map(([key, val]) => `
      <div class="mtl-metric">
        <div class="mtl-metric__value">${val}</div>
        <div class="mtl-metric__label">${METRIC_LABELS[key] || key}</div>
      </div>
    `).join('');

    const sourcesHTML = (item.sources || []).map(s =>
      `<a class="mtl-source-link" href="${s.url}" target="_blank" rel="noopener noreferrer">${s.title}</a>`
    ).join('');

    return `
      <button class="mtl-card__close" aria-label="Закрыть">✕</button>

      <div class="mtl-card__compact">
        <div class="mtl-card__year">${item.year}</div>
        <div class="mtl-card__title">${item.title}</div>
        <div class="mtl-card__short">${item.shortText}</div>
        <span class="mtl-card__trend-badge">
          ${trendInfo.icon} ${item.marketMood || trendInfo.label}
        </span>
      </div>

      <div class="mtl-card__expanded" aria-hidden="true">
        <div class="mtl-card__divider"></div>

        <p class="mtl-card__description">${item.description}</p>

        ${statsHTML ? `<div class="mtl-metrics">${statsHTML}</div>` : ''}

        <div class="mtl-impact">
          <div class="mtl-impact__row">
            <span class="mtl-impact__icon">👤</span>
            <span class="mtl-impact__text">${item.buyerImpact}</span>
          </div>
          <div class="mtl-impact__row">
            <span class="mtl-impact__icon">💰</span>
            <span class="mtl-impact__text">${item.priceImpact}</span>
          </div>
        </div>

        <div class="mtl-insight">
          <span class="mtl-insight__tag">Аналитический вывод</span>
          <p class="mtl-insight__text">${item.insight}</p>
        </div>

        <div class="mtl-mood">
          <span class="mtl-mood__label">Настроение рынка:</span>
          <span class="mtl-mood__value">${item.moodIcon || ''} ${item.marketMood}</span>
        </div>

        ${sourcesHTML ? `<div class="mtl-sources">${sourcesHTML}</div>` : ''}
      </div>

      <div class="mtl-card__hint">развернуть</div>
    `;
  }

  /* ================================================
     TOGGLE / EXPAND / COLLAPSE
  ================================================ */
  function toggleCard(card, item, canvas, marker) {
    if (card.classList.contains('is-expanded')) {
      collapseCard(card, canvas);
    } else {
      expandCard(card, canvas, marker);
    }
  }

  const CANVAS_DEFAULT_H = 480;

  /* Resize canvas + track to fit the tallest card (expanded or compact) */
  function fitCanvasHeight(canvas) {
    const track = canvas.closest('.market-timeline-track');
    const isTop = (card) => card.classList.contains('mtl-card--top');

    let needed = CANVAS_DEFAULT_H;
    canvas.querySelectorAll('.mtl-card').forEach(card => {
      const cardTop = parseInt(card.style.top, 10) || 0;
      const cardH   = card.scrollHeight;
      needed = Math.max(needed, cardTop + cardH + 32);
    });

    canvas.style.height = needed + 'px';
    if (track) track.style.minHeight = (needed + 112) + 'px'; /* 56px padding top+bottom */
  }

  function resetCanvasHeight(canvas) {
    const track = canvas.closest('.market-timeline-track');
    canvas.style.height = CANVAS_DEFAULT_H + 'px';
    if (track) track.style.minHeight = '';
  }

  function expandCard(card, canvas, marker) {
    /* collapse any previously expanded card */
    const prev = canvas.querySelector('.mtl-card.is-expanded');
    if (prev && prev !== card) {
      collapseCard(prev, canvas, true);
    }

    card.classList.add('is-expanded');
    card.setAttribute('aria-expanded', 'true');
    canvas.classList.add('has-expanded');

    const expandedEl = card.querySelector('.mtl-card__expanded');
    if (expandedEl) expandedEl.setAttribute('aria-hidden', 'false');

    if (marker) marker.classList.add('is-active');

    /* wait for layout, then fit height and scroll into view */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fitCanvasHeight(canvas);
        scrollCardIntoView(card);
      });
    });

    expandedYear = card.dataset.year;
  }

  function collapseCard(card, canvas, silent = false) {
    card.classList.remove('is-expanded');
    card.setAttribute('aria-expanded', 'false');

    const expandedEl = card.querySelector('.mtl-card__expanded');
    if (expandedEl) expandedEl.setAttribute('aria-hidden', 'true');

    const year = card.dataset.year;
    const marker = document.querySelector(`.mtl-year-marker[aria-label="Год: ${year}"]`);
    if (marker) marker.classList.remove('is-active');

    if (!silent) {
      canvas.classList.remove('has-expanded');
      resetCanvasHeight(canvas);
    }
    expandedYear = null;
  }

  function scrollCardIntoView(card) {
    const track = document.querySelector('.market-timeline-track');
    if (!track) return;

    const trackRect = track.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const scrollOffset = cardRect.left - trackRect.left - (trackRect.width / 2) + (cardRect.width / 2);

    track.scrollBy({ left: scrollOffset, behavior: 'smooth' });
  }

  /* ================================================
     DRAG-TO-SCROLL
  ================================================ */
  function initScrollDrag(section) {
    const track = section.querySelector('.market-timeline-track');
    if (!track) return;

    let isDragging = false;
    let startX = 0;
    let scrollLeft = 0;
    let hasDragged = false;

    track.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') return;
      isDragging = true;
      hasDragged = false;
      startX = e.pageX - track.offsetLeft;
      scrollLeft = track.scrollLeft;
      track.classList.add('is-dragging');
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      track.classList.remove('is-dragging');
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const x = e.pageX - track.offsetLeft;
      const dist = x - startX;
      if (Math.abs(dist) > 4) hasDragged = true;
      track.scrollLeft = scrollLeft - dist;
    });

    /* prevent card clicks after drag */
    track.addEventListener('click', (e) => {
      if (hasDragged) {
        e.stopPropagation();
        hasDragged = false;
      }
    }, true);
  }

  /* ================================================
     INTERSECTION OBSERVER (draw line + reveal cards)
  ================================================ */
  function initIntersectionObserver(section) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          section.classList.add('mtl-in-view');
          io.unobserve(section);
        }
      });
    }, { threshold: 0.15 });

    io.observe(section);
  }

  /* ================================================
     SCROLL ARROWS
  ================================================ */
  function initScrollArrows(section) {
    const prevBtn = section.querySelector('.mtl-arrow--prev');
    const nextBtn = section.querySelector('.mtl-arrow--next');
    const track = section.querySelector('.market-timeline-track');
    if (!prevBtn || !nextBtn || !track) return;

    prevBtn.addEventListener('click', () => {
      track.scrollBy({ left: -YEAR_SPACING * 2, behavior: 'smooth' });
    });

    nextBtn.addEventListener('click', () => {
      track.scrollBy({ left: YEAR_SPACING * 2, behavior: 'smooth' });
    });
  }

  /* ================================================
     FLOATING PARTICLES
  ================================================ */
  function initParticles(section) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const container = section.querySelector('.mtl-particles');
    if (!container) return;

    for (let i = 0; i < 18; i++) {
      const p = document.createElement('div');
      p.className = 'mtl-particle';
      const size = Math.random() * 3 + 1;
      const x = Math.random() * 100;
      const delay = Math.random() * 8;
      const dur = Math.random() * 6 + 6;
      p.style.cssText = `
        width:${size}px; height:${size}px;
        left:${x}%; bottom:${Math.random() * 40}%;
        animation-duration:${dur}s;
        animation-delay:${delay}s;
        opacity:0;
      `;
      container.appendChild(p);
    }
  }

  /* ================================================
     KEYBOARD NAVIGATION
  ================================================ */
  function initKeyboard(section) {
    section.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const canvas = section.querySelector('.market-timeline-canvas');
        const expanded = canvas && canvas.querySelector('.mtl-card.is-expanded');
        if (expanded) collapseCard(expanded, canvas);
      }
    });
  }

  /* ================================================
     BOOT
  ================================================ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
