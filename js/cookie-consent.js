(function() {
  'use strict';

  const COOKIE_NAME = 'cookieConsent';
  const COOKIE_DURATION_DAYS = 180;
  const YANDEX_METRICA_ID = 105770392;

  // Отправка целей в Яндекс.Метрику
  function sendYandexGoal(goalName, params) {
    if (typeof ym === 'function') {
      ym(YANDEX_METRICA_ID, 'reachGoal', goalName, params || {});
    }
  }

  // Чтение куки
  function readCookie() {
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith(COOKIE_NAME + '='))
      ?.split('=')[1];

    if (!cookieValue) return null;

    try {
      return JSON.parse(decodeURIComponent(cookieValue));
    } catch (e) {
      return null;
    }
  }

  // Сохранение куки
  function saveCookie(settings) {
    const maxAgeSeconds = 24 * COOKIE_DURATION_DAYS * 60 * 60;
    const cookieData = {
      necessary: true,
      analytics: settings.analytics !== false, // Можно управлять
      marketing: settings.marketing === true, // Включается только при явном согласии
      updatedAt: new Date().toISOString()
    };
    const cookieString = encodeURIComponent(JSON.stringify(cookieData));
    document.cookie = `${COOKIE_NAME}=${cookieString}; max-age=${maxAgeSeconds}; path=/; SameSite=Lax`;
  }

  // Применить съедобные куки
  function applyCookieConsent() {
    if (typeof window.__applyCookieConsent === 'function') {
      window.__applyCookieConsent();
    }
  }

  // Показать модалку
  function showCookieModal() {
    const modal = document.getElementById('cookieModal');
    if (modal) {
      modal.classList.add('show');
    }
  }

  // Скрыть модалку
  function hideCookieModal() {
    const modal = document.getElementById('cookieModal');
    const settings = document.getElementById('cookieSettings');
    if (modal) modal.classList.remove('show');
    if (settings) settings.classList.remove('open');
  }

  document.addEventListener('DOMContentLoaded', function() {
    // Создать HTML модалки
    function createCookieModal() {
      if (document.getElementById('cookieModal')) return;

      const modal = document.createElement('div');
      modal.id = 'cookieModal';
      modal.className = 'cookie-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-label', 'Настройки cookies');

      modal.innerHTML = `
      <div class="cookie-top">
        <div class="cookie-title">
          <div class="cookie-icon" aria-hidden="true">🍪</div>
          <div class="cookie-title-text">
            <h2>Cookies</h2>
            <p>Вы управляете своими настройками.</p>
          </div>
        </div>
        <button class="cookie-close" id="cookieCloseBtn" type="button" aria-label="Закрыть">✕</button>
      </div>

      <div class="cookie-body">
        <p class="cookie-desc">
          Мы используем cookies для корректной работы сайта, аналитики и улучшения пользовательского опыта.
          <a href="/cookies-policy" target="_blank" rel="noopener noreferrer">Подробнее</a>
        </p>

        <div class="cookie-actions">
          <button class="cookie-btn primary" id="cookieAcceptAll">Принять всё</button>
          <button class="cookie-btn ghost" id="cookieDeclineAll">Отклонить</button>
          <button class="cookie-btn outline" id="cookieSettingsBtn">Настроить</button>
        </div>

        <div class="cookie-settings" id="cookieSettings">
          <div class="cookie-settings-head">
            <h3>Настройки cookies</h3>
            <p>Necessary куки необходимы для работы сайта. Вы можете управлять аналитикой и маркетингом.</p>
          </div>

          <div class="cookie-setting-row">
            <div class="cookie-setting-text">
              <strong>Necessary</strong>
              <span>Обязательны для работы сайта</span>
            </div>
            <label class="cookie-switch">
              <input type="checkbox" checked disabled />
              <span class="cookie-slider"></span>
            </label>
          </div>

          <div class="cookie-setting-row">
            <div class="cookie-setting-text">
              <strong>Analytics (GA4, Яндекс.Метрика, GTM)</strong>
              <span>Помогает улучшать сайт через аналитику</span>
            </div>
            <label class="cookie-switch">
              <input type="checkbox" id="analyticsToggle" checked />
              <span class="cookie-slider"></span>
            </label>
          </div>

          <div class="cookie-setting-row">
            <div class="cookie-setting-text">
              <strong>Marketing</strong>
              <span>Для релевантной рекламы и ретаргетинга</span>
            </div>
            <label class="cookie-switch">
              <input type="checkbox" id="marketingToggle" />
              <span class="cookie-slider"></span>
            </label>
          </div>

          <div class="cookie-settings-actions">
            <button class="cookie-btn primary" id="cookieSaveSettings">Сохранить</button>
            <button class="cookie-btn ghost" id="cookieBackBtn">Назад</button>
          </div>
        </div>
      </div>
    `;

      document.body.appendChild(modal);
    }

    // Создать модалку
    createCookieModal();

    // Проверка наличия модалки
    if (!document.getElementById('cookieModal')) return;

    // Элементы
    const btnAcceptAll = document.getElementById('cookieAcceptAll');
    const btnDeclineAll = document.getElementById('cookieDeclineAll');
    const btnSettings = document.getElementById('cookieSettingsBtn');
    const btnSaveSettings = document.getElementById('cookieSaveSettings');
    const btnBack = document.getElementById('cookieBackBtn');
    const btnClose = document.getElementById('cookieCloseBtn');
    const settingsContainer = document.getElementById('cookieSettings');

    const existingCookie = readCookie();

    // Если куки уже установлены, применить их и скрыть модалку
    if (existingCookie) {
      applyCookieConsent();
      hideCookieModal();
    } else {
      // Показать модалку при первом визите
      showCookieModal();
      sendYandexGoal('cookie_modal_shown');

      // Принять всё
      btnAcceptAll.addEventListener('click', function() {
        sendYandexGoal('cookie_accept_all');
        saveCookie({ analytics: true, marketing: true });
        applyCookieConsent();
        hideCookieModal();
      });

      // Отклонить (только необходимые куки)
      btnDeclineAll.addEventListener('click', function() {
        sendYandexGoal('cookie_decline_all');
        saveCookie({ analytics: false, marketing: false });
        applyCookieConsent();
        hideCookieModal();
      });

      // Открыть настройки
      btnSettings.addEventListener('click', function() {
        settingsContainer.classList.add('open');
      });

      // Закрыть настройки
      btnBack.addEventListener('click', function() {
        settingsContainer.classList.remove('open');
      });

      // Сохранить настройки
      btnSaveSettings.addEventListener('click', function() {
        const analyticsToggle = document.getElementById('analyticsToggle');
        const marketingToggle = document.getElementById('marketingToggle');
        const settings = {
          analytics: analyticsToggle ? analyticsToggle.checked : true,
          marketing: marketingToggle ? marketingToggle.checked : false
        };
        sendYandexGoal('cookie_save_settings', { 
          analytics: settings.analytics ? 1 : 0,
          marketing: settings.marketing ? 1 : 0
        });
        saveCookie(settings);
        applyCookieConsent();
        hideCookieModal();
      });

      // Закрыть по крестику (только необходимые куки)
      btnClose.addEventListener('click', function() {
        sendYandexGoal('cookie_close');
        saveCookie({ analytics: false, marketing: false });
        applyCookieConsent();
        hideCookieModal();
      });
    }

    // Функция для открытия настроек извне
    window.openCookieSettings = function() {
      showCookieModal();
      settingsContainer.classList.add('open');
    };
  });
})();