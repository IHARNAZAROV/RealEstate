"use strict";

/* =========================================================
   BLOG VIEWS COUNTER (server-side)
   Просмотры считаются на сервере (api/blog-views.php),
   данные хранятся в data/blog-views.json и общие для всех
   посетителей сайта.
   ========================================================= */

(function (global) {
  const API_URL = "/api/blog-views.php";
  const VIEWED_KEY = "blog_post_viewed_ids_v1";

  /* ------- In-memory cache ------- */
  const cache = Object.create(null);

  function setCached(id, count) {
    if (!id) return;
    const n = Number(count);
    cache[id] = Number.isFinite(n) && n > 0 ? n : 0;
  }

  function getCached(id) {
    return cache[id] || 0;
  }

  /* ------- Helpers ------- */
  function resolveId(input) {
    if (input == null) return "";
    if (typeof input === "string" || typeof input === "number") {
      return String(input).trim();
    }
    if (typeof input === "object") {
      return String(input.id || input.slug || "").trim();
    }
    return "";
  }

  function safeFetch(url, options) {
    if (typeof fetch !== "function") return Promise.reject(new Error("fetch unavailable"));
    return fetch(url, options).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    });
  }

  /* ------- Server API ------- */
  function fetchViewsFor(ids) {
    const list = (ids || []).map(resolveId).filter(Boolean);
    if (!list.length) return Promise.resolve({});
    const url = API_URL + "?ids=" + encodeURIComponent(list.join(","));
    return safeFetch(url).then(function (data) {
      const out = (data && data.views) || {};
      Object.keys(out).forEach(function (k) { setCached(k, out[k]); });
      return out;
    }).catch(function () { return {}; });
  }

  function incrementOnServer(id) {
    return safeFetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: id }),
    }).then(function (data) {
      if (data && data.ok && typeof data.count !== "undefined") {
        setCached(id, data.count);
        return data.count;
      }
      return getCached(id);
    }).catch(function () { return getCached(id); });
  }

  /* ------- "Уже просмотрено в этом браузере" (анти-накрутка F5) ------- */
  function readViewedSet() {
    try {
      const raw = window.localStorage.getItem(VIEWED_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return (parsed && typeof parsed === "object") ? parsed : {};
    } catch (e) { return {}; }
  }

  function markViewed(id) {
    try {
      const set = readViewedSet();
      set[id] = Date.now();
      window.localStorage.setItem(VIEWED_KEY, JSON.stringify(set));
    } catch (e) {}
  }

  function shouldCountView(id) {
    const set = readViewedSet();
    const last = Number(set[id] || 0);
    if (!last) return true;
    // Считаем повторный просмотр через 6 часов
    return (Date.now() - last) > 6 * 60 * 60 * 1000;
  }

  /* ------- Public API ------- */
  function getViews(postIdOrArticle) {
    return getCached(resolveId(postIdOrArticle));
  }

  function loadViews(idsOrArticles) {
    const ids = (idsOrArticles || []).map(resolveId).filter(Boolean);
    return fetchViewsFor(ids);
  }

  function incrementViews(postIdOrArticle, options) {
    const id = resolveId(postIdOrArticle);
    if (!id) return Promise.resolve(0);
    const opts = options || {};
    const force = opts.force === true;

    if (!force && !shouldCountView(id)) {
      // Просто подтянем актуальное значение с сервера
      return fetchViewsFor([id]).then(function () { return getCached(id); });
    }

    return incrementOnServer(id).then(function (count) {
      markViewed(id);
      return count;
    });
  }

  /* ------- Formatting ------- */
  function pluralizeViews(count) {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return "просмотр";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "просмотра";
    return "просмотров";
  }

  function formatViewsLabel(count) {
    return count + " " + pluralizeViews(count);
  }

  /* ------- HTML helpers ------- */
  const EYE_ICON_SVG =
    '<svg class="post-views-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">' +
    '<path d="M12 5C6.5 5 2.2 8.6 1 12c1.2 3.4 5.5 7 11 7s9.8-3.6 11-7c-1.2-3.4-5.5-7-11-7zm0 12c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>' +
    "</svg>";

  function renderCardBadge(postIdOrArticle) {
    const id = resolveId(postIdOrArticle);
    const count = getCached(id);
    return (
      '<li class="post-views" data-blog-views-id="' + id + '" aria-label="' + formatViewsLabel(count) + '">' +
      EYE_ICON_SVG +
      '<span class="post-views-count">' + count + "</span>" +
      "</li>"
    );
  }

  function renderDetailBadge(postIdOrArticle) {
    const id = resolveId(postIdOrArticle);
    const count = getCached(id);
    return (
      '<div class="post-views post-views--detail" data-blog-views-id="' + id + '" aria-label="' + formatViewsLabel(count) + '">' +
      EYE_ICON_SVG +
      '<span class="post-views-count">' + count + "</span>" +
      '<span class="post-views-label">' + pluralizeViews(count) + "</span>" +
      "</div>"
    );
  }

  /* ------- DOM refresh helpers ------- */
  function collectBadgeIds(root) {
    const scope = root || document;
    const nodes = scope.querySelectorAll("[data-blog-views-id]");
    const ids = [];
    nodes.forEach(function (n) {
      const id = n.getAttribute("data-blog-views-id");
      if (id) ids.push(id);
    });
    return ids;
  }

  function applyCountsToDom(root) {
    const scope = root || document;
    const nodes = scope.querySelectorAll("[data-blog-views-id]");
    nodes.forEach(function (n) {
      const id = n.getAttribute("data-blog-views-id");
      const count = getCached(id);
      const countEl = n.querySelector(".post-views-count");
      if (countEl) countEl.textContent = count;
      const labelEl = n.querySelector(".post-views-label");
      if (labelEl) labelEl.textContent = pluralizeViews(count);
      n.setAttribute("aria-label", formatViewsLabel(count));
    });
  }

  function refreshBadges(root) {
    const ids = Array.from(new Set(collectBadgeIds(root)));
    if (!ids.length) return Promise.resolve();
    return fetchViewsFor(ids).then(function () { applyCountsToDom(root); });
  }

  global.BlogViews = {
    getViews: getViews,
    loadViews: loadViews,
    incrementViews: incrementViews,
    formatViewsLabel: formatViewsLabel,
    pluralizeViews: pluralizeViews,
    renderCardBadge: renderCardBadge,
    renderDetailBadge: renderDetailBadge,
    refreshBadges: refreshBadges,
    applyCountsToDom: applyCountsToDom,
    EYE_ICON_SVG: EYE_ICON_SVG,
  };
})(window);
