(function () {
  "use strict";

  const _scriptPromises = new Map();

  function loadScriptOnce(url) {
    if (_scriptPromises.has(url)) return _scriptPromises.get(url);

    const promise = new Promise(function (resolve, reject) {
      const existing = document.querySelector(
        'script[data-lazy-loaded="' + url + '"]'
      );
      if (existing) {
        existing.addEventListener("load", function () { resolve(); });
        existing.addEventListener("error", reject);
        return;
      }

      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.setAttribute("data-lazy-loaded", url);
      script.onload = function () { resolve(); };
      script.onerror = reject;
      document.head.appendChild(script);
    });

    _scriptPromises.set(url, promise);
    return promise;
  }

  function setupChartLazyLoad() {
    const chartEl = document.getElementById("market-price-chart");
    if (!chartEl) return;

    const startLoad = function () {
      loadScriptOnce(
        "https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"
      )
        .then(function () {
          return loadScriptOnce("/js/market-analytics.js?v=20260319-1");
        })
        .catch(function (err) {
          console.error("Lazy-load chart/market-analytics failed:", err);
        });
    };

    if (typeof IntersectionObserver === "undefined") {
      startLoad();
      return;
    }

    const io = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            observer.disconnect();
            startLoad();
          }
        });
      },
      { rootMargin: "200px 0px" }
    );

    io.observe(chartEl);
  }

  function setupModalClickLazyLoad(buttonSelector, scriptUrl) {
    const buttons = document.querySelectorAll(buttonSelector);
    if (!buttons.length) return;

    function handleFirstClick(event) {
      event.preventDefault();
      event.stopPropagation();
      const button = event.currentTarget;

      buttons.forEach(function (b) {
        b.removeEventListener("click", handleFirstClick);
      });

      loadScriptOnce(scriptUrl)
        .then(function () {
          button.click();
        })
        .catch(function (err) {
          console.error("Lazy-load failed:", scriptUrl, err);
        });
    }

    buttons.forEach(function (b) {
      b.addEventListener("click", handleFirstClick);
    });
  }

  function init() {
    setupChartLazyLoad();
    setupModalClickLazyLoad(
      "[data-client-quiz-open]",
      "/js/client-quiz.js"
    );
    setupModalClickLazyLoad(
      "[data-documents-checklist-open]",
      "/js/documents-checklist.js?v=20260424-3"
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
