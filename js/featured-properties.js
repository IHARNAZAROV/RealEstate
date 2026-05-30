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
      return "/images/objects/pic" + num + ".webp";
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
    return Number(obj.livePriceBYN || obj.priceBYN || 0) || 0;
  }

  function isNewObject(obj) {
    if (!obj.publishedAt) return false;
    return (Date.now() - new Date(obj.publishedAt).getTime()) / 86400000 <= 7;
  }

  function matchesTab(obj, tabMatch) {
    if (!tabMatch) return true;
    const typeLower = (obj.type || "").toLowerCase();
    if (!typeLower.includes(tabMatch.typeKeyword)) return false;
    if (tabMatch.rooms != null && Number(obj.rooms) !== tabMatch.rooms) return false;
    return true;
  }

  function buildCard(obj) {
    const imgSrc  = getPreviewImage(obj);
    const area    = getObjectArea(obj);
    const price   = getObjectPrice(obj);
    const slug    = obj.slug || "";
    const url     = "/objects/" + slug;
    const city    = obj.city || "";
    const address = obj.address || "";
    const location = [city ? "г. " + city : "", address].filter(Boolean).join(", ");

    const dealBadge = obj.dealType || "Продажа";
    const isNew     = isNewObject(obj);
    const rooms     = obj.rooms ? Number(obj.rooms) : null;

    const roomsLabel = rooms
      ? (rooms === 1 ? "1 комн." : rooms === 2 ? "2 комн." : rooms === 3 ? "3 комн." : rooms + " комн.")
      : null;

    const areaLabel = area ? area + " м²" : null;

    const specsHTML = [
      roomsLabel
        ? '<span class="fp-card-spec"><i class="fa-solid fa-door-open" aria-hidden="true"></i>' + roomsLabel + "</span>"
        : "",
      areaLabel
        ? '<span class="fp-card-spec"><i class="fa-solid fa-ruler-combined" aria-hidden="true"></i>' + areaLabel + "</span>"
        : "",
    ].join("");

    return (
      '<li class="featured-prop-item" data-slug="' + slug + '">' +
        '<article class="fp-card">' +
          '<a href="' + url + '" class="fp-card__img-wrap" aria-label="' + (obj.title || "") + '" tabindex="-1">' +
            '<img loading="lazy" src="' + imgSrc + '" alt="' + (obj.title || "") + '" class="fp-card__img">' +
            '<span class="fp-card__deal-badge">' + dealBadge + '</span>' +
            (isNew ? '<span class="fp-card__new-badge">Новинка</span>' : "") +
          "</a>" +
          '<div class="fp-card__body">' +
            '<h4 class="fp-card__title"><a href="' + url + '">' + (obj.title || "") + "</a></h4>" +
            (location ? '<p class="fp-card__location"><i class="fa-solid fa-location-dot" aria-hidden="true"></i>' + location + "</p>" : "") +
            (specsHTML ? '<div class="fp-card__specs">' + specsHTML + "</div>" : "") +
            '<div class="fp-card__footer">' +
              (price > 0 ? '<span class="fp-card__price">' + formatPrice(price) + " BYN</span>" : "") +
              '<a href="' + url + '" class="fp-card__btn">Подробнее</a>' +
            "</div>" +
          "</div>" +
        "</article>" +
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
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          grid.querySelectorAll(".featured-prop-item").forEach(function (el) {
            el.classList.add("is-visible");
          });
        });
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
    const section = document.getElementById("featured-properties");
    const tabsEl  = document.getElementById("fp-tabs");
    const grid    = document.getElementById("fp-grid");

    if (!section || !tabsEl || !grid) return;

    fetch("/data/objects.json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        const allRecs = data.filter(function (obj) { return obj.recommended === true; });
        let activeKey = "all";

        tabsEl.innerHTML = TABS.map(function (tab) {
          return (
            '<button class="fp-tab' + (tab.key === "all" ? " is-active" : "") +
            '" data-key="' + tab.key + '" role="tab" aria-selected="' + (tab.key === "all") + '">' +
            tab.label + "</button>"
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
            const active = b.dataset.key === key;
            b.classList.toggle("is-active", active);
            b.setAttribute("aria-selected", active);
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
