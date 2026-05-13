"use strict";

(function () {
  const ARTICLES_URL = "/data/blog-articles.json";
  const VIEWS_URL = "/api/blog-views.php";

  const state = {
    articles: [],
    views: {},
    sortKey: "views",
    sortDir: "desc",
    search: "",
    category: "",
    requestController: null,
    requestSeq: 0,
    searchDebounceTimer: null,
  };

  const els = {
    tbody: document.getElementById("bsTbody"),
    search: document.getElementById("bsSearch"),
    category: document.getElementById("bsCategory"),
    sort: document.getElementById("bsSort"),
    refresh: document.getElementById("bsRefresh"),
    statTotal: document.getElementById("bsStatTotal"),
    statViews: document.getElementById("bsStatViews"),
    statAvg: document.getElementById("bsStatAvg"),
    statTop: document.getElementById("bsStatTop"),
    headers: document.querySelectorAll(".bs-table thead th[data-sort]"),
  };

  function fetchJson(url, signal) {
    return fetch(url, { cache: "no-store", signal }).then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  function loadAll() {
    if (state.requestController) {
      state.requestController.abort();
    }
    state.requestController = new AbortController();
    const requestId = ++state.requestSeq;

    setLoading();
    return Promise.all([
      fetchJson(ARTICLES_URL, state.requestController.signal).catch((error) => {
        if (error?.name === "AbortError") throw error;
        return [];
      }),
      fetchJson(VIEWS_URL, state.requestController.signal).catch((error) => {
        if (error?.name === "AbortError") throw error;
        return { views: {} };
      }),
    ]).then(([articles, viewsResp]) => {
      if (requestId !== state.requestSeq) return;
      state.articles = Array.isArray(articles) ? articles : [];
      state.views = (viewsResp && viewsResp.views) || {};
      buildCategoryOptions();
      render();
    }).catch((error) => {
      if (error?.name === "AbortError") return;
      els.tbody.innerHTML = '<tr><td colspan="5" class="bs-empty">Ошибка загрузки данных</td></tr>';
    }).finally(() => {
      if (requestId === state.requestSeq) {
        state.requestController = null;
      }
    });
  }

  function setLoading() {
    els.tbody.innerHTML = '<tr><td colspan="5" class="bs-loading">Загрузка данных…</td></tr>';
  }

  function getViewsFor(article) {
    const idA = article.id;
    const idB = article.slug;
    const a = idA && Number(state.views[idA]) || 0;
    const b = idB && Number(state.views[idB]) || 0;
    return Math.max(a, b);
  }

  function parseDate(str) {
    if (!str) return 0;
    // Format dd.mm.yyyy
    const m = String(str).match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (!m) {
      const t = Date.parse(str);
      return isNaN(t) ? 0 : t;
    }
    return new Date(+m[3], +m[2] - 1, +m[1]).getTime();
  }

  function buildCategoryOptions() {
    const cats = Array.from(new Set(state.articles.map((a) => a.category).filter(Boolean))).sort();
    const current = els.category.value;
    els.category.innerHTML =
      '<option value="">Все категории</option>' +
      cats.map((c) => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`).join("");
    if (cats.includes(current)) els.category.value = current;
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function escapeAttr(s) { return escapeHtml(s); }

  function applyFilters(list) {
    const q = state.search.trim().toLowerCase();
    const cat = state.category;
    return list.filter((a) => {
      if (cat && a.category !== cat) return false;
      if (!q) return true;
      const hay = [
        a.title, a.category, a.author, a.slug,
        Array.isArray(a.tags) ? a.tags.join(" ") : "",
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }

  function applySort(list) {
    const key = state.sortKey;
    const dir = state.sortDir === "asc" ? 1 : -1;
    const sorted = list.slice();
    sorted.sort((a, b) => {
      let va, vb;
      switch (key) {
        case "views":   va = getViewsFor(a); vb = getViewsFor(b); break;
        case "date":    va = parseDate(a.date); vb = parseDate(b.date); break;
        case "title":   va = (a.title || "").toLowerCase(); vb = (b.title || "").toLowerCase(); break;
        case "category":va = (a.category || "").toLowerCase(); vb = (b.category || "").toLowerCase(); break;
        default:        va = 0; vb = 0;
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return sorted;
  }

  function render() {
    const filtered = applyFilters(state.articles);
    const sorted = applySort(filtered);

    // Summary
    const totalViews = state.articles.reduce((sum, a) => sum + getViewsFor(a), 0);
    const totalArticles = state.articles.length;
    els.statTotal.textContent = totalArticles;
    els.statViews.textContent = totalViews.toLocaleString("ru-RU");
    els.statAvg.textContent = totalArticles ? Math.round(totalViews / totalArticles).toLocaleString("ru-RU") : "0";

    const top = state.articles.slice().sort((a, b) => getViewsFor(b) - getViewsFor(a))[0];
    if (top && getViewsFor(top) > 0) {
      els.statTop.innerHTML = `<a href="/blog/${escapeAttr(top.slug)}" target="_blank" rel="noopener" style="color:#fff; text-decoration:none;">${escapeHtml(top.title)}</a><div style="color:#9ca3af; font-size:12px; font-weight:500; margin-top:4px;">${getViewsFor(top).toLocaleString("ru-RU")} просмотров</div>`;
    } else {
      els.statTop.textContent = "—";
    }

    // Header arrows
    els.headers.forEach((th) => {
      const k = th.getAttribute("data-sort");
      th.classList.toggle("sorted", k === state.sortKey);
      const arrow = th.querySelector(".arrow");
      if (arrow) arrow.textContent = k === state.sortKey ? (state.sortDir === "asc" ? "↑" : "↓") : "↕";
    });

    if (!sorted.length) {
      els.tbody.innerHTML = '<tr><td colspan="5" class="bs-empty">Статьи не найдены</td></tr>';
      return;
    }

    const maxViews = Math.max(1, ...sorted.map(getViewsFor));

    els.tbody.innerHTML = sorted.map((a, i) => {
      const views = getViewsFor(a);
      const barW = Math.max(4, Math.round((views / maxViews) * 80));
      const rankClass = i < 3 && state.sortKey === "views" && state.sortDir === "desc" ? "bs-rank top" : "bs-rank";
      const img = a.image ? `<img class="bs-thumb" src="${escapeAttr(a.image)}" alt="" loading="lazy">` : `<div class="bs-thumb"></div>`;
      return `
        <tr>
          <td><span class="${rankClass}">${i + 1}</span></td>
          <td>
            <div class="bs-title-cell">
              ${img}
              <a href="/blog/${escapeAttr(a.slug)}" target="_blank" rel="noopener">${escapeHtml(a.title || a.slug || "")}</a>
            </div>
          </td>
          <td>${a.category ? `<span class="bs-cat">${escapeHtml(a.category)}</span>` : "—"}</td>
          <td>${escapeHtml(a.date || "—")}</td>
          <td class="num">
            <span class="bs-bar" style="width:${barW}px;"></span>${views.toLocaleString("ru-RU")}
          </td>
        </tr>
      `;
    }).join("");
  }

  function setSort(key) {
    if (state.sortKey === key) {
      state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
    } else {
      state.sortKey = key;
      state.sortDir = (key === "title" || key === "category" || key === "date") ? "asc" : "desc";
    }
    // Sync select
    if (key === "views") els.sort.value = state.sortDir === "asc" ? "views-asc" : "views-desc";
    else if (key === "date") els.sort.value = state.sortDir === "asc" ? "date-asc" : "date-desc";
    else if (key === "title" && state.sortDir === "asc") els.sort.value = "title-asc";
    render();
  }

  // Events
  els.headers.forEach((th) => {
    th.addEventListener("click", () => setSort(th.getAttribute("data-sort")));
  });
  els.search.addEventListener("input", (e) => {
    const nextValue = e.target.value;
    if (state.searchDebounceTimer) {
      clearTimeout(state.searchDebounceTimer);
    }
    state.searchDebounceTimer = setTimeout(() => {
      state.search = nextValue;
      render();
      state.searchDebounceTimer = null;
    }, 200);
  });
  els.category.addEventListener("change", (e) => { state.category = e.target.value; render(); });
  els.sort.addEventListener("change", (e) => {
    const v = e.target.value;
    const map = {
      "views-desc":  ["views", "desc"],
      "views-asc":   ["views", "asc"],
      "date-desc":   ["date", "desc"],
      "date-asc":    ["date", "asc"],
      "title-asc":   ["title", "asc"],
    };
    const m = map[v];
    if (m) { state.sortKey = m[0]; state.sortDir = m[1]; render(); }
  });
  els.refresh.addEventListener("click", () => loadAll());

  loadAll();
})();
