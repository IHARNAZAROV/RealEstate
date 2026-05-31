/* ==========================================================
   SCROLL-DRIVEN ANIMATIONS — Premium analytics page
   Vanilla JS · IntersectionObserver · requestAnimationFrame
   No heavy libraries. GPU-accelerated. Accessible.
   ========================================================== */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     REDUCED MOTION CHECK
     ---------------------------------------------------------- */
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.innerWidth < 768;

  /* ----------------------------------------------------------
     EASING
     ---------------------------------------------------------- */
  function easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  /* ----------------------------------------------------------
     COUNT-UP ENGINE
     ---------------------------------------------------------- */
  const fmt = new Intl.NumberFormat('ru-RU');
  const fmtDec = (n, d) => Number(n).toLocaleString('ru-RU', {
    minimumFractionDigits: d, maximumFractionDigits: d
  });

  function parseNumber(str) {
    if (!str || str === '—') return null;
    // Strip BYN, spaces, currency symbols; keep digits and separators
    const cleaned = str.replace(/[^\d,.]/g, '').replace(/\s/g, '');
    // Russian locale uses space as thousands sep and comma as decimal
    const normalized = cleaned.replace(/\s/g, '').replace(',', '.');
    const n = parseFloat(normalized);
    return isNaN(n) ? null : n;
  }

  function animateCountUp(el, target, duration, decimals) {
    if (reducedMotion || !el || !isFinite(target) || target === 0) return;
    duration = duration || 1400;
    decimals = decimals || 0;
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = easeOutExpo(progress);
      const value = target * ease;
      if (decimals > 0) {
        el.textContent = fmtDec(value, decimals);
      } else {
        el.textContent = fmt.format(Math.round(value));
      }
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.classList.add('sa-countup-flash');
        setTimeout(() => el.classList.remove('sa-countup-flash'), 400);
      }
    }
    requestAnimationFrame(step);
  }

  /* ----------------------------------------------------------
     CHART REGISTRY — intercept Chart.js after it loads
     ---------------------------------------------------------- */
  const chartRegistry = new Map(); // canvasId → Chart instance

  function hookChartJS() {
    if (typeof Chart === 'undefined') return false;
    if (Chart.__sa_hooked) return true;

    const _Original = Chart;

    function HookedChart(ctx, config) {
      // On first creation disable animation so we control it
      const canvasEl = typeof ctx === 'string' ? document.getElementById(ctx) : (ctx.canvas || ctx);
      const id = canvasEl ? (canvasEl.id || Math.random().toString(36).slice(2)) : null;

      // Suppress initial animation — we'll trigger it on scroll reveal
      if (config && config.options) {
        config.options.animation = { duration: 0 };
        config.options.transitions = {};
      } else if (config) {
        config.options = { animation: { duration: 0 }, transitions: {} };
      }

      const instance = new _Original(ctx, config);
      if (id) chartRegistry.set(id, instance);
      return instance;
    }

    // Copy all static members (Chart.register, Chart.defaults, etc.)
    Object.setPrototypeOf(HookedChart, _Original);
    Object.assign(HookedChart, _Original);
    HookedChart.prototype = _Original.prototype;
    HookedChart.__sa_hooked = true;

    try { window.Chart = HookedChart; } catch (_) { /* read-only env */ }
    Chart.__sa_hooked = true;
    return true;
  }

  function tryHookChart(attempts) {
    if (attempts <= 0) return;
    if (!hookChartJS()) {
      setTimeout(() => tryHookChart(attempts - 1), 100);
    }
  }
  tryHookChart(30);

  function revealChart(canvasId) {
    const instance = chartRegistry.get(canvasId);
    if (!instance) return;
    try {
      instance.options.animation = {
        duration: reducedMotion ? 0 : 1200,
        easing: 'easeOutQuart',
        delay: (ctx) => ctx.dataIndex * 30
      };
      instance.update('active');
    } catch (_) {}
  }

  /* ----------------------------------------------------------
     INTERSECTION OBSERVER — REVEAL
     ---------------------------------------------------------- */
  function createRevealObserver(threshold, onEnter) {
    return new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            onEnter(entry.target);
          }
        });
      },
      { threshold: threshold || 0.12, rootMargin: '0px 0px -40px 0px' }
    );
  }

  /* ----------------------------------------------------------
     STAGGER CHILDREN
     ---------------------------------------------------------- */
  function staggerChildren(container, selector, baseDelay) {
    const children = container.querySelectorAll(selector || '[data-sa-stagger-child]');
    children.forEach((child, i) => {
      child.style.setProperty('--sa-i', i);
      if (!child.hasAttribute('data-sa-stagger-child')) {
        child.setAttribute('data-sa-stagger-child', '');
      }
    });
  }

  /* ----------------------------------------------------------
     SETUP: MARKET CARDS
     ---------------------------------------------------------- */
  function setupMarketCards() {
    const container = document.querySelector('.market-analytics__stats');
    if (!container) return;

    const cards = container.querySelectorAll('.market-card');
    cards.forEach((card, i) => {
      card.setAttribute('data-sa-stagger-child', '');
      card.style.setProperty('--sa-i', i);
    });

    const obs = createRevealObserver(0.1, (target) => {
      cards.forEach((card) => card.classList.add('sa-visible'));
      obs.disconnect();
    });
    obs.observe(container);
  }

  /* ----------------------------------------------------------
     SETUP: CHART WRAPS — overlay reveal + Chart.js animation
     ---------------------------------------------------------- */
  function setupChartWraps() {
    const wraps = [
      { wrap: document.querySelector('.market-analytics__chart-wrap'), canvasId: 'market-price-chart' },
      { wrap: document.querySelector('.hai-canvas-wrap'), canvasId: 'haiChart' },
    ];

    wraps.forEach(({ wrap, canvasId }) => {
      if (!wrap) return;
      wrap.classList.add('sa-chart-wrap');

      if (!reducedMotion) {
        const overlay = document.createElement('div');
        overlay.className = 'sa-chart-overlay';
        wrap.style.position = 'relative';
        wrap.appendChild(overlay);
      }

      const obs = createRevealObserver(0.15, (target) => {
        setTimeout(() => {
          target.classList.add('sa-chart-revealed');
          revealChart(canvasId);
        }, 80);
        obs.disconnect();
      });
      obs.observe(wrap);
    });
  }

  /* ----------------------------------------------------------
     SETUP: HAI SECTIONS
     ---------------------------------------------------------- */
  function setupHaiSections() {
    // Stats row children
    const statsRow = document.querySelector('.hai-stats-row');
    if (statsRow) {
      const cards = statsRow.querySelectorAll('.hai-stat-card');
      cards.forEach((c, i) => {
        c.setAttribute('data-sa-stagger-child', '');
        c.style.setProperty('--sa-i', i);
      });
      statsRow.setAttribute('data-sa-reveal', '');
      const obs = createRevealObserver(0.1, () => {
        statsRow.classList.add('sa-visible');
        cards.forEach(c => c.classList.add('sa-visible'));
        obs.disconnect();
      });
      obs.observe(statsRow);
    }

    // Highlight card
    const highlight = document.querySelector('.hai-highlight');
    if (highlight) {
      highlight.setAttribute('data-sa-reveal', '');
      const obs = createRevealObserver(0.1, () => {
        highlight.classList.add('sa-visible');
        obs.disconnect();
      });
      obs.observe(highlight);
    }

    // Insight + SEO blocks
    ['.hai-insight', '.hai-seo', '.hai-chart-wrap'].forEach((sel) => {
      const el = document.querySelector(sel);
      if (!el) return;
      el.setAttribute('data-sa-reveal', '');
      const obs = createRevealObserver(0.08, () => {
        el.classList.add('sa-visible');
        obs.disconnect();
      });
      obs.observe(el);
    });

    // HAI section glow
    const haiSection = document.getElementById('housing-affordability-index');
    if (haiSection) {
      const obs = createRevealObserver(0.05, () => {
        haiSection.setAttribute('data-sa-section-active', '');
        obs.disconnect();
      });
      obs.observe(haiSection);
    }
  }

  /* ----------------------------------------------------------
     SETUP: HAI TIMELINE ITEMS
     ---------------------------------------------------------- */
  function setupHaiTimeline() {
    const container = document.getElementById('haiTimeline');
    if (!container) return;

    // Items are generated dynamically — observe mutations
    const mo = new MutationObserver(() => {
      const items = container.querySelectorAll('.hai-timeline-year, [class*="hai-timeline"]');
      items.forEach((item, i) => {
        if (item.classList.contains('hai-timeline-item')) return;
        item.classList.add('hai-timeline-item');
        const obs = createRevealObserver(0.1, () => {
          setTimeout(() => item.classList.add('sa-visible'), i * 60);
          obs.disconnect();
        });
        obs.observe(item);
      });
    });
    mo.observe(container, { childList: true, subtree: true });
  }

  /* ----------------------------------------------------------
     SETUP: TRENDS GRID (rem-price-card)
     ---------------------------------------------------------- */
  function setupTrendsGrid() {
    const grid = document.getElementById('remTrendsGrid');
    if (!grid) return;

    function revealCards() {
      const cards = grid.querySelectorAll('.rem-price-card:not([data-sa-stagger-child])');
      if (!cards.length) return;
      cards.forEach((card, i) => {
        card.setAttribute('data-sa-stagger-child', '');
        card.style.setProperty('--sa-i', i);
      });
      // Observe grid
      const obs = createRevealObserver(0.05, () => {
        cards.forEach(c => c.classList.add('sa-visible'));
        obs.disconnect();
      });
      obs.observe(grid);
    }

    // Cards may load dynamically
    const mo = new MutationObserver(revealCards);
    mo.observe(grid, { childList: true });
    revealCards(); // in case already populated
  }

  /* ----------------------------------------------------------
     SETUP: FAQ ITEMS
     ---------------------------------------------------------- */
  function setupFaqItems() {
    const faq = document.querySelector('.rem-faq');
    if (!faq) return;
    const items = faq.querySelectorAll('.rem-faq__item');
    items.forEach((item, i) => {
      item.setAttribute('data-sa-stagger-child', '');
      item.style.setProperty('--sa-i', i);
    });
    const obs = createRevealObserver(0.08, () => {
      items.forEach(item => item.classList.add('sa-visible'));
      obs.disconnect();
    });
    obs.observe(faq);
  }

  /* ----------------------------------------------------------
     SETUP: SECTION INTROS
     ---------------------------------------------------------- */
  function setupSectionIntros() {
    document.querySelectorAll('.rem-section-intro, .section-head').forEach((el) => {
      if (el.hasAttribute('data-sa-reveal')) return;
      el.setAttribute('data-sa-reveal', '');
      const obs = createRevealObserver(0.1, () => {
        el.classList.add('sa-visible');
        obs.disconnect();
      });
      obs.observe(el);
    });
  }

  /* ----------------------------------------------------------
     SETUP: DELAY CALC CARDS
     ---------------------------------------------------------- */
  function setupDelayCalcCards() {
    // Animate calc cards when they appear
    const results = document.getElementById('delayCalcResults');
    if (!results) return;

    const mo = new MutationObserver(() => {
      const cards = results.querySelectorAll('.delay-calc__card:not([data-sa-stagger-child])');
      if (!cards.length) return;
      cards.forEach((card, i) => {
        card.setAttribute('data-sa-stagger-child', '');
        card.style.setProperty('--sa-i', i);
        // Trigger reveal with slight delay
        setTimeout(() => card.classList.add('sa-visible'), 60 + i * 80);
      });
    });
    mo.observe(results, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  /* ----------------------------------------------------------
     SETUP: BAR CHART ANIMATION (delay-calc)
     ---------------------------------------------------------- */
  function setupBarAnimation() {
    const barChart = document.querySelector('.delay-calc__chart');
    if (!barChart) return;

    // Capture widths set by delay-calc.js and animate them
    barChart.classList.add('sa-bar-animated');

    // Watch bar fills for inline style changes (delay-calc.js sets width%)
    const fills = barChart.querySelectorAll('.delay-calc__bar-fill');
    fills.forEach((fill) => {
      let ignoreNext = false;
      const mo = new MutationObserver(() => {
        const w = fill.style.width;
        if (ignoreNext) { ignoreNext = false; return; }
        if (w && w !== '0%') {
          fill.style.setProperty('--sa-bar-target', w);
          ignoreNext = true;
          fill.style.width = '0%';
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              barChart.classList.add('sa-bars-revealed');
            });
          });
        } else {
          barChart.classList.remove('sa-bars-revealed');
        }
      });
      mo.observe(fill, { attributes: true, attributeFilter: ['style'] });
    });
  }

  /* ----------------------------------------------------------
     COUNT-UP: MARKET CARDS via MutationObserver
     ---------------------------------------------------------- */
  function setupMarketCountups() {
    const targets = [
      '#avg-apartment-price',
      '#avg-room-1-price',
      '#avg-room-2-price',
      '#avg-room-3-price',
      '#avg-room-4-price',
    ];

    targets.forEach((sel) => {
      const el = document.querySelector(sel);
      if (!el) return;

      const mo = new MutationObserver(() => {
        const text = el.textContent || '';
        if (text === '—' || text === '') return;
        // Parse the BYN number out
        const match = text.match(/[\d\s]+/);
        if (!match) return;
        const raw = match[0].replace(/\s/g, '');
        const num = parseInt(raw, 10);
        if (!isFinite(num) || num === 0) return;
        mo.disconnect();

        // Wait for element to be in viewport, then countup
        const obs = createRevealObserver(0.1, () => {
          animateCountUp(el, num, 1400, 0);
          obs.disconnect();
        });
        obs.observe(el);
      });
      mo.observe(el, { childList: true, characterData: true, subtree: true });
    });
  }

  /* ----------------------------------------------------------
     LIVE BADGE — inject "Рынок активен" indicator
     ---------------------------------------------------------- */
  function injectLiveBadge() {
    const statsEl = document.querySelector('.market-analytics__stats');
    if (!statsEl) return;
    if (document.querySelector('.sa-live-badge')) return;

    const badge = document.createElement('div');
    badge.className = 'sa-live-badge';
    badge.innerHTML = '<span class="sa-live-dot"></span>Данные обновляются';
    statsEl.parentNode.insertBefore(badge, statsEl);
  }

  /* ----------------------------------------------------------
     TREND ARROW ANIMATION — market trend card
     ---------------------------------------------------------- */
  function setupTrendArrow() {
    const trendEl = document.getElementById('market-trend');
    if (!trendEl) return;

    const mo = new MutationObserver(() => {
      const text = trendEl.textContent || '';
      if (text === '—') return;
      // If text contains ↑ or ↓, wrap in animated span
      if (text.includes('↑') || text.includes('↓') || text.includes('→')) {
        trendEl.innerHTML = trendEl.innerHTML.replace(
          /(↑|↓|→)/g,
          '<span class="sa-trend-arrow">$1</span>'
        );
        mo.disconnect();
      }
    });
    mo.observe(trendEl, { childList: true, characterData: true, subtree: true });
  }

  /* ----------------------------------------------------------
     PARALLAX — subtle background parallax on scroll
     ---------------------------------------------------------- */
  function setupParallax() {
    if (reducedMotion || isMobile) return;

    const glowOrb = document.querySelector('.hai-glow-orb');
    if (glowOrb) glowOrb.setAttribute('data-sa-parallax', '0.15');

    const parallaxEls = document.querySelectorAll('[data-sa-parallax]');
    if (!parallaxEls.length) return;

    let ticking = false;
    let lastScrollY = window.scrollY;

    function updateParallax() {
      const sy = window.scrollY;
      parallaxEls.forEach((el) => {
        const speed = parseFloat(el.getAttribute('data-sa-parallax') || '0.1');
        const rect = el.getBoundingClientRect();
        const centerY = rect.top + rect.height / 2;
        const viewH = window.innerHeight;
        const offset = (centerY - viewH / 2) * speed;
        el.style.transform = `translate3d(0, ${offset}px, 0)`;
      });
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(updateParallax);
        ticking = true;
      }
    }, { passive: true });
  }

  /* ----------------------------------------------------------
     SMART TICKER — subtle number shimmer on market cards
     (fires once after data loads to simulate "live update")
     ---------------------------------------------------------- */
  function setupMarketTicker() {
    const priceEl = document.getElementById('avg-apartment-price');
    if (!priceEl) return;

    let fired = false;
    const mo = new MutationObserver(() => {
      if (fired) return;
      const text = priceEl.textContent || '';
      if (text === '—' || text === '') return;
      fired = true;
      mo.disconnect();

      // After count-up completes, do a subtle ticker shimmer
      setTimeout(() => {
        priceEl.classList.add('sa-ticker-highlight');
        setTimeout(() => priceEl.classList.remove('sa-ticker-highlight'), 700);
      }, 1800);
    });
    mo.observe(priceEl, { childList: true, characterData: true, subtree: true });
  }

  /* ----------------------------------------------------------
     CTA SECTION REVEAL
     ---------------------------------------------------------- */
  function setupCtaReveal() {
    const cta = document.querySelector('.rem-cta');
    if (!cta) return;
    cta.setAttribute('data-sa-reveal', '');
    const obs = createRevealObserver(0.15, () => {
      cta.classList.add('sa-visible');
      obs.disconnect();
    });
    obs.observe(cta);
  }

  /* ----------------------------------------------------------
     PAGE INTRO REVEAL
     ---------------------------------------------------------- */
  function setupPageIntro() {
    const intro = document.querySelector('.page-intro-inner');
    if (!intro) return;
    const children = intro.children;
    Array.from(children).forEach((child, i) => {
      child.setAttribute('data-sa-stagger-child', '');
      child.style.setProperty('--sa-i', i);
      // Trigger immediately (already in viewport)
      setTimeout(() => child.classList.add('sa-visible'), 80 + i * 100);
    });
  }

  /* ----------------------------------------------------------
     INIT
     ---------------------------------------------------------- */
  function init() {
    setupPageIntro();
    setupMarketCards();
    setupChartWraps();
    setupHaiSections();
    setupHaiTimeline();
    setupTrendsGrid();
    setupFaqItems();
    setupSectionIntros();
    setupDelayCalcCards();
    setupBarAnimation();
    setupMarketCountups();
    injectLiveBadge();
    setupTrendArrow();
    setupParallax();
    setupMarketTicker();
    setupCtaReveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
