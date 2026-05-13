(function () {
  "use strict";

  const COOKIE_NAME = "cookieConsent";
  const YANDEX_METRIKA_ID = 105770392;
  const GTM_CONTAINER_ID = "GTM-WVJ6PL6L";

  let isMetrikaLoaded = false;
  let isGoogleTagManagerLoaded = false;

  /**
   * Получение значения cookie по имени
   */
  function getCookie(name) {
    const cookies = document.cookie || "";

    if (!cookies) {
      return null;
    }

    const cookieList = cookies.split("; ");

    for (const cookieItem of cookieList) {
      const parts = cookieItem.split("=");
      const cookieName = parts.shift();
      const cookieValue = parts.join("=");

      if (cookieName === name) {
        return cookieValue ? decodeURIComponent(cookieValue) : "";
      }
    }

    return null;
  }

  /**
   * Получение настроек cookieConsent
   */
  function getCookieConsentSettings() {
    const rawCookieValue = getCookie(COOKIE_NAME);

    if (!rawCookieValue) {
      return null;
    }

    try {
      const parsedSettings = JSON.parse(rawCookieValue);

      if (!parsedSettings || typeof parsedSettings !== "object") {
        return null;
      }

      return {
        necessary: true,
        analytics: Boolean(parsedSettings.analytics),
        marketing: Boolean(parsedSettings.marketing),
      };
    } catch (error) {
      console.warn("Не удалось разобрать cookieConsent:", error);
      return null;
    }
  }

  /**
   * Подключение Яндекс.Метрики
   */
  function loadYandexMetrika() {
    if (isMetrikaLoaded) {
      return;
    }

    isMetrikaLoaded = true;

    window.ym =
      window.ym ||
      function () {
        (window.ym.a = window.ym.a || []).push(arguments);
      };

    window.ym.l = Date.now();

    const metrikaScript = document.createElement("script");
    metrikaScript.async = true;
    metrikaScript.src = "https://mc.yandex.ru/metrika/tag.js";

    document.head.appendChild(metrikaScript);

    window.ym(YANDEX_METRIKA_ID, "init", {
      webvisor: true,
      clickmap: true,
      accurateTrackBounce: true,
      trackLinks: true,
      ecommerce: "dataLayer",
    });

    console.log("✅ Яндекс.Метрика подключена");
  }

  /**
   * Подключение Google Tag Manager
   */
  function loadGoogleTagManager() {
    if (isGoogleTagManagerLoaded) {
      return;
    }

    isGoogleTagManagerLoaded = true;

    window.dataLayer = window.dataLayer || [];

    window.dataLayer.push({
      "gtm.start": Date.now(),
      event: "gtm.js",
    });

    const gtmScript = document.createElement("script");
    gtmScript.async = true;
    gtmScript.src =
      "https://www.googletagmanager.com/gtm.js?id=" +
      encodeURIComponent(GTM_CONTAINER_ID);

    document.head.appendChild(gtmScript);

    console.log("✅ Google Tag Manager подключен");
  }

  /**
   * Применение настроек cookies
   */
  function applyCookieConsentSettings(consentSettings) {
    if (!consentSettings || consentSettings.necessary !== true) {
      return;
    }

    if (consentSettings.analytics) {
      loadYandexMetrika();
    }

    if (consentSettings.marketing) {
      loadGoogleTagManager();
    }
  }

  /**
   * Глобальная функция для повторного применения consent
   */
  window.__applyCookieConsent = function () {
    const consentSettings = getCookieConsentSettings();
    applyCookieConsentSettings(consentSettings);
  };

  /**
   * Автозагрузка после полной загрузки страницы
   */
  window.addEventListener("load", function () {
    const consentSettings = getCookieConsentSettings();

    if (consentSettings) {
      applyCookieConsentSettings(consentSettings);
    }
  });
})();