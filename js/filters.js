"use strict";

/* =========================================================
   GLOBAL STATE
========================================================= */
let allObjects = [];
let priceCache = new Map(); // Кэш цен объектов

/* =========================================================
   LOAD MORE STATE
========================================================= */
const OBJECTS_STEP = 6;
let visibleCount = OBJECTS_STEP;
let lastRenderedList = [];
let isAppendMode = false;

const loadMoreBtn = document.getElementById("loadMoreBtn");
let loadMoreAppearedOnce = false;

/* =========================================================
   DOM ELEMENTS
========================================================= */
const sortSelect = document.getElementById("sortSelect");
const typeSelect = document.getElementById("typeSelect");
const roomsSelect = document.getElementById("roomsSelect");
const priceFromInput = document.getElementById("priceFrom");
const priceToInput = document.getElementById("priceTo");
const locationSelect = document.getElementById("locationSelect");
const objectsList = document.getElementById("objectsList");
const resetBtn = document.getElementById("resetFilters");
const VIEW_STORAGE_KEY = "objectsViewMode";
const FAVORITES_VIEW_KEY = "favoritesViewMode";
const COMPARE_STORAGE_KEY = "compareItems";

/* =========================================================
   CACHED DOM ELEMENTS
========================================================= */
let cachedViewButtons = null;
let favoriteCounter = null;
const COMPARE_MAX_ITEMS = 3;
const COMPARE_MIN_ITEMS = 2;


/* =========================================================
   HELPERS
========================================================= */
function formatPrice(v) {
  return v ? Number(v).toLocaleString("ru-RU") : "";
}

function getObjectPriceByn(obj) {
  // Проверяем кэш
  if (priceCache.has(obj.slug)) {
    return priceCache.get(obj.slug);
  }

  let price = 0;

  if (typeof window.RealterPrice?.getLiveBynPriceSync === "function") {
    const livePrice = window.RealterPrice.getLiveBynPriceSync(obj);
    if (typeof livePrice === "number" && livePrice > 0) {
      price = livePrice;
    }
  }

  if (price <= 0 && typeof obj?.priceBYN === "number" && obj.priceBYN > 0) {
    price = obj.priceBYN;
  }

  // Сохраняем в кэш
  priceCache.set(obj.slug, price);
  return price;
}

function parsePrice(v) {
  return v ? Number(String(v).replace(/\s/g, "")) : 0;
}

function debounce(fn, delay = 400) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

function getPreviewImage(obj) {
  if (!obj?.id) {
    return "/images/objects/placeholder.webp";
  }

  const imageNumber = obj.id.replace("obj-", "");

  return `/images/objects/pic${imageNumber}.webp`;
}

/* =========================================================
   FAVORITES (с оптимизацией кэша)
========================================================= */
const FAVORITES_KEY = "favoriteObjects";
let favoritesCache = null; // Кэш Set для быстрого поиска O(1)

function getFavoritesSet() {
  if (favoritesCache === null) {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      favoritesCache = new Set(raw ? JSON.parse(raw) : []);
    } catch {
      favoritesCache = new Set();
    }
  }
  return favoritesCache;
}

function clearFavoritesCache() {
  favoritesCache = null; // Сбрасываем кэш
}

function getFavorites() {
  return Array.from(getFavoritesSet());
}

function isFavorite(slug) {
  return getFavoritesSet().has(slug);
}

function toggleFavorite(slug) {
  const favSet = getFavoritesSet();
  
  if (favSet.has(slug)) {
    favSet.delete(slug);
  } else {
    favSet.add(slug);
  }

  localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favSet)));
}

function isFavoritesMode() {
  return localStorage.getItem(FAVORITES_VIEW_KEY) === "on";
}

function setFavoritesMode(state) {
  localStorage.setItem(FAVORITES_VIEW_KEY, state ? "on" : "off");
}
/* =========================================================
   SAFE AREA PARSER
========================================================= */
function getObjectArea(obj) {
  const raw = obj.area ?? obj.areaTotal ?? obj.totalArea ?? obj.square ?? null;

  if (!raw) return null;

  const area = Number(
    String(raw)
      .replace(",", ".")
      .replace(/[^\d.]/g, ""),
  );

  return area > 0 ? area : null;
}

/* =========================================================
   INIT
========================================================= */
const debouncedApply = debounce(applyFiltersAndSort);

function enforceListingSeoForQueryParams() {
  const hasQueryParams = window.location.search.length > 1;
  if (!hasQueryParams) return;

  const baseListingUrl = `${window.location.origin}/nedvizhimost-lida`;

  let canonicalTag = document.querySelector('link[rel="canonical"]');
  if (!canonicalTag) {
    canonicalTag = document.createElement("link");
    canonicalTag.setAttribute("rel", "canonical");
    document.head.appendChild(canonicalTag);
  }
  canonicalTag.setAttribute("href", baseListingUrl);

  let robotsMeta = document.querySelector('meta[name="robots"]');
  if (!robotsMeta) {
    robotsMeta = document.createElement("meta");
    robotsMeta.setAttribute("name", "robots");
    document.head.appendChild(robotsMeta);
  }
  robotsMeta.setAttribute("content", "noindex, follow");
}

document.addEventListener("DOMContentLoaded", () => {
  enforceListingSeoForQueryParams();
  initCompareUI();

  fetch("/data/objects.json")
    .then((r) => r.json())
    .then(async (data) => {
      if (typeof window.RealterPrice?.enrichObjectsWithLivePrices === "function") {
        return window.RealterPrice.enrichObjectsWithLivePrices(data);
      }

      return data;
    })
    .then((data) => {
      allObjects = data;
      updateRoomsState();
      loadFiltersFromStorage();
      applyFiltersAndSort();
      renderComparePanel();
    });

  bindEvents();
  initViewSwitcher();
  initFavoritesCounter();

  if (isFavoritesMode()) {
    document
      .getElementById("favoritesFilterCounter")
      ?.classList.add("is-active");
  }
});
/* =========================================================
   EVENTS
========================================================= */
function bindEvents() {
  sortSelect.addEventListener("change", applyFiltersAndSort);

  typeSelect.addEventListener("change", () => {
    updateRoomsState();
    applyFiltersAndSort();
  });

  roomsSelect.addEventListener("change", applyFiltersAndSort);
  locationSelect.addEventListener("change", applyFiltersAndSort);

  priceFromInput.addEventListener("input", handlePriceInput);
  priceToInput.addEventListener("input", handlePriceInput);

  if (resetBtn) {
    resetBtn.addEventListener("click", resetFilters);
  }
}

/* =========================================================
   RESET FILTERS
========================================================= */
function resetFilters() {
  sortSelect.value = "recommended";
  typeSelect.value = "all";
  roomsSelect.value = "all";
  roomsSelect.disabled = true;
  priceFromInput.value = "";
  priceToInput.value = "";
  locationSelect.value = "all";

  localStorage.removeItem(FILTERS_STORAGE_KEY);
  applyFiltersAndSort();
}

/* =========================================================
   ROOMS STATE
========================================================= */
function updateRoomsState() {
  const isFlat = typeSelect.value === "Квартира";
  roomsSelect.disabled = !isFlat;
  if (!isFlat) roomsSelect.value = "all";
}

/* =========================================================
   PRICE INPUTS
========================================================= */
function handlePriceInput() {
  let from = parsePrice(priceFromInput.value);
  let to = parsePrice(priceToInput.value);

  if (from && to && from > to) to = from;

  priceFromInput.value = formatPrice(from);
  priceToInput.value = formatPrice(to);

  debouncedApply();
}

/* =========================================================
   FILTER + SORT (оптимизированная версия)
========================================================= */
function applyFiltersAndSort() {
  // Подготовка фильтров
  const favs = isFavoritesMode() ? getFavoritesSet() : null;
  const typeValue = typeSelect.value;
  const roomValue = roomsSelect.value;
  const locationValue = locationSelect.value;
  const priceFrom = parsePrice(priceFromInput.value);
  const priceTo = parsePrice(priceToInput.value);
  const isFlat = typeValue === "Квартира";

  // ЕДИНЫЙ ЦИКЛ ФИЛЬТРАЦИИ (вместо 5 отдельных)
  let result = allObjects.filter((obj) => {
    // Скрытые объекты
    if (shouldHideSold(obj, 7)) return false;

    // Режим избранного
    if (favs && !favs.has(obj.slug)) return false;

    // Фильтр типа
    if (typeValue !== "all" && obj.type !== typeValue) return false;

    // Фильтр комнат (только для квартир)
    if (isFlat && roomValue !== "all") {
      const objRooms = Number(obj.rooms);
      if (roomValue === "4") {
        if (objRooms < 4) return false;
      } else if (objRooms !== Number(roomValue)) {
        return false;
      }
    }

    // Фильтр цены
    const objPrice = getObjectPriceByn(obj);
    if (priceFrom && objPrice < priceFrom) return false;
    if (priceTo && objPrice > priceTo) return false;

    // Фильтр локации
    if (locationValue !== "all") {
      if (locationValue === "lida" && obj.city !== "Лида") return false;
      if (locationValue === "district" && obj.city !== "Лидский район") return false;
      if (locationValue === "other" && (obj.city === "Лида" || obj.city === "Лидский район")) return false;
    }

    return true;
  });

  /* =========================================
     SORTING (с кэшированными ценами)
  ========================================= */
  const sortValue = sortSelect.value;
  
  switch (sortValue) {
    case "cheap":
      result.sort((a, b) => getObjectPriceByn(a) - getObjectPriceByn(b));
      break;

    case "expensive":
      result.sort((a, b) => getObjectPriceByn(b) - getObjectPriceByn(a));
      break;

    case "new":
      result.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
      break;

    case "pricePerMeter":
      result.sort((a, b) => {
        const aArea = getObjectArea(a);
        const bArea = getObjectArea(b);

        if (!aArea) return 1;
        if (!bArea) return -1;

        return getObjectPriceByn(a) / aArea - getObjectPriceByn(b) / bArea;
      });
      break;

    default:
      result.sort((a, b) => (b.recommended || 0) - (a.recommended || 0));
  }

  /* =========================================
     COUNTER
  ========================================= */
  updateObjectsCounter(result.length);

  /* =========================================
     LOAD MORE RESET
  ========================================= */
  isAppendMode = false;
  visibleCount = OBJECTS_STEP;
  lastRenderedList = result;

  /* =========================================
     RENDER
  ========================================= */
  renderObjects(result);

  /* =========================================
     UI STATE
  ========================================= */
  updateActiveFilters();
  saveFiltersToStorage();
}

/* =========================================================
   NO-RESULTS LEAD CAPTURE
========================================================= */
function buildFiltersDescription() {
  const parts = [];
  if (typeSelect.value !== "all") parts.push(typeSelect.value);
  if (roomsSelect.value !== "all") {
    parts.push(roomsSelect.value === "4" ? "4+ комнаты" : roomsSelect.value + "-комн.");
  }
  const from = parsePrice(priceFromInput.value);
  const to   = parsePrice(priceToInput.value);
  if (from || to) {
    const p = [
      from ? "от " + from.toLocaleString("ru") + " р." : "",
      to   ? "до " + to.toLocaleString("ru")   + " р." : "",
    ].filter(Boolean).join(" ");
    parts.push(p);
  }
  if (locationSelect.value !== "all") {
    const loc = { lida: "Лида", district: "Лидский район", other: "Другой город" };
    parts.push(loc[locationSelect.value] || locationSelect.value);
  }
  return parts.length ? parts.join(", ") : "без фильтров";
}

function buildNoResultsLead() {
  return `<li class="no-results-lead-wrap">
    <div class="no-results-lead">
      <div class="no-results-lead__body">
        <div class="no-results-lead__icon">
          <i class="fa-solid fa-house-circle-xmark"></i>
        </div>
        <div class="no-results-lead__copy">
          <h3 class="no-results-lead__title">Пока нет подходящих вариантов</h3>
          <p class="no-results-lead__text">
            Оставьте контакт — я свяжусь, как только появится подходящий объект
          </p>
        </div>
      </div>
      <div class="no-results-lead__right">
        <form class="no-results-lead__form" id="noResultsLeadForm" novalidate>
          <div class="no-results-lead__field-wrap">
            <input
              type="text"
              id="noResultsContact"
              class="no-results-lead__input"
              placeholder="Telegram @username или телефон"
              autocomplete="off"
              maxlength="80"
            />
            <button type="submit" class="no-results-lead__btn">Отправить</button>
          </div>
          <p class="no-results-lead__error" id="noResultsError" hidden>
            Пожалуйста, введите Telegram-аккаунт или номер телефона
          </p>
        </form>
        <div class="no-results-lead__success" id="noResultsSuccess" hidden>
          <i class="fa-solid fa-circle-check"></i>
          Спасибо! Я свяжусь с вами, как только появится подходящий вариант.
        </div>
      </div>
    </div>
  </li>`;
}

function initNoResultsLead() {
  const form = document.getElementById("noResultsLeadForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input     = document.getElementById("noResultsContact");
    const errorEl   = document.getElementById("noResultsError");
    const successEl = document.getElementById("noResultsSuccess");
    const contact   = input.value.trim();

    if (contact.length < 5) {
      errorEl.hidden = false;
      input.focus();
      return;
    }
    errorEl.hidden = true;

    const btn = form.querySelector(".no-results-lead__btn");
    btn.disabled    = true;
    btn.textContent = "Отправляем...";

    try {
      const res = await fetch("/api/lead-no-result.php", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ contact, filters: buildFiltersDescription() }),
      });

      if (res.ok) {
        form.hidden       = true;
        successEl.hidden  = false;
      } else {
        btn.disabled          = false;
        btn.textContent       = "Отправить";
        errorEl.textContent   = "Ошибка отправки. Попробуйте ещё раз.";
        errorEl.hidden        = false;
      }
    } catch {
      btn.disabled        = false;
      btn.textContent     = "Отправить";
      errorEl.textContent = "Ошибка сети. Попробуйте ещё раз.";
      errorEl.hidden      = false;
    }
  });
}

/* =========================================================
   RENDER (оптимизированная версия)
========================================================= */
function renderObjects(list) {
  /* =========================================
     EMPTY STATE
  ========================================= */
  if (!list.length) {
    objectsList.innerHTML = buildNoResultsLead();
    updateShownCounter(0, 0);
    toggleLoadMore(false);
    initNoResultsLead();
    return;
  }

  /* =========================================
     CLEAR ONLY ON NEW SEARCH
  ========================================= */
  if (!isAppendMode) {
    objectsList.innerHTML = "";
  }

  /* =========================================
     CALCULATE RANGE
  ========================================= */
  const alreadyRendered = objectsList.children.length;
  const nextItems = list.slice(alreadyRendered, visibleCount);

  // Создаём DocumentFragment для batch-вставки (быстрее, чем append в цикле)
  const fragment = document.createDocumentFragment();

  /* =========================================
     APPEND NEW ITEMS ONLY
  ========================================= */
  nextItems.forEach((obj) => {
    const li = document.createElement("li");
    li.className = "object-item";

    const imgSrc = getPreviewImage(obj);

    const area = getObjectArea(obj);
    const objectPrice = getObjectPriceByn(obj);
    const pricePerMeter = area && objectPrice > 0 ? Math.round(objectPrice / area) : null;
    const contractNumber = obj.contractNumber || null;
    const badgesHTML = renderBadges(obj);

    li.innerHTML = `
      <div class="project-mas hover-shadow">

        <a
          href="/objects/${obj.slug}"
          class="card-link-overlay"
          aria-label="Открыть объект ${obj.title}"
        ></a>

        <div class="image-effect-one">

          <div
            class="favorite-btn ${isFavorite(obj.slug) ? "is-active" : ""}"
            data-slug="${obj.slug}"
            aria-label="${
              isFavorite(obj.slug)
                ? "Убрать из избранного"
                : "Добавить в избранное"
            }"
            data-tooltip="${
              isFavorite(obj.slug)
                ? "Убрать из избранного"
                : "Добавить в избранное"
            }"
          >
            <i class="fa-${
              isFavorite(obj.slug) ? "solid" : "regular"
            } fa-heart"></i>
          </div>

          <button
            type="button"
            class="compare-btn ${isInCompare(obj.slug) ? "is-active" : ""}"
            data-slug="${obj.slug}"
            aria-label="${isInCompare(obj.slug) ? "Удалить из сравнения" : "Добавить в сравнение"}"
            data-tooltip="${isInCompare(obj.slug) ? "Удалить из сравнения" : "Добавить в сравнение"}"
          >
            <i class="fa-solid fa-scale-balanced" aria-hidden="true"></i>
          </button>

          ${badgesHTML}

          <img loading="lazy" src="${imgSrc}" alt="${obj.title}">
        </div>

        <div class="project-info p-a20 bg-gray">
          <h4 class="sx-tilte m-t0">
            <a href="/objects/${obj.slug}">
              ${obj.title}
            </a>
          </h4>

          ${obj.cardDescription ? `<p>${obj.cardDescription}</p>` : ""}

          <div class="object-meta">
            <span class="object-price">
              ${formatPrice(objectPrice)} BYN
            </span>

            ${
              pricePerMeter
                ? `<span>${formatPrice(pricePerMeter)} BYN / м²</span>`
                : ""
            }

            ${
              contractNumber
                ? `<span class="object-contract">${contractNumber}</span>`
                : ""
            }
          </div>

          <a href="/objects/${obj.slug}">
            <i class="link-plus bg-primary"></i>
          </a>
        </div>
      </div>
    `;

    fragment.appendChild(li);
  });

  // Batch-вставка всех элементов за раз
  objectsList.appendChild(fragment);

  // Двойной rAF: первый кадр — браузер фиксирует новые элементы в дереве,
  // второй — применяем is-visible, чтобы CSS-переход сработал без forced layout
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      nextItems.forEach((obj) => {
        const li = objectsList.querySelector(`[data-slug="${obj.slug}"]`)?.closest(".object-item");
        if (li) {
          li.classList.add("is-visible");
        }
      });
    });
  });

  /* =========================================
     COUNTERS & LOAD MORE STATE
  ========================================= */
  updateShownCounter(Math.min(visibleCount, list.length), list.length);

  toggleLoadMore(visibleCount < list.length);
}

function toggleLoadMore(canLoadMore, isLoading = false) {
  if (!loadMoreBtn) return;

  if (!loadMoreAppearedOnce && canLoadMore) {
    loadMoreBtn.classList.add("is-appear");
    loadMoreAppearedOnce = true;

    loadMoreBtn.addEventListener(
      "animationend",
      () => loadMoreBtn.classList.remove("is-appear"),
      { once: true },
    );
  }

  const total = lastRenderedList.length;
  const shown = Math.min(visibleCount, total);

  if (!canLoadMore) {
    loadMoreBtn.innerHTML = `
      <span class="load-more-done">✓ Все объекты загружены</span>
      <span class="load-more-counter">
        · Показано ${shown} из ${total}
      </span>
    `;
    loadMoreBtn.disabled = true;
    loadMoreBtn.classList.add("is-complete");
    loadMoreBtn.classList.remove("is-loading");
    return;
  }

  loadMoreBtn.innerHTML = `
    <span class="load-more-spinner ${isLoading ? "is-visible" : ""}"></span>
    <span class="load-more-text">Показать ещё</span>
    <span class="load-more-counter">
      · Показано ${shown} из ${total}
    </span>
  `;

  loadMoreBtn.disabled = false;
  loadMoreBtn.classList.remove("is-complete");
  loadMoreBtn.classList.toggle("is-loading", isLoading);
}

function renderBadges(obj) {
  let html = "";

  if (obj.recommended === true) {
    html += `<span class="badge badge-featured">Рекомендуемый</span>`;
  }

  if (isNewObject(obj)) {
    html += `<span class="badge badge-new">Новинка</span>`;
  }

  if (isSold(obj)) {
    html += `<span class="badge badge-sold">Продана</span>`;
  }

  if (!html) return "";

  return `<div class="object-badges">${html}</div>`;
}

function isNewObject(obj, days = 7) {
  if (!obj.publishedAt) return false;

  const now = new Date();
  const published = new Date(obj.publishedAt);

  return (now - published) / 86400000 <= days;
}

/* =========================================================
   Избранное (оптимизировано с делегацией событий)
========================================================= */
if (objectsList) {
  objectsList.addEventListener("click", (e) => {
    const compareBtn = e.target.closest(".compare-btn");
    if (compareBtn) {
      e.preventDefault();
      e.stopPropagation();
      toggleCompare(compareBtn.dataset.slug);
      return;
    }

    const btn = e.target.closest(".favorite-btn");
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    const slug = btn.dataset.slug;
    toggleFavorite(slug);

    btn.classList.toggle("is-active");
    btn.setAttribute(
      "aria-label",
      btn.classList.contains("is-active")
        ? "Убрать из избранного"
        : "Добавить в избранное",
    );
    btn.dataset.tooltip = btn.classList.contains("is-active")
      ? "Убрать из избранного"
      : "Добавить в избранное";
    
    const icon = btn.querySelector("i");
    if (icon) {
      icon.classList.toggle("fa-solid");
      icon.classList.toggle("fa-regular");
    }
    
    // Пульс анимация
    btn.classList.remove("is-pulse");
    void btn.offsetWidth; // reflow
    btn.classList.add("is-pulse");
    updateFavoritesFilterCounter(true);
    renderComparePanel();
  });
}

// Инициализируем кэш элемента при загрузке
function getCachedFavoritesCounter() {
  if (!favoriteCounter) {
    favoriteCounter = document.getElementById("favoritesFilterCounter");
  }
  return favoriteCounter;
}

function updateFavoritesFilterCounter(pulse = false) {
  const el = getCachedFavoritesCounter();
  if (!el) return;

  const countEl = el.querySelector(".count");
  if (!countEl) return;

  const favCount = getFavoritesSet().size;
  countEl.textContent = favCount;
  el.classList.toggle("is-empty", favCount === 0);

  if (pulse) {
    el.classList.remove("is-pulse");
    void el.offsetWidth; // reflow
    el.classList.add("is-pulse");
  }
}

// Инициализация слушателя избранного - ВНУТРИ DOMContentLoaded
function initFavoritesCounter() {
  const fc = getCachedFavoritesCounter();
  if (!fc) return;

  fc.addEventListener("click", () => {
    const isActive = isFavoritesMode();

    setFavoritesMode(!isActive);
    applyFiltersAndSort();
    updateFavoritesFilterCounter();

    fc.classList.toggle("is-active", !isActive);
  });

  // Обновляем счетчик при инициализации
  updateFavoritesFilterCounter();
  renderComparePanel();
}

/* =========================================================
   COMPARE PANEL + TABLE
========================================================= */
let compareBarEl = null;
let compareItemsEl = null;
let compareActionBtn = null;
let compareClearBtn = null;
let compareModalEl = null;
let compareTableWrapEl = null;
let compareNoticeEl = null;

function initCompareUI() {
  if (compareBarEl) return;

  compareBarEl = document.createElement("aside");
  compareBarEl.className = "compare-bar";
  compareBarEl.setAttribute("aria-live", "polite");
  compareBarEl.innerHTML = `
    <div class="compare-bar__items" id="compareItems"></div>
    <div class="compare-bar__controls">
      <button type="button" class="compare-bar__action" id="compareActionBtn" disabled>
        Сравнить
      </button>
      <button
        type="button"
        class="compare-bar__clear"
        id="compareClearBtn"
        aria-label="Закрыть панель сравнения и очистить список"
      >
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
  `;
  document.body.appendChild(compareBarEl);

  compareItemsEl = compareBarEl.querySelector("#compareItems");
  compareActionBtn = compareBarEl.querySelector("#compareActionBtn");
  compareClearBtn = compareBarEl.querySelector("#compareClearBtn");

  compareModalEl = document.createElement("div");
  compareModalEl.className = "compare-modal";
  compareModalEl.hidden = true;
  compareModalEl.innerHTML = `
    <div class="compare-modal__backdrop" data-close-compare="true"></div>
    <div class="compare-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="compareModalTitle">
      <button type="button" class="compare-modal__close" data-close-compare="true" aria-label="Закрыть сравнение">
        <span aria-hidden="true">&times;</span>
      </button>
      <h3 id="compareModalTitle">Сравнение объектов</h3>
      <div class="compare-modal__table-wrap" id="compareTableWrap"></div>
    </div>
  `;
  document.body.appendChild(compareModalEl);

  compareTableWrapEl = compareModalEl.querySelector("#compareTableWrap");
  compareNoticeEl = document.createElement("div");
  compareNoticeEl.className = "compare-notice";
  compareNoticeEl.setAttribute("role", "status");
  compareNoticeEl.setAttribute("aria-live", "polite");
  document.body.appendChild(compareNoticeEl);

  compareActionBtn?.addEventListener("click", openCompareModal);
  compareClearBtn?.addEventListener("click", clearCompare);
  compareModalEl.addEventListener("click", (event) => {
    if (event.target.closest("[data-close-compare='true']")) {
      closeCompareModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && compareModalEl && !compareModalEl.hidden) {
      closeCompareModal();
    }
  });

  renderComparePanel();
}

function getCompareItems() {
  try {
    const raw = JSON.parse(localStorage.getItem(COMPARE_STORAGE_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.filter((item) => typeof item === "string");
  } catch {
    return [];
  }
}

function saveCompareItems(items) {
  localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(items));
}

function getCompareObjects() {
  const compareSlugs = getCompareItems();
  if (!compareSlugs.length || !allObjects.length) return [];

  return compareSlugs
    .map((slug) => allObjects.find((obj) => obj.slug === slug))
    .filter(Boolean);
}

function isInCompare(slug) {
  return getCompareItems().includes(slug);
}

function addToCompare(id) {
  const compareItems = getCompareItems();
  if (compareItems.includes(id)) return true;

  if (compareItems.length >= COMPARE_MAX_ITEMS) {
    showCompareNotice(`Можно сравнить не более ${COMPARE_MAX_ITEMS} объектов`);
    return false;
  }

  compareItems.push(id);
  saveCompareItems(compareItems);
  renderComparePanel();
  return true;
}

function removeFromCompare(id) {
  const compareItems = getCompareItems().filter((item) => item !== id);
  saveCompareItems(compareItems);
  renderComparePanel();
}

function toggleCompare(id) {
  if (isInCompare(id)) {
    removeFromCompare(id);
    return;
  }

  addToCompare(id);
}

function clearCompare() {
  saveCompareItems([]);
  closeCompareModal();
  renderComparePanel();
}

function showCompareNotice(message) {
  if (!compareNoticeEl) return;

  compareNoticeEl.textContent = message;
  compareNoticeEl.classList.remove("is-visible");
  void compareNoticeEl.offsetWidth;
  compareNoticeEl.classList.add("is-visible");

  clearTimeout(showCompareNotice.timerId);
  showCompareNotice.timerId = setTimeout(() => {
    compareNoticeEl?.classList.remove("is-visible");
  }, 2300);
}

function getConditionLabel(obj) {
  if (obj?.condition) return String(obj.condition);

  const sources = [
    obj?.saleTerms,
    obj?.description,
    ...(Array.isArray(obj?.features) ? obj.features : []),
  ]
    .filter(Boolean)
    .map((item) => String(item).toLowerCase());

  const text = sources.join(" ");
  if (!text) return "—";
  if (text.includes("евроремонт")) return "Евроремонт";
  if (text.includes("под ремонт")) return "Под ремонт";
  if (text.includes("косметичес")) return "Косметический ремонт";
  if (text.includes("хорош")) return "Хорошее";
  if (text.includes("жил")) return "Жилое";
  return "—";
}

function getComparableFields(obj) {
  const area = getObjectArea(obj);
  const objectPrice = getObjectPriceByn(obj);
  const pricePerMeter = area && objectPrice > 0 ? Math.round(objectPrice / area) : null;
  const rooms = Number(obj?.rooms);

  return {
    type: obj?.type || "—",
    rooms: Number.isFinite(rooms) && rooms > 0 ? String(rooms) : "—",
    area: area ? `${formatPrice(area)} м²` : "—",
    areaLiving: obj?.areaLiving ? `${formatPrice(obj.areaLiving)} м²` : "—",
    areaKitchen: obj?.areaKitchen ? `${formatPrice(obj.areaKitchen)} м²` : "—",
    areaPlot: obj?.areaPlot ? `${formatPrice(obj.areaPlot)} сот.` : "—",
    floor:
      obj?.floor && obj?.floorsTotal
        ? `${obj.floor}/${obj.floorsTotal}`
        : obj?.floor
          ? String(obj.floor)
          : "—",
    floorsTotal: obj?.floorsTotal ? String(obj.floorsTotal) : "—",
    pricePerMeter: pricePerMeter ? `${formatPrice(pricePerMeter)} BYN` : "—",
    price: objectPrice > 0 ? `${formatPrice(objectPrice)} BYN` : "—",
    district: obj?.district || obj?.city || "—",
    address: obj?.address || "—",
    yearBuilt: obj?.yearBuilt ? String(obj.yearBuilt) : "—",
    condition: getConditionLabel(obj),
    houseMaterial: obj?.houseMaterial || "—",
    heating: obj?.heating || "—",
    gas: obj?.gas || "—",
    water: obj?.water || "—",
    sewerage: obj?.sewerage || "—",
    electricity: obj?.electricity || "—",
  };
}

function renderComparePanel() {
  if (!compareBarEl || !compareItemsEl || !compareActionBtn) return;

  const compareObjects = getCompareObjects();
  const count = compareObjects.length;

  compareBarEl.classList.toggle("is-visible", count > 0);
  if (!count) {
    compareItemsEl.innerHTML = "";
    compareActionBtn.disabled = true;
    compareActionBtn.textContent = "Сравнить";
    syncCompareButtonsState();
    return;
  }

  compareItemsEl.innerHTML = compareObjects
    .map((obj) => {
      const imgSrc = getPreviewImage(obj);
      return `
        <article class="compare-chip">
          <img src="${imgSrc}" alt="${obj.title}" loading="lazy" />
          <div class="compare-chip__meta">
            <strong>${formatPrice(getObjectPriceByn(obj))} BYN</strong>
          </div>
        </article>
      `;
    })
    .join("");

  compareActionBtn.disabled = count < COMPARE_MIN_ITEMS;
  compareActionBtn.textContent = `Сравнить (${count})`;
  syncCompareButtonsState();
}

function syncCompareButtonsState() {
  document.querySelectorAll(".compare-btn").forEach((btn) => {
    const isActive = isInCompare(btn.dataset.slug);
    btn.classList.toggle("is-active", isActive);
    const label = isActive ? "Удалить из сравнения" : "Добавить в сравнение";
    btn.setAttribute("aria-label", label);
    btn.dataset.tooltip = label;
  });
}

function openCompareModal() {
  const compareObjects = getCompareObjects();
  if (compareObjects.length < COMPARE_MIN_ITEMS || !compareTableWrapEl || !compareModalEl) {
    return;
  }

  const rows = [
    { key: "type", label: "Тип" },
    { key: "rooms", label: "Комнаты" },
    { key: "area", label: "Площадь" },
    { key: "areaLiving", label: "Жилая площадь" },
    { key: "areaKitchen", label: "Кухня" },
    { key: "areaPlot", label: "Участок" },
    { key: "floor", label: "Этаж" },
    { key: "floorsTotal", label: "Этажность дома" },
    { key: "price", label: "Цена" },
    { key: "pricePerMeter", label: "Цена за м²" },
    { key: "district", label: "Район" },
    { key: "address", label: "Адрес" },
    { key: "yearBuilt", label: "Год постройки" },
    { key: "condition", label: "Состояние" },
    { key: "houseMaterial", label: "Материал дома" },
    { key: "heating", label: "Отопление" },
    { key: "gas", label: "Газ" },
    { key: "water", label: "Вода" },
    { key: "sewerage", label: "Канализация" },
    { key: "electricity", label: "Электричество" },
  ];

  const valuesByObject = compareObjects.map((obj) => getComparableFields(obj));
  const visibleRows = rows.filter((row) => {
    const values = valuesByObject.map((item) => String(item[row.key] || "—").trim());
    return values.some((value) => value !== "—");
  });
  const isDifferent = (key) => {
    const normalized = valuesByObject.map((item) =>
      String(item[key] || "—").trim().toLowerCase(),
    );
    return new Set(normalized).size > 1;
  };

  const header = `
    <tr>
      <th>Параметр</th>
      ${compareObjects
        .map((obj) => `<th><a href="/objects/${obj.slug}">${obj.title}</a></th>`)
        .join("")}
    </tr>
  `;

  const body = visibleRows
    .map((row) => {
      const diff = isDifferent(row.key);
      const cells = valuesByObject
        .map((item) => `<td class="${diff ? "is-diff" : ""}">${item[row.key]}</td>`)
        .join("");
      return `<tr><th>${row.label}</th>${cells}</tr>`;
    })
    .join("");

  compareTableWrapEl.innerHTML = `
    <table class="compare-table">
      <thead>${header}</thead>
      <tbody>${body}</tbody>
    </table>
  `;

  compareModalEl.hidden = false;
  document.body.classList.add("compare-modal-open");
}

function closeCompareModal() {
  if (!compareModalEl) return;
  compareModalEl.hidden = true;
  document.body.classList.remove("compare-modal-open");
}

/* =========================================================
   Счетчик
========================================================= */
function pluralizeObject(count) {
  if (count % 10 === 1 && count % 100 !== 11) return "объект";
  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100))
    return "объекта";
  return "объектов";
}

function updateObjectsCounter(count) {
  const counter = document.getElementById("objectsCounter");
  const row = counter?.closest(".filters-reset-row");

  if (!counter || !row) return;

  const priceFrom = parsePrice(priceFromInput.value);
  const priceTo = parsePrice(priceToInput.value);

  // EMPTY STATE
  if (count === 0) {
    let hint = "";

    if (priceFrom > 0) {
      hint = `<span class="price-hint">
        Попробуйте снизить минимальную цену
      </span>`;
    }

    counter.innerHTML = `
      По заданным параметрам ничего не найдено
      ${hint}
    `;

    counter.classList.add("is-empty");
    row.classList.add("is-empty");
    return;
  }

  // NORMAL STATE
  counter.innerHTML = `
    Найдено <strong>${count}</strong> ${pluralizeObject(count)}
  `;

  counter.classList.remove("is-empty");
  row.classList.remove("is-empty");
}

function updateActiveFilters() {
  const fields = [
    sortSelect,
    typeSelect,
    roomsSelect,
    locationSelect,
    priceFromInput,
    priceToInput,
  ];

  fields.forEach((field) => {
    if (!field) return;

    const isActive =
      (field.tagName === "SELECT" && field.value !== "all") ||
      (field.tagName === "INPUT" && field.value.trim() !== "");

    field.classList.toggle("is-active", isActive);
  });
}

const FILTERS_STORAGE_KEY = "objectsFilters";

function saveFiltersToStorage() {
  const data = {
    sort: sortSelect.value,
    type: typeSelect.value,
    rooms: roomsSelect.value,
    priceFrom: priceFromInput.value,
    priceTo: priceToInput.value,
    location: locationSelect.value,
  };

  localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(data));
}

function loadFiltersFromStorage() {
  const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
  if (!raw) return;

  try {
    const data = JSON.parse(raw);

    sortSelect.value = data.sort ?? "recommended";
    typeSelect.value = data.type ?? "all";
    roomsSelect.value = data.rooms ?? "all";
    priceFromInput.value = data.priceFrom ?? "";
    priceToInput.value = data.priceTo ?? "";
    locationSelect.value = data.location ?? "all";

    updateRoomsState();
  } catch (e) {
    localStorage.removeItem(FILTERS_STORAGE_KEY);
  }
}

function initViewSwitcher() {
  cachedViewButtons = document.querySelectorAll(".view-btn");
  if (!cachedViewButtons.length) return;

  const savedView = localStorage.getItem(VIEW_STORAGE_KEY) || "grid";

  setViewMode(savedView);

  cachedViewButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;
      setViewMode(view);
      localStorage.setItem(VIEW_STORAGE_KEY, view);
    });
  });
}

function setViewMode(mode) {
  if (!objectsList) return;

  objectsList.classList.remove("view-grid", "view-compact");
  objectsList.classList.add(`view-${mode}`);

  // Используем кэшированные кнопки если доступны
  const buttons = cachedViewButtons || document.querySelectorAll(".view-btn");
  buttons.forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.view === mode);
  });
}

function updateShownCounter(shown, total) {
  const el = document.getElementById("objectsShownCounter");
  if (!el) return;

  el.textContent = `Показано ${shown} из ${total}`;
}

if (loadMoreBtn) {
  loadMoreBtn.addEventListener("click", () => {
    if (visibleCount >= lastRenderedList.length) return;

    isAppendMode = true;
    toggleLoadMore(true, true); // spinner ON

    requestAnimationFrame(() => {
      visibleCount += OBJECTS_STEP;
      renderObjects(lastRenderedList);
    });
  });
}

(function () {
  const wrap = document.querySelector(".objects-load-more-wrap");
  if (!wrap) return;

  let lastScrollY = window.scrollY;
  let ticking = false;

  function onScroll() {
    const currentY = window.scrollY;

    // только мобилки
    if (window.innerWidth > 768) return;

    if (currentY > lastScrollY + 10) {
      // скролл вниз → показываем кнопку
      wrap.classList.remove("is-hidden");
    } else if (currentY < lastScrollY - 10) {
      // скролл вверх → прячем кнопку
      wrap.classList.add("is-hidden");
    }

    lastScrollY = currentY;
    ticking = false;
  }

  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });
})();

function isSold(obj) {
  return obj?.status?.type === "sold";
}

function shouldHideSold(obj, days = 7) {
  if (!isSold(obj)) return false;
  if (!obj.status?.date) return false;

  const soldDate = new Date(obj.status.date);
  const now = new Date();

  const diffDays = (now - soldDate) / 86400000;
  return diffDays > days;
}
