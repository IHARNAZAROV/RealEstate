(function () {
  "use strict";

  const TABS = [
    { key: "all",   label: "Все",           match: null },
    { key: "1k",    label: "Однокомнатные", match: { typeKeyword: "квартир", rooms: 1 } },
    { key: "2k",    label: "Двухкомнатные", match: { typeKeyword: "квартир", rooms: 2 } },
    { key: "3k",    label: "Трехкомнатные", match: { typeKeyword: "квартир", rooms: 3 } },
    { key: "house", label: "Дома",          match: { typeKeyword: "дом" } },
    { key: "land",  label: "Участки",       match: { typeKeyword: "участ" } },
  ];

  const MAX_CARDS = 8;

  function formatPrice(v) {
    return v ? Number(v).toLocaleString("ru-RU") : "";
  }

  function getPreviewImage(obj) {
    if (obj.images && obj.images.length > 0) {
      const img = obj.images[0];
      if (img && typeof img === "string") {
        return img.startsWith("/") || img.startsWith("http") ? img : "/" + img;
      }
    }
    if (obj.id) {
      const num = obj.id.replace("obj-", "");
      return `/images/objects/pic${num}.webp`;
    }
    return "/images/objects/placeholder.webp";
  }

  function getObjectArea(obj) {
    const raw = obj.area ?? obj.areaTotal ?? obj.totalArea ?? obj.square ?? null;
    if (!raw) return null;
    const area = Number(String(raw).replace(",", ".").replace(/[^\d.]/g, ""));
    return area > 0 ? area : null;
  }

  function getObjectPrice(obj) {
    const p = obj.livePriceBYN || obj.priceBYN || 0;
    return Number(p) || 0;
  }

  function isNewObject(obj, days) {
    days = days || 7;
    if (!obj.publishedAt) return false;
    return (Date.now() - new Date(obj.publishedAt).getTime()) / 86400000 <= days;
  }

  function renderBadges(obj) {
    let html = "";
    if (obj.recommended === true) html += '<span class="badge badge-featured">Рекомендуемый</span>';
    if (isNewObject(obj))          html += '<span class="badge badge-new">Новинка</span>';
    if (!html) return "";
    return '<div class="object-badges">' + html + "</div>";
  }

  function matchesTab(obj, tabMatch) {
    if (!tabMatch) return true;
    const typeLower = (obj.type || "").toLowerCase();
    if (!typeLower.includes(tabMatch.typeKeyword)) return false;
    if (tabMatch.rooms != null && Number(obj.rooms) !== tabMatch.rooms) return false;
    return true;
  }

  function buildCard(obj) {
    const imgSrc       = getPreviewImage(obj);
    const area         = getObjectArea(obj);
    const price        = getObjectPrice(obj);
    const pricePerM    = area && price > 0 ? Math.round(price / area) : null;
    const badgesHTML   = renderBadges(obj);
    const slug         = obj.slug || "";
    const url          = "/objects/" + slug;

    return (
      '<li class="object-item featured-prop-item" data-slug="' + slug + '">' +
        '<div class="project-mas hover-shadow">' +
          '<a href="' + url + '" class="card-link-overlay" aria-label="Открыть объект ' + (obj.title || "") + '"></a>' +
          '<div class="image-effect-one">' +
            badgesHTML +
            '<img loading="lazy" src="' + imgSrc + '" alt="' + (obj.title || "") + '">' +
          "</div>" +
          '<div class="project-info p-a20 bg-gray">' +
            '<h4 class="sx-tilte m-t0"><a href="' + url + '">' + (obj.title || "") + "</a></h4>" +
            (obj.cardDescription ? "<p>" + obj.cardDescription + "</p>" : "") +
            '<div class="object-meta">' +
              (price > 0 ? '<span class="object-price">' + formatPrice(price) + " BYN</span>" : "") +
              (pricePerM ? "<span>" + formatPrice(pricePerM) + " BYN / м²</span>" : "") +
            "</div>" +
            '<a href="' + url + '" class="site-button btn-effect sx-btn-primary m-t15">Подробнее</a>' +
          "</div>" +
        "</div>" +
      "</li>"
    );
  }

  function applyFilter(grid, allRecs, tabMatch) {
    const filtered = allRecs.filter(function (obj) {
      return matchesTab(obj, tabMatch);
    }).slice(0, MAX_CARDS);

    const items = grid.querySelectorAll(".featured-prop-item");

    if (items.length === 0) {
      grid.innerHTML = filtered.map(buildCard).join("");
      grid.querySelectorAll(".featured-prop-item").forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }

    items.forEach(function (el) {
      el.classList.remove("is-visible");
      el.classList.add("is-leaving");
    });

    setTimeout(function () {
      grid.innerHTML = filtered.length
        ? filtered.map(buildCard).join("")
        : '<li class="featured-prop-empty">Объекты не найдены</li>';

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          grid.querySelectorAll(".featured-prop-item").forEach(function (el) {
            el.classList.add("is-visible");
          });
        });
      });
    }, 320);
  }

  function init() {
    const section    = document.getElementById("featured-properties");
    const tabsEl     = document.getElementById("fp-tabs");
    const grid       = document.getElementById("fp-grid");

    if (!section || !tabsEl || !grid) return;

    fetch("/data/objects.json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        const allRecs = data.filter(function (obj) { return obj.recommended === true; });

        let activeKey = "all";

        tabsEl.innerHTML = TABS.map(function (tab) {
          return (
            '<button class="fp-tab' + (tab.key === "all" ? " is-active" : "") + '" data-key="' + tab.key + '">' +
              tab.label +
            "</button>"
          );
        }).join("");

        applyFilter(grid, allRecs, null);

        tabsEl.addEventListener("click", function (e) {
          const btn = e.target.closest(".fp-tab");
          if (!btn) return;

          const key = btn.dataset.key;
          if (key === activeKey) return;

          activeKey = key;

          tabsEl.querySelectorAll(".fp-tab").forEach(function (b) {
            b.classList.toggle("is-active", b.dataset.key === key);
          });

          const tab = TABS.find(function (t) { return t.key === key; });
          applyFilter(grid, allRecs, tab ? tab.match : null);
        });
      })
      .catch(function (err) {
        console.warn("featured-properties: failed to load objects.json", err);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
