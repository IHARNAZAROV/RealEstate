/**
 * real-estate-market.js
 * Логика страницы «Рынок недвижимости Лиды»
 * — скролл-ревил карточек
 * — анимированные счётчики в hero
 * — рендер карточек трендов из JSON
 */
(function () {
  'use strict';

  /* ── Данные аналитики / трендов ──────────────────────────── */
  var TREND_DATA = [
    {
      category: 'analytics',
      badge: 'Аналитика цен',
      date: 'Январь 2026',
      readTime: '4 мин',
      title: 'Средние цены на квартиры в Лиде: итоги и прогноз',
      excerpt: 'По данным рынка, средняя стоимость 1-комнатных квартир в Лиде продолжает уверенно расти. Ключевые факторы — инфляция, рост стоимости строительства и устойчивый спрос.',
      tag: 'Квартиры',
      link: '/blog'
    },
    {
      category: 'buyer',
      badge: 'Советы покупателям',
      date: 'Февраль 2026',
      readTime: '5 мин',
      title: 'Как правильно выбрать квартиру в Лиде: 7 критериев',
      excerpt: 'Расположение, юридическая чистота, состояние дома — эти факторы напрямую влияют на ликвидность и комфорт проживания. Подробный гайд от практикующего риэлтера.',
      tag: 'Покупка',
      link: '/blog'
    },
    {
      category: 'seller',
      badge: 'Советы продавцам',
      date: 'Февраль 2026',
      readTime: '3 мин',
      title: 'Как продать квартиру быстро и по лучшей цене',
      excerpt: 'Правильная предпродажная подготовка, грамотное описание и профессиональные фото — три шага, которые сокращают срок экспозиции объекта вдвое.',
      tag: 'Продажа',
      link: '/blog'
    },
    {
      category: 'trend',
      badge: 'Тренды',
      date: 'Март 2026',
      readTime: '6 мин',
      title: 'Рынок недвижимости Беларуси в 2026: ключевые тренды',
      excerpt: 'Рост спроса на жильё в регионах, смещение интереса к частным домам, влияние ипотечных программ и динамика цен на строительные материалы.',
      tag: 'Макро',
      link: '/blog'
    },
    {
      category: 'district',
      badge: 'Районы Лиды',
      date: 'Март 2026',
      readTime: '4 мин',
      title: 'Сравнение районов Лиды по ценам на недвижимость',
      excerpt: 'Центр, Север, ул. Советская, Южный Городок — цены, инфраструктура, транспортная доступность. Где выгоднее покупать и почему.',
      tag: 'Районы',
      link: '/nedvizhimost-lida'
    },
    {
      category: 'news',
      badge: 'Новости рынка',
      date: 'Апрель 2026',
      readTime: '3 мин',
      title: 'Ипотечные программы в Беларуси 2026: актуальные условия',
      excerpt: 'Льготная ипотека, государственные жилищные программы, условия коммерческих банков. Всё, что нужно знать перед покупкой жилья в кредит.',
      tag: 'Ипотека',
      link: '/blog'
    }
  ];

  /* ── Рендер карточек ─────────────────────────────────────── */
  function renderTrendCards() {
    var container = document.getElementById('remTrendsGrid');
    if (!container) return;

    var html = TREND_DATA.map(function (card, idx) {
      var delay = 'rem-reveal--delay-' + Math.min(idx + 1, 5);
      var badgeClass = 'rem-trend-card__badge--' + card.category;
      return '<article class="rem-trend-card rem-reveal ' + delay + '" style="--rem-accent:' + accentFor(card.category) + '">' +
        '<div class="rem-trend-card__header">' +
          '<span class="rem-trend-card__badge ' + badgeClass + '">' + escHtml(card.badge) + '</span>' +
          '<div class="rem-trend-card__meta">' +
            '<span class="rem-trend-card__date">' + escHtml(card.date) + '</span>' +
            '<span class="rem-trend-card__read-time">' + escHtml(card.readTime) + '</span>' +
          '</div>' +
        '</div>' +
        '<h3 class="rem-trend-card__title">' + escHtml(card.title) + '</h3>' +
        '<p class="rem-trend-card__excerpt">' + escHtml(card.excerpt) + '</p>' +
        '<div class="rem-trend-card__footer">' +
          '<a href="' + escHtml(card.link) + '" class="rem-trend-card__link">Читать подробнее</a>' +
          '<span class="rem-trend-card__tag">' + escHtml(card.tag) + '</span>' +
        '</div>' +
      '</article>';
    }).join('');

    container.innerHTML = html;
  }

  function accentFor(cat) {
    var map = {
      analytics: '#0059ff',
      buyer:     '#1e7a4e',
      seller:    '#9b5200',
      trend:     '#6d28d9',
      district:  '#c05c5c',
      news:      '#155945'
    };
    return map[cat] || '#155945';
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── Scroll reveal ───────────────────────────────────────── */
  function initScrollReveal() {
    var els = document.querySelectorAll('.rem-reveal');
    if (!els.length) return;

    if (!window.IntersectionObserver) {
      els.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    els.forEach(function (el) { io.observe(el); });
  }

  /* ── Анимированный счётчик ───────────────────────────────── */
  function animCount(el, target, duration, suffix) {
    if (!el) return;
    var start = null;
    suffix = suffix || '';
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var ease = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(ease * target) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function initHeroCounters() {
    var counters = document.querySelectorAll('[data-rem-count]');
    if (!counters.length || !window.IntersectionObserver) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var target  = parseInt(el.getAttribute('data-rem-count'), 10) || 0;
        var suffix  = el.getAttribute('data-rem-suffix') || '';
        var dur     = parseInt(el.getAttribute('data-rem-dur'), 10) || 1200;
        animCount(el, target, dur, suffix);
        io.unobserve(el);
      });
    }, { threshold: 0.5 });

    counters.forEach(function (el) { io.observe(el); });
  }

  /* ── Init ────────────────────────────────────────────────── */
  function init() {
    renderTrendCards();
    initScrollReveal();
    initHeroCounters();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
