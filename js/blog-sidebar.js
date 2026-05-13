"use strict";

/* ================================================================
   BLOG SIDEBAR — blog-sidebar.js
   Handles: loading, filtering, search, archive, load-more, URL sync
   ================================================================ */

const INITIAL_COUNT = 8;
const LOAD_MORE_COUNT = 6;

const CATEGORY_MAP = [
  { key: "all",         label: "Все статьи",           predicate: () => true },
  { key: "latest",      label: "Последние статьи",      predicate: null },
  { key: "legal",       label: "Юридические риски",     predicate: a => matchCategory(a, "юрид") || hasTag(a, "юридические риски") },
  { key: "sale",        label: "Покупка / продажа",     predicate: a => hasTag(a, "покупка квартиры") || hasTag(a, "продажа квартиры") },
  { key: "psychology",  label: "Психология",            predicate: a => matchCategory(a, "псих") },
  { key: "market",      label: "Рынок недвижимости",    predicate: a => matchCategory(a, "рынок") || hasTag(a, "рынок недвижимости") },
  { key: "inheritance", label: "Наследство",            predicate: a => matchCategory(a, "наслед") || hasTag(a, "наследство") },
  { key: "renovation",  label: "Перепланировка",        predicate: a => matchCategory(a, "перепланир") || hasTag(a, "перепланировка") },
];

const MONTH_NAMES_RU = [
  "Январь","Февраль","Март","Апрель","Май","Июнь",
  "Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"
];

let allArticles = [];
let filteredArticles = [];
let displayedCount = INITIAL_COUNT;

let activeCategory = null;
let activeSearch   = "";
let activeArchive  = null;
let activeTag      = null;

/* ================================================================
   BOOT
   ================================================================ */
document.addEventListener("DOMContentLoaded", () => {
  readUrlParams();
  renderSkeletons(INITIAL_COUNT);
  loadArticles();
});

/* ================================================================
   URL PARAMS
   ================================================================ */
function readUrlParams() {
  const p = new URLSearchParams(window.location.search);
  activeCategory = p.get("category") || null;
  activeSearch   = p.get("search")   || "";
  activeArchive  = p.get("archive")  || null;
  activeTag      = p.get("tag")      || null;

  if (activeTag) activeCategory = null;

  if (!activeCategory && !activeTag && !activeSearch && !activeArchive) {
    activeCategory = "latest";
  }
}

function syncUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("category");
  url.searchParams.delete("search");
  url.searchParams.delete("archive");
  url.searchParams.delete("tag");

  if (activeCategory && activeCategory !== "latest") url.searchParams.set("category", activeCategory);
  if (activeSearch)   url.searchParams.set("search",   activeSearch);
  if (activeArchive)  url.searchParams.set("archive",  activeArchive);
  if (activeTag)      url.searchParams.set("tag",      activeTag);

  window.history.replaceState({}, "", url.pathname + url.search + url.hash);
}

/* ================================================================
   LOAD JSON
   ================================================================ */
function loadArticles() {
  fetch("/data/blog-articles.json")
    .then(r => { if (!r.ok) throw new Error("JSON load error"); return r.json(); })
    .then(data => {
      allArticles = [...data].sort((a, b) => bsbParseDate(b.date) - bsbParseDate(a.date));
      fadeOutSkeletons(() => {
        renderSidebar();
        applyFilters({ skipAnimation: true });
        setupEvents();
      });
    })
    .catch(console.error);
}

/* ================================================================
   SKELETON
   ================================================================ */
function renderSkeletons(count) {
  const g = grid();
  if (!g) return;
  g.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const d = document.createElement("div");
    d.className = "blog-grid-item is-visible";
    d.innerHTML = `<div class="blog-post blog-card">
      <div class="skeleton skeleton-img"></div>
      <div class="sx-post-info p-t30">
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line short"></div>
        <div class="skeleton skeleton-line"></div>
      </div>
    </div>`;
    g.appendChild(d);
  }
}

function fadeOutSkeletons(cb) {
  const g = grid();
  if (!g) { cb(); return; }
  g.classList.add("blog-list-fade-out");
  setTimeout(() => { g.classList.remove("blog-list-fade-out"); g.innerHTML = ""; cb(); }, 300);
}

/* ================================================================
   SIDEBAR
   ================================================================ */
function renderSidebar() {
  renderCategories();
  renderRecentArticles();
  renderArchive();
}

/* ── Categories ──────────────────────────────────────────────── */
function renderCategories() {
  const el = document.getElementById("bsbCatList");
  if (!el) return;

  const categoriesWithCount = CATEGORY_MAP.map(cat => {
    let count;
    if (cat.key === "all") {
      count = allArticles.length;
    } else if (cat.key === "latest") {
      count = Math.min(allArticles.length, 6);
    } else {
      count = allArticles.filter(cat.predicate).length;
    }
    return { ...cat, count };
  }).filter(c => c.count > 0);

  el.innerHTML = categoriesWithCount.map(cat => `
    <li class="bsb-cat-item${isActiveCat(cat.key) ? " is-active" : ""}" data-cat="${cat.key}">
      <span>${cat.label}</span>
      <span class="bsb-cat-item__count">(${cat.count})</span>
    </li>
  `).join("");
}

function isActiveCat(key) {
  return !activeTag && !activeSearch && !activeArchive && activeCategory === key;
}

/* ── Recent Articles ─────────────────────────────────────────── */
function renderRecentArticles() {
  const el = document.getElementById("bsbRecentList");
  if (!el) return;
  const recent = allArticles.slice(0, 3);
  el.innerHTML = recent.map(a => `
    <a href="/blog/${a.slug}" class="bsb-recent-item">
      <img src="${a.image}" alt="${a.imageAlt || a.title}" class="bsb-recent-item__thumb" loading="lazy">
      <div class="bsb-recent-item__body">
        <p class="bsb-recent-item__title">${a.title}</p>
        <span class="bsb-recent-item__date">${formatDate(a.date)}</span>
      </div>
    </a>
  `).join("");
}

/* ── Archive ─────────────────────────────────────────────────── */
function renderArchive() {
  const el = document.getElementById("bsbArchiveList");
  if (!el) return;

  const byYearMonth = {};
  allArticles.forEach(a => {
    const d = bsbParseDate(a.date);
    const year  = d.getFullYear();
    const month = d.getMonth();
    const key   = `${year}-${String(month + 1).padStart(2, "0")}`;
    if (!byYearMonth[year]) byYearMonth[year] = {};
    if (!byYearMonth[year][key]) byYearMonth[year][key] = { month, count: 0 };
    byYearMonth[year][key].count++;
  });

  const years = Object.keys(byYearMonth).sort((a, b) => b - a);

  el.innerHTML = years.map(year => {
    const months = Object.entries(byYearMonth[year])
      .sort(([a], [b]) => b.localeCompare(a));
    return `
      <div class="bsb-archive-year">${year}</div>
      ${months.map(([key, { month, count }]) => `
        <div class="bsb-archive-month${activeArchive === key ? " is-active" : ""}" data-archive="${key}">
          <span>${MONTH_NAMES_RU[month]}</span>
          <span class="bsb-archive-month__count">(${count})</span>
        </div>
      `).join("")}
    `;
  }).join("");
}

/* ================================================================
   FILTER + RENDER
   ================================================================ */
function applyFilters({ skipAnimation = false } = {}) {
  displayedCount = INITIAL_COUNT;

  if (activeTag) {
    filteredArticles = allArticles.filter(a =>
      a.tags?.some(t => slugify(t) === activeTag)
    );
  } else if (activeSearch.trim().length > 0) {
    const q = activeSearch.trim().toLowerCase();
    filteredArticles = allArticles.filter(a =>
      a.title.toLowerCase().includes(q) ||
      (a.category || "").toLowerCase().includes(q) ||
      (a.tags || []).some(t => t.toLowerCase().includes(q))
    );
  } else if (activeArchive) {
    const [y, m] = activeArchive.split("-").map(Number);
    filteredArticles = allArticles.filter(a => {
      const d = bsbParseDate(a.date);
      return d.getFullYear() === y && d.getMonth() + 1 === m;
    });
  } else {
    const cat = CATEGORY_MAP.find(c => c.key === activeCategory) || CATEGORY_MAP[0];
    if (cat.key === "latest") {
      filteredArticles = allArticles.slice(0, 6);
    } else {
      filteredArticles = allArticles.filter(cat.predicate);
    }
  }

  updateCategoryActive();
  updateResultsInfo();
  renderArticles({ skipAnimation });
  setupLoadMore();
  syncUrl();
}

/* ================================================================
   RENDER ARTICLES
   ================================================================ */
function renderArticles({ skipAnimation = false } = {}) {
  const g = grid();
  if (!g) return;

  const slice = filteredArticles.slice(0, displayedCount);

  if (!skipAnimation) {
    g.classList.add("blog-list-fade-out");
    setTimeout(() => {
      g.classList.remove("blog-list-fade-out");
      g.innerHTML = "";
      insertCards(g, slice);
    }, 260);
  } else {
    g.innerHTML = "";
    insertCards(g, slice);
  }
}

function insertCards(container, articles) {
  if (!articles.length) {
    const empty = document.createElement("div");
    empty.className = "blog-empty-state is-visible";
    empty.innerHTML = `<h3>Ничего не найдено</h3><p>Попробуйте другой запрос или сбросьте фильтр.</p>`;
    container.appendChild(empty);
    return;
  }

  articles.forEach((a, i) => {
    const item = document.createElement("div");
    item.className = "blog-grid-item";
    item.innerHTML = cardHTML(a);
    container.appendChild(item);
    setTimeout(() => item.classList.add("is-visible"), i * 40);
  });

  if (window.BlogViews && typeof window.BlogViews.refreshBadges === "function") {
    window.BlogViews.refreshBadges(container);
  }
}

function cardHTML(a) {
  return `
    <div class="blog-post blog-grid date-style-2 blog-card">
      <div class="sx-post-media sx-img-effect img-reflection">
        <a href="/blog/${a.slug}">
          <img src="${a.image}" alt="${a.imageAlt || a.title}" loading="lazy">
        </a>
      </div>
      <div class="sx-post-info p-t30">
        <div class="sx-post-meta">
          <ul>
            <li class="post-date">${renderDate(a.date)}</li>
            <li class="post-author"><span>${a.author}</span></li>
            <li class="post-reading">
              <i class="fa-solid fa-clock"></i> ${readingTime(a)} мин
            </li>
            ${window.BlogViews ? window.BlogViews.renderCardBadge(a.id || a.slug) : ""}
          </ul>
        </div>
        <div class="sx-post-title">
          <h4 class="post-title">
            <a href="/blog/${a.slug}">${a.title}</a>
          </h4>
        </div>
      </div>
    </div>
  `;
}

/* ================================================================
   RESULTS INFO
   ================================================================ */
function updateResultsInfo() {
  const el = document.getElementById("blogResultsText");
  const resetBtn = document.getElementById("blogResetFilter");
  if (!el) return;

  const total = filteredArticles.length;
  const word  = pluralize(total);
  let text = "";
  let showReset = false;

  if (activeTag) {
    const label = activeTag.replace(/-/g, " ");
    text = `По тегу «${label}» найдено ${total} ${word}`;
    showReset = true;
  } else if (activeSearch.trim()) {
    text = `По запросу «${activeSearch.trim()}» найдено ${total} ${word}`;
    showReset = true;
  } else if (activeArchive) {
    const [y, m] = activeArchive.split("-").map(Number);
    text = `${MONTH_NAMES_RU[m - 1]} ${y}: ${total} ${word}`;
    showReset = true;
  } else {
    const cat = CATEGORY_MAP.find(c => c.key === activeCategory);
    if (cat && cat.key !== "all" && cat.key !== "latest") {
      text = `${cat.label}: ${total} ${word}`;
      showReset = true;
    } else {
      text = `Найдено ${total} ${word}`;
    }
  }

  el.textContent = text;
  if (resetBtn) resetBtn.hidden = !showReset;
}

/* ================================================================
   LOAD MORE
   ================================================================ */
function setupLoadMore() {
  const btn  = document.getElementById("blogLoadMoreBtn");
  const wrap = document.getElementById("blogLoadMoreWrap");
  if (!btn || !wrap) return;

  if (filteredArticles.length <= displayedCount) {
    wrap.style.display = "none";
  } else {
    wrap.style.display = "";
  }
}

function handleLoadMore() {
  const btn = document.getElementById("blogLoadMoreBtn");
  if (!btn) return;
  btn.classList.add("is-loading");

  const g = grid();
  const from = displayedCount;
  displayedCount += LOAD_MORE_COUNT;
  const slice = filteredArticles.slice(from, displayedCount);

  setTimeout(() => {
    slice.forEach((a, i) => {
      const item = document.createElement("div");
      item.className = "blog-grid-item";
      item.innerHTML = cardHTML(a);
      g.appendChild(item);
      setTimeout(() => item.classList.add("is-visible"), i * 40);
    });
    btn.classList.remove("is-loading");
    setupLoadMore();
  }, 150);
}

/* ================================================================
   EVENT SETUP
   ================================================================ */
function setupEvents() {
  const catList = document.getElementById("bsbCatList");
  if (catList) {
    catList.addEventListener("click", e => {
      const item = e.target.closest(".bsb-cat-item");
      if (!item) return;
      const key = item.dataset.cat;
      activeCategory = key;
      activeSearch   = "";
      activeArchive  = null;
      activeTag      = null;
      clearSearchInput();
      clearArchiveActive();
      applyFilters();
      scrollToGrid();
    });
  }

  const searchInput = document.getElementById("bsbSearchInput");
  if (searchInput) {
    if (activeSearch) searchInput.value = activeSearch;
    let debounceTimer;
    searchInput.addEventListener("input", e => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        activeSearch   = e.target.value;
        activeCategory = null;
        activeArchive  = null;
        activeTag      = null;
        clearCatActive();
        clearArchiveActive();
        applyFilters();
      }, 280);
    });
  }

  const archiveList = document.getElementById("bsbArchiveList");
  if (archiveList) {
    archiveList.addEventListener("click", e => {
      const item = e.target.closest(".bsb-archive-month");
      if (!item) return;
      const key = item.dataset.archive;
      activeArchive  = key;
      activeCategory = null;
      activeSearch   = "";
      activeTag      = null;
      clearSearchInput();
      clearCatActive();
      document.querySelectorAll(".bsb-archive-month").forEach(m => m.classList.remove("is-active"));
      item.classList.add("is-active");
      applyFilters();
      scrollToGrid();
    });
  }

  const loadMoreBtn = document.getElementById("blogLoadMoreBtn");
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", handleLoadMore);
  }

  const resetBtn = document.getElementById("blogResetFilter");
  if (resetBtn) {
    resetBtn.addEventListener("click", resetFilters);
  }

  document.addEventListener("click", e => {
    if (e.target.closest("[data-clear-tag-filter]")) {
      resetFilters();
    }
  });
}

function resetFilters() {
  activeCategory = "all";
  activeSearch   = "";
  activeArchive  = null;
  activeTag      = null;
  clearSearchInput();
  clearCatActive();
  clearArchiveActive();
  applyFilters();
}

/* ================================================================
   HELPERS — DOM
   ================================================================ */
function grid() { return document.getElementById("blogGridList"); }

function scrollToGrid() {
  const g = grid();
  if (!g) return;
  const top = g.getBoundingClientRect().top + window.scrollY - 130;
  window.scrollTo({ top, behavior: "smooth" });
}

function clearSearchInput() {
  const el = document.getElementById("bsbSearchInput");
  if (el) el.value = "";
}

function clearCatActive() {
  document.querySelectorAll(".bsb-cat-item").forEach(el => el.classList.remove("is-active"));
}

function clearArchiveActive() {
  document.querySelectorAll(".bsb-archive-month").forEach(el => el.classList.remove("is-active"));
}

function updateCategoryActive() {
  document.querySelectorAll(".bsb-cat-item").forEach(el => {
    el.classList.toggle("is-active", isActiveCat(el.dataset.cat));
  });
}

/* ================================================================
   HELPERS — Data
   ================================================================ */
function bsbParseDate(str) {
  if (!str || typeof str !== "string") return new Date(0);
  if (str.includes(".")) {
    const [dd, mm, yy] = str.split(".");
    return new Date(+yy, +mm - 1, +dd);
  }
  return new Date(str);
}

function formatDate(str) {
  try {
    const d = bsbParseDate(str);
    return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
  } catch { return str; }
}

function renderDate(str) {
  try {
    const d = bsbParseDate(str);
    return `<strong>${d.getDate().toString().padStart(2, "0")}</strong>
            <span>${d.toLocaleDateString("ru-RU", { month: "short" })}</span>`;
  } catch { return ""; }
}

function matchCategory(a, needle) {
  return String(a.category || "").toLowerCase().includes(needle.toLowerCase());
}

function hasTag(a, tag) {
  return Array.isArray(a.tags)
    ? a.tags.some(t => String(t).toLowerCase() === tag.toLowerCase())
    : false;
}

function slugify(text) {
  return String(text || "").toLowerCase().trim()
    .replace(/\s+/g, "-").replace(/[^\w\-а-яё]/gi, "");
}

function pluralize(n) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "статья";
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "статьи";
  return "статей";
}

function readingTime(article) {
  if (article._rt !== undefined) return article._rt;
  if (!article.content) { article._rt = 1; return 1; }
  const parts = [];
  article.content.forEach(b => {
    if (b.type === "paragraph" && b.text) parts.push(b.text);
    else if (b.type === "list" && b.items?.length) parts.push(...b.items);
  });
  const words = parts.join(" ").trim().split(/\s+/).length;
  article._rt = Math.max(1, Math.ceil(words / 200));
  return article._rt;
}
