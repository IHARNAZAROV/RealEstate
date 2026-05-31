/*
  Contact widget behavior (vanilla JS)
  - Self-injects HTML and CSS into the page (no need for HTML markup on each page)
  - Появление FAB через 3 секунды после window.load
  - requestIdleCallback + fallback setTimeout
  - FAB меняет иконку и цвет каждые 10 секунд (WA -> TG -> Viber)
  - Модалка открывается по клику + авто-триггерам поведения
  - Авто-триггеры: 70% scroll, exit intent, inactivity timer
  - Закрытие: кнопка, клик по подложке, Escape
  - Scroll lock через CSS-класс
  - localStorage: время ручного закрытия (TTL 24ч)
*/

(function contactWidget() {
  'use strict';

  const STORAGE_KEY_LAST_MANUAL_CLOSE = 'cw:lastManualCloseAt';
  const SESSION_KEY_AUTO_SHOWN = 'cw:autoShownInSession';

  const MANUAL_CLOSE_TTL_MS = 24 * 60 * 60 * 1000;
  const DELAY_AFTER_LOAD_MS = 3000;
  const FAB_ROTATE_MS = 10000;

  const SCROLL_TRIGGER_RATIO = 0.7;
  const INACTIVITY_TRIGGER_MS = 45000;

  const FAB_THEMES = [
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      modifier: 'cw__fab--whatsapp',
      svgPath: 'M20.52 3.48A11.86 11.86 0 0 0 12.06 0C5.42 0 .01 5.4 0 12.05c0 2.12.56 4.2 1.63 6.04L0 24l6.08-1.58a11.95 11.95 0 0 0 5.98 1.53h.01c6.64 0 12.05-5.4 12.05-12.05a11.96 11.96 0 0 0-3.6-8.42ZM12.07 21.9h-.01a9.91 9.91 0 0 1-5.05-1.39l-.36-.22-3.61.94.96-3.52-.23-.37a9.84 9.84 0 0 1-1.52-5.27c0-5.43 4.4-9.84 9.83-9.84 2.62 0 5.08 1.02 6.93 2.88a9.78 9.78 0 0 1 2.88 6.96c0 5.42-4.42 9.83-9.82 9.83Zm5.39-7.37c-.29-.14-1.72-.85-1.99-.95-.26-.1-.45-.14-.64.15-.19.29-.74.94-.91 1.13-.17.19-.34.21-.63.07-.29-.14-1.24-.45-2.35-1.44-.87-.78-1.45-1.74-1.62-2.03-.17-.29-.02-.45.13-.59.13-.13.29-.34.43-.5.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.5-.07-.14-.64-1.55-.88-2.12-.23-.55-.46-.48-.64-.49l-.55-.01c-.19 0-.5.07-.76.36s-.99.97-.99 2.37 1.02 2.75 1.17 2.94c.14.19 2.01 3.07 4.86 4.3.68.29 1.21.46 1.63.59.68.22 1.29.19 1.78.11.54-.08 1.72-.7 1.96-1.38.24-.67.24-1.25.17-1.38-.07-.12-.26-.19-.55-.33Z'
    },
    {
      key: 'telegram',
      label: 'Telegram',
      modifier: 'cw__fab--telegram',
      svgPath: 'M21.6 2.2 2.8 9.47c-1.28.52-1.27 1.24-.23 1.56l4.82 1.5L18.55 5.5c.53-.33 1.01-.15.61.21l-9.04 8.16-.35 5.24c.51 0 .74-.24 1.02-.52l2.45-2.38 5.1 3.77c.94.52 1.62.25 1.86-.87L23.4 3.7c.35-1.37-.53-1.99-1.8-1.5Z'
    },
    {
      key: 'viber',
      label: 'Viber',
      modifier: 'cw__fab--viber',
      svgPath: 'M11.96 0C6.35 0 1.8 4.42 1.8 9.87c0 3.35 1.75 6.31 4.45 8.1V24l3.95-2.18c.57.08 1.16.13 1.76.13 5.62 0 10.16-4.42 10.16-9.87C22.12 4.42 17.58 0 11.96 0Zm5.69 14.33c-.24.69-1.42 1.29-1.99 1.37-.51.07-1.16.1-1.88-.14-.44-.14-.99-.31-1.71-.62-3-1.31-4.95-4.4-5.1-4.61-.14-.2-1.22-1.63-1.22-3.11 0-1.48.77-2.2 1.05-2.5.28-.3.61-.37.81-.37h.59c.19 0 .44-.07.68.5.26.62.89 2.16.97 2.31.08.15.13.33.02.53-.1.2-.15.33-.31.5-.16.18-.33.4-.47.54-.16.17-.32.35-.14.68.18.33.79 1.3 1.69 2.1 1.17 1.03 2.15 1.35 2.47 1.5.32.16.5.14.68-.08.18-.22.77-.9.98-1.21.2-.3.41-.25.69-.15.29.1 1.84.87 2.15 1.03.3.16.5.24.57.37.08.13.08.77-.16 1.45Z'
    }
  ];

  let domReady = false;
  let pageLoaded = false;
  let widgetInitialized = false;
  let autoShown = false;

  let fab;
  let overlay;
  let modal;
  let closeBtn;
  let fabIcon;
  let fabThemeIndex = 0;
  let fabThemeRotationIntervalId = null;

  function injectAssets() {
    if (!document.querySelector('link[href*="contact-widget.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/css/contact-widget.css';
      document.head.appendChild(link);
    }

    if (!document.querySelector('[data-cw-root]')) {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = '<div class="cw" data-cw-root>' +
        '<button class="cw__fab" type="button" aria-label="Открыть способы связи" aria-haspopup="dialog" aria-controls="cw-modal" aria-expanded="false" data-cw-open>' +
          '<span class="cw__fab-icon" aria-hidden="true">' +
            '<svg viewBox="0 0 24 24" role="img" focusable="false" aria-hidden="true">' +
              '<path d="M4 5.5C4 4.12 5.12 3 6.5 3h11C18.88 3 20 4.12 20 5.5v8c0 1.38-1.12 2.5-2.5 2.5H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5v-8Zm2.5-.5a.5.5 0 0 0-.5.5v8c0 .28.22.5.5.5h1.5c.55 0 1 .45 1 1v.56l2.8-2.49A1 1 0 0 1 12.46 13h5.04a.5.5 0 0 0 .5-.5v-8a.5.5 0 0 0-.5-.5h-11Z"/>' +
            '</svg>' +
          '</span>' +
        '</button>' +
        '<div class="cw__overlay" data-cw-overlay hidden>' +
          '<section id="cw-modal" class="cw__modal" role="dialog" aria-modal="true" aria-labelledby="cw-title" aria-describedby="cw-desc" tabindex="-1">' +
            '<button class="cw__close" type="button" aria-label="Закрыть окно" data-cw-close>' +
              '<span aria-hidden="true">\u00d7</span>' +
            '</button>' +
            '<h2 id="cw-title" class="cw__title">\u041c\u044b \u0432\u0441\u0435\u0433\u0434\u0430 \u043d\u0430 \u0441\u0432\u044f\u0437\u0438</h2>' +
            '<p id="cw-desc" class="cw__subtitle">\u041d\u0430\u043f\u0438\u0448\u0438\u0442\u0435 \u0432 \u0430\u0433\u0435\u043d\u0442\u0441\u0442\u0432\u043e \u2014 \u043f\u043e\u043c\u043e\u0436\u0435\u043c \u0441 \u043f\u043e\u043a\u0443\u043f\u043a\u043e\u0439, \u043f\u0440\u043e\u0434\u0430\u0436\u0435\u0439, \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u043e\u0439 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u043e\u0432 \u0438 \u0431\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u044b\u043c \u0441\u043e\u043f\u0440\u043e\u0432\u043e\u0436\u0434\u0435\u043d\u0438\u0435\u043c \u0441\u0434\u0435\u043b\u043a\u0438.</p>' +
            '<div class="cw__content">' +
              '<section class="cw__qr" aria-label="\u0051\u0052 \u0434\u043b\u044f \u0431\u044b\u0441\u0442\u0440\u043e\u0433\u043e \u043f\u0435\u0440\u0435\u0445\u043e\u0434\u0430 \u0432 \u0054\u0065\u006c\u0065\u0067\u0072\u0061\u006d">' +
                '<h3 class="cw__qr-title">\u0421\u043a\u0430\u043d\u0438\u0440\u0443\u0439\u0442\u0435 QR \u0441 \u0442\u0435\u043b\u0435\u0444\u043e\u043d\u0430</h3>' +
                '<div class="cw__qr-frame">' +
                  '<img class="cw__qr-image" src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=https%3A%2F%2Ft.me%2FTurkoOlga" width="240" height="240" loading="lazy" decoding="async" alt="QR-\u043a\u043e\u0434 \u0434\u043b\u044f \u0431\u044b\u0441\u0442\u0440\u043e\u0433\u043e \u043e\u0442\u043a\u0440\u044b\u0442\u0438\u044f Telegram"/>' +
                '</div>' +
              '</section>' +
              '<nav class="cw__actions" aria-label="\u0421\u043f\u043e\u0441\u043e\u0431\u044b \u0441\u0432\u044f\u0437\u0438">' +
                '<a class="cw__action cw__action--whatsapp" href="https://wa.me/375445532553" target="_blank" rel="noopener noreferrer">' +
                  '<span class="cw__action-icon" aria-hidden="true">\u2706</span>' +
                  '<span class="cw__action-label">WhatsApp</span>' +
                '</a>' +
                '<a class="cw__action cw__action--telegram" href="https://germesgarant.by" target="_blank" rel="noopener noreferrer">' +
                  '<span class="cw__action-icon" aria-hidden="true">\u27a4</span>' +
                  '<span class="cw__action-label">Telegram</span>' +
                '</a>' +
                '<a class="cw__action cw__action--viber" href="viber://chat?number=%2B375291809516">' +
                  '<span class="cw__action-icon" aria-hidden="true">\u25c9</span>' +
                  '<span class="cw__action-label">Viber</span>' +
                '</a>' +
              '</nav>' +
            '</div>' +
            '<a class="cw__phone" href="tel:+375445532553">' +
              '<span class="cw__phone-caption">\u041f\u0440\u0435\u0434\u043f\u043e\u0447\u0438\u0442\u0430\u0435\u0442\u0435 \u0437\u0432\u043e\u043d\u0438\u0442\u044c?</span>' +
              '<span class="cw__phone-number">+375445532553</span>' +
            '</a>' +
          '</section>' +
        '</div>' +
      '</div>';
      document.body.appendChild(wrapper.firstElementChild);
    }
  }

  function getNow() {
    return Date.now();
  }

  function setManualCloseTimestamp() {
    try {
      localStorage.setItem(STORAGE_KEY_LAST_MANUAL_CLOSE, String(getNow()));
    } catch (_) {
      // localStorage может быть недоступен; безопасно игнорируем.
    }
  }

  function isManualCloseStillActive() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_LAST_MANUAL_CLOSE);
      if (!raw) return false;
      const timestamp = Number(raw);
      if (!Number.isFinite(timestamp) || timestamp <= 0) return false;
      return getNow() - timestamp < MANUAL_CLOSE_TTL_MS;
    } catch (_) {
      return false;
    }
  }

  function hasSessionAutoShown() {
    try {
      return sessionStorage.getItem(SESSION_KEY_AUTO_SHOWN) === '1';
    } catch (_) {
      return false;
    }
  }

  function markSessionAutoShown() {
    try {
      sessionStorage.setItem(SESSION_KEY_AUTO_SHOWN, '1');
    } catch (_) {
      // безопасно игнорируем
    }
  }

  function canAutoOpen() {
    if (autoShown || hasSessionAutoShown()) return false;
    if (isManualCloseStillActive()) return false;
    if (isOpen()) return false;
    return true;
  }

  function isOpen() {
    return overlay && overlay.classList.contains('cw__overlay--open');
  }

  function renderFabTheme(theme) {
    if (!fab || !fabIcon || !theme) return;

    fab.classList.remove('cw__fab--whatsapp', 'cw__fab--telegram', 'cw__fab--viber');
    fab.classList.add(theme.modifier);
    fab.setAttribute('aria-label', `Открыть способы связи (${theme.label})`);

    fabIcon.classList.remove('cw__fab-icon--fade-in');
    fabIcon.classList.add('cw__fab-icon--fade-out');

    window.setTimeout(() => {
      fabIcon.innerHTML = `
        <svg viewBox="0 0 24 24" role="img" focusable="false" aria-hidden="true">
          <path d="${theme.svgPath}" />
        </svg>
      `;

      fabIcon.classList.remove('cw__fab-icon--fade-out');
      fabIcon.classList.add('cw__fab-icon--fade-in');
    }, 120);
  }

  function rotateFabTheme() {
    fabThemeIndex = (fabThemeIndex + 1) % FAB_THEMES.length;
    renderFabTheme(FAB_THEMES[fabThemeIndex]);
  }

  function startFabThemeRotation() {
    renderFabTheme(FAB_THEMES[fabThemeIndex]);

    if (fabThemeRotationIntervalId) {
      window.clearInterval(fabThemeRotationIntervalId);
    }

    fabThemeRotationIntervalId = window.setInterval(rotateFabTheme, FAB_ROTATE_MS);
  }

  function openModal(options) {
    if (!overlay || !modal || !fab || isOpen()) return;

    const { source = 'manual' } = options || {};

    overlay.hidden = false;

    requestAnimationFrame(() => {
      overlay.classList.add('cw__overlay--open');
      modal.classList.add('cw__modal--animated');
      document.body.classList.add('cw-scroll-lock');
      fab.setAttribute('aria-expanded', 'true');
      modal.focus({ preventScroll: true });

      window.setTimeout(() => {
        modal.classList.remove('cw__modal--animated');
      }, 420);
    });

    if (source !== 'manual') {
      autoShown = true;
      markSessionAutoShown();
    }
  }

  function closeModal(options) {
    if (!overlay || !fab || !isOpen()) return;

    const { manual = false } = options || {};
    if (manual) {
      setManualCloseTimestamp();
    }

    overlay.classList.remove('cw__overlay--open');
    document.body.classList.remove('cw-scroll-lock');
    fab.setAttribute('aria-expanded', 'false');

    let settled = false;
    const settleClose = () => {
      if (settled) return;
      settled = true;
      if (!isOpen()) {
        overlay.hidden = true;
      }
      overlay.removeEventListener('transitionend', settleClose);
    };

    overlay.addEventListener('transitionend', settleClose, { once: true });
    window.setTimeout(settleClose, 260);
    fab.focus({ preventScroll: true });
  }

  function handleOverlayClick(event) {
    if (event.target === overlay) {
      closeModal({ manual: true });
    }
  }

  function handleKeydown(event) {
    if (event.key === 'Escape' && isOpen()) {
      event.preventDefault();
      closeModal({ manual: true });
    }
  }

  function triggerAutoOpen(source) {
    if (!canAutoOpen()) return;
    openModal({ source });
  }

  function setupScrollTrigger() {
    const onScroll = () => {
      if (!canAutoOpen()) {
        window.removeEventListener('scroll', onScroll);
        return;
      }

      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;

      const ratio = window.scrollY / scrollable;
      if (ratio >= SCROLL_TRIGGER_RATIO) {
        triggerAutoOpen('scroll_70');
        window.removeEventListener('scroll', onScroll);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
  }

  function setupExitIntentTrigger() {
    const onMouseOut = (event) => {
      if (!canAutoOpen()) {
        document.removeEventListener('mouseout', onMouseOut);
        return;
      }

      const leavingViewportTop = event.clientY <= 8;
      const leavingDocument = !event.relatedTarget && !event.toElement;

      if (leavingViewportTop && leavingDocument) {
        triggerAutoOpen('exit_intent');
        document.removeEventListener('mouseout', onMouseOut);
      }
    };

    document.addEventListener('mouseout', onMouseOut);
  }

  function setupInactivityTrigger() {
    window.setTimeout(() => {
      triggerAutoOpen('inactivity_45s');
    }, INACTIVITY_TRIGGER_MS);
  }

  function bindEvents() {
    if (!fab || !overlay || !modal || !closeBtn) return;

    fab.addEventListener('click', () => openModal({ source: 'manual' }));
    closeBtn.addEventListener('click', () => closeModal({ manual: true }));
    overlay.addEventListener('click', handleOverlayClick);
    document.addEventListener('keydown', handleKeydown);
  }

  function setupBehaviorTriggers() {
    setupScrollTrigger();
    setupExitIntentTrigger();
    setupInactivityTrigger();
  }

  function showFab() {
    if (!fab) return;
    fab.classList.add('cw__fab--visible');
  }

  function initWidget() {
    if (widgetInitialized) return;

    injectAssets();

    fab = document.querySelector('[data-cw-open]');
    overlay = document.querySelector('[data-cw-overlay]');
    closeBtn = document.querySelector('[data-cw-close]');
    modal = document.getElementById('cw-modal');
    fabIcon = document.querySelector('.cw__fab-icon');

    if (!fab || !overlay || !closeBtn || !modal || !fabIcon) return;

    bindEvents();
    setupBehaviorTriggers();
    startFabThemeRotation();
    showFab();
    widgetInitialized = true;
  }

  function scheduleInitialization() {
    const start = () => {
      window.setTimeout(initWidget, DELAY_AFTER_LOAD_MS);
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(start, { timeout: DELAY_AFTER_LOAD_MS + 1000 });
    } else {
      window.setTimeout(start, 0);
    }
  }

  function trySchedule() {
    if (domReady && pageLoaded) {
      scheduleInitialization();
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    domReady = true;
    trySchedule();
  });

  window.addEventListener('load', () => {
    pageLoaded = true;
    trySchedule();
  });

  window.addEventListener('beforeunload', () => {
    if (fabThemeRotationIntervalId) {
      window.clearInterval(fabThemeRotationIntervalId);
      fabThemeRotationIntervalId = null;
    }
  });
})();
