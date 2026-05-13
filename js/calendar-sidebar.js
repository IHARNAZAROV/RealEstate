"use strict";

/* ============================================================
   CALENDAR SIDEBAR — calendar-sidebar.js
   Плавающий интерактивный календарь публикаций блога.
   Vanilla JS. Без сторонних библиотек.
   ============================================================ */

(function () {
  /* ----------------------------------------------------------
     КОНСТАНТЫ
  ---------------------------------------------------------- */
  const MONTHS_RU = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
  ];

  const WEEKDAYS_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  /* SVG-иконки */
  const ICON_ARROW_LEFT  = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>';
  const ICON_ARROW_RIGHT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>';
  const ICON_ARROW_LINK  = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';

  /* ----------------------------------------------------------
     СОСТОЯНИЕ
  ---------------------------------------------------------- */
  let articlesByDate = {};  // { "YYYY-MM-DD": [article, …] }
  let currentYear;
  let currentMonth;
  let activeDate   = null;  // Выбранная дата (YYYY-MM-DD)
  let panelIsOpen  = false;

  /* ----------------------------------------------------------
     DOM-ССЫЛКИ
  ---------------------------------------------------------- */
  let elSidebar;
  let elFab;
  let elPanel;
  let elTitle;
  let elGrid;
  let elPopup;
  let elPopupContent;

  /* ----------------------------------------------------------
     УТИЛИТА: парсинг даты статьи
     Форматы: "DD.MM.YYYY" (используется в проекте) и "YYYY-MM-DD"
  ---------------------------------------------------------- */
  function parseArticleDate(str) {
    if (!str || typeof str !== "string") return null;
    let day, month, year;

    if (str.includes(".")) {
      [day, month, year] = str.split(".");
    } else if (str.includes("-") && str.length === 10) {
      [year, month, day] = str.split("-");
    } else {
      return null;
    }

    day   = parseInt(day,   10);
    month = parseInt(month, 10);
    year  = parseInt(year,  10);

    if (!day || !month || !year) return null;
    return new Date(year, month - 1, day);
  }

  /* ----------------------------------------------------------
     УТИЛИТА: Date → ключ "YYYY-MM-DD"
  ---------------------------------------------------------- */
  function toDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  /* ----------------------------------------------------------
     УТИЛИТА: ключ "YYYY-MM-DD" → русская дата
  ---------------------------------------------------------- */
  function formatDateRu(key) {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  /* ----------------------------------------------------------
     ЗАГРУЗКА СТАТЕЙ
     Пытается переиспользовать глобальный allArticles из
     blog-list.js; если недоступен — загружает сам.
  ---------------------------------------------------------- */
  function loadArticles(callback) {
    /* Если blog-list.js уже загрузил и данные готовы */
    if (typeof allArticles !== "undefined" && Array.isArray(allArticles) && allArticles.length > 0) {
      callback(allArticles);
      return;
    }

    /* Слушаем кастомное событие на случай, если blog-list.js
       ещё не отработал, но вот-вот выбросит его */
    const onReady = function (e) {
      document.removeEventListener("blog:articlesReady", onReady);
      callback(e.detail || []);
    };
    document.addEventListener("blog:articlesReady", onReady);

    /* Параллельно грузим самостоятельно */
    fetch("/data/blog-articles.json")
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (articles) {
        document.removeEventListener("blog:articlesReady", onReady);
        callback(articles);
      })
      .catch(function (err) {
        console.warn("[CalendarSidebar] Ошибка загрузки статей:", err);
        document.removeEventListener("blog:articlesReady", onReady);
        callback([]);
      });
  }

  /* ----------------------------------------------------------
     ГРУППИРОВКА: массив статей → { "YYYY-MM-DD": [article,…] }
  ---------------------------------------------------------- */
  function groupArticlesByDate(articles) {
    const map = {};
    articles.forEach(function (a) {
      if (!a.date) return;
      const d = parseArticleDate(a.date);
      if (!d || isNaN(d.getTime())) return;
      const key = toDateKey(d);
      (map[key] = map[key] || []).push(a);
    });
    return map;
  }

  /* ----------------------------------------------------------
     РЕНДЕР СЕТКИ КАЛЕНДАРЯ
  ---------------------------------------------------------- */
  function renderCalendar() {
    if (!elTitle || !elGrid) return;

    elTitle.textContent = `${MONTHS_RU[currentMonth]} ${currentYear}`;
    elGrid.innerHTML = "";

    const todayKey  = toDateKey(new Date());
    const firstDay  = new Date(currentYear, currentMonth, 1);
    const daysInMonth     = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth,     0).getDate();

    /* Смещение первого дня (0=Пн … 6=Вс) */
    let startDow = firstDay.getDay();
    startDow = (startDow + 6) % 7;

    /* Всегда 42 ячейки (6 строк × 7 дней) */
    for (let i = 0; i < 42; i++) {
      const cell = document.createElement("div");
      let dayNum, dateKey, isCurrent;

      if (i < startDow) {
        dayNum  = daysInPrevMonth - startDow + 1 + i;
        dateKey = toDateKey(new Date(currentYear, currentMonth - 1, dayNum));
        isCurrent = false;
      } else if (i < startDow + daysInMonth) {
        dayNum  = i - startDow + 1;
        dateKey = toDateKey(new Date(currentYear, currentMonth, dayNum));
        isCurrent = true;
      } else {
        dayNum  = i - startDow - daysInMonth + 1;
        dateKey = toDateKey(new Date(currentYear, currentMonth + 1, dayNum));
        isCurrent = false;
      }

      cell.className   = "calendar-day";
      cell.textContent = dayNum;

      if (!isCurrent)              cell.classList.add("calendar-day--other-month");
      if (dateKey === todayKey && isCurrent) cell.classList.add("calendar-day--today");
      if (dateKey === activeDate)  cell.classList.add("calendar-day--active");

      /* Дата с публикациями */
      if (articlesByDate[dateKey] && articlesByDate[dateKey].length > 0) {
        cell.classList.add("calendar-day--has-posts");
        cell.setAttribute("role",       "button");
        cell.setAttribute("tabindex",   "0");
        cell.setAttribute("aria-label", `${dayNum} — ${articlesByDate[dateKey].length} публикаций. Открыть.`);

        /* Точка-индикатор */
        const dot = document.createElement("span");
        dot.className = "calendar-day__dot";
        dot.setAttribute("aria-hidden", "true");
        cell.appendChild(dot);

        cell.dataset.calDate = dateKey;
      }

      elGrid.appendChild(cell);
    }

    /* Убрать пустую последнюю строку */
    trimLastRow();

    /* Обновить пульс-точку на FAB */
    updateFabDot();
  }

  /* ----------------------------------------------------------
     Убрать последнюю строку, если она вся из чужих дней
  ---------------------------------------------------------- */
  function trimLastRow() {
    const cells = Array.from(elGrid.querySelectorAll(".calendar-day"));
    if (cells.length < 35) return;
    const last7 = cells.slice(-7);
    if (last7.every(function (c) { return c.classList.contains("calendar-day--other-month"); })) {
      last7.forEach(function (c) { c.style.display = "none"; });
    }
  }

  /* ----------------------------------------------------------
     Обновить пульс-точку FAB: видима, если в текущем месяце
     есть хотя бы один день с публикациями
  ---------------------------------------------------------- */
  function updateFabDot() {
    if (!elFab) return;
    const prefix = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
    const hasThisMonth = Object.keys(articlesByDate).some(function (k) {
      return k.startsWith(prefix);
    });

    let dot = elFab.querySelector(".calendar-fab__dot");
    if (hasThisMonth && !dot) {
      dot = document.createElement("span");
      dot.className = "calendar-fab__dot";
      dot.setAttribute("aria-hidden", "true");
      elFab.appendChild(dot);
    } else if (!hasThisMonth && dot) {
      dot.remove();
    }
  }

  /* ----------------------------------------------------------
     ПАНЕЛЬ: открыть / закрыть
  ---------------------------------------------------------- */
  function openPanel() {
    if (!elPanel || !elFab) return;
    panelIsOpen = true;
    elPanel.classList.add("is-open");
    elPanel.setAttribute("aria-hidden", "false");
    elFab.classList.add("is-open");
    elFab.setAttribute("aria-expanded", "true");
  }

  function closePanel() {
    if (!elPanel || !elFab) return;
    panelIsOpen = false;
    elPanel.classList.remove("is-open");
    elPanel.setAttribute("aria-hidden", "true");
    elFab.classList.remove("is-open");
    elFab.setAttribute("aria-expanded", "false");
  }

  function togglePanel() {
    panelIsOpen ? closePanel() : openPanel();
  }

  /* ----------------------------------------------------------
     POPUP: открыть
  ---------------------------------------------------------- */
  function openPopup(dateKey) {
    activeDate = dateKey;
    renderCalendar();

    const articles = articlesByDate[dateKey] || [];
    if (!articles.length || !elPopup || !elPopupContent) return;

    const headerHTML = `
      <div class="calendar-popup__header">
        <div class="calendar-popup__eyebrow">Публикации блога</div>
        <h2 class="calendar-popup__title">${formatDateRu(dateKey)}</h2>
      </div>
    `;

    const listHTML = articles.map(function (a) {
      const slug = a.slug || a.id || "";
      const href = slug ? `/blog/${slug}` : "#";
      const img  = a.image || "";
      const alt  = a.imageAlt || a.title || "";
      return `
        <article class="calendar-popup__article">
          ${img ? `<img class="calendar-popup__thumb" src="${img}" alt="${alt}" loading="lazy">` : ""}
          <div class="calendar-popup__info">
            ${a.category ? `<span class="calendar-popup__category">${a.category}</span>` : ""}
            <h3 class="calendar-popup__article-title">${a.title || "Без названия"}</h3>
            <span class="calendar-popup__date">${formatDateRu(dateKey)}</span>
            <a href="${href}" class="calendar-popup__link" aria-label="Читать «${a.title || ""}»">
              Читать статью ${ICON_ARROW_LINK}
            </a>
          </div>
        </article>
      `;
    }).join("");

    elPopupContent.innerHTML = `
      <button class="calendar-popup__close" aria-label="Закрыть" data-cs-close>&times;</button>
      ${headerHTML}
      <div class="calendar-popup__list">${listHTML}</div>
    `;

    elPopup.classList.remove("is-hidden");
    elPopup.setAttribute("aria-hidden", "false");
    elPopupContent.focus({ preventScroll: true });

    const closeBtn = elPopupContent.querySelector("[data-cs-close]");
    if (closeBtn) closeBtn.addEventListener("click", closePopup);
  }

  /* ----------------------------------------------------------
     POPUP: закрыть
  ---------------------------------------------------------- */
  function closePopup() {
    if (!elPopup) return;
    elPopup.classList.add("is-hidden");
    elPopup.setAttribute("aria-hidden", "true");
    activeDate = null;
    renderCalendar();
  }

  /* ----------------------------------------------------------
     ИНИЦИАЛИЗАЦИЯ
  ---------------------------------------------------------- */
  function init() {
    elSidebar      = document.querySelector(".blog-calendar-sidebar");
    if (!elSidebar) return;

    elFab          = elSidebar.querySelector(".calendar-fab");
    elPanel        = elSidebar.querySelector(".calendar-panel");
    elTitle        = elSidebar.querySelector(".calendar-title");
    elGrid         = elSidebar.querySelector(".calendar-grid");
    elPopup        = document.querySelector(".calendar-popup");
    elPopupContent = elPopup ? elPopup.querySelector(".calendar-popup__content") : null;

    if (!elTitle || !elGrid) {
      console.warn("[CalendarSidebar] Не найдены элементы .calendar-title или .calendar-grid");
      return;
    }

    /* Event delegation на сетку вместо обработчиков на каждую ячейку.
       dateKey хранится в data-cal-date кликнутой ячейки. */
    elGrid.addEventListener("click", function (e) {
      const cell = e.target.closest("[data-cal-date]");
      if (cell) openPopup(cell.dataset.calDate);
    });
    elGrid.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      const cell = e.target.closest("[data-cal-date]");
      if (cell) { e.preventDefault(); openPopup(cell.dataset.calDate); }
    });

    /* SVG в кнопках навигации */
    const prevBtn = elSidebar.querySelector(".calendar-prev");
    const nextBtn = elSidebar.querySelector(".calendar-next");
    if (prevBtn) prevBtn.innerHTML = ICON_ARROW_LEFT;
    if (nextBtn) nextBtn.innerHTML = ICON_ARROW_RIGHT;

    /* Дни недели */
    const weekdaysEl = elSidebar.querySelector(".calendar-weekdays");
    if (weekdaysEl) {
      weekdaysEl.innerHTML = WEEKDAYS_RU.map(function (d) {
        return `<span class="calendar-weekday">${d}</span>`;
      }).join("");
    }

    /* Текущий месяц */
    const now = new Date();
    currentYear  = now.getFullYear();
    currentMonth = now.getMonth();

    /* Навигация по месяцам */
    if (prevBtn) prevBtn.addEventListener("click", function () {
      if (--currentMonth < 0) { currentMonth = 11; currentYear--; }
      renderCalendar();
    });
    if (nextBtn) nextBtn.addEventListener("click", function () {
      if (++currentMonth > 11) { currentMonth = 0; currentYear++; }
      renderCalendar();
    });

    /* FAB: открыть/закрыть панель */
    if (elFab) {
      elFab.addEventListener("click", function (e) {
        e.stopPropagation();
        togglePanel();
      });
    }

    /* Клик вне панели и FAB → закрыть панель (только на десктопе)
       На мобильном аккордеон закрывается только кнопкой или Esc */
    document.addEventListener("click", function (e) {
      if (panelIsOpen && !elSidebar.contains(e.target)) {
        var isMobile = window.innerWidth <= 768;
        if (!isMobile) closePanel();
      }
    });

    /* Закрытие popup по Esc */
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if (!elPopup.classList.contains("is-hidden")) {
          closePopup();
        } else {
          closePanel();
        }
      }
    });

    /* Клик вне popup → закрыть popup */
    if (elPopup) {
      elPopup.addEventListener("click", function (e) {
        if (e.target === elPopup) closePopup();
      });
    }

    /* Загрузить статьи и отрисовать */
    loadArticles(function (articles) {
      articlesByDate = groupArticlesByDate(articles);
      renderCalendar();
    });
  }

  /* ----------------------------------------------------------
     СТАРТ
  ---------------------------------------------------------- */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
