(function () {
  "use strict";

  const TABS = [
    { key: "all",   label: "Все",               match: null },
    { key: "1k",    label: "Однокомнатные",      match: { typeKeywords: ["квартир"], rooms: 1 } },
    { key: "2k",    label: "Двухкомнатные",      match: { typeKeywords: ["квартир"], rooms: 2 } },
    { key: "3k",    label: "Трехкомнатные",      match: { typeKeywords: ["квартир"], rooms: 3 } },
    { key: "house", label: "Дома и участки",     match: { typeKeywords: ["дом", "участ"] } },
  ];

  const MAX_CARDS = 8;

  function formatPrice(v) {
    return v ? Number(v).toLocaleString("ru-RU") : "";
  }

  function getImages(obj) {
    if (obj.images && obj.images.length > 0) {
      return obj.images.map(function (img) {
        if (!img || typeof img !== "string") return "/images/objects/placeholder.webp";
        return img.startsWith("/") || img.startsWith("http") ? img : "/" + img;
      });
    }
    if (obj.id) {
      var num = obj.id.replace("obj-", "");
      return ["/images/objects/pic" + num + ".webp"];
    }
    return ["/images/objects/placeholder.webp"];
  }

  function getObjectArea(obj) {
    var raw = obj.area != null ? obj.area
            : obj.areaTotal != null ? obj.areaTotal
            : obj.totalArea != null ? obj.totalArea
            : obj.square != null ? obj.square : null;
    if (!raw) return null;
    var area = Number(String(raw).replace(",", ".").replace(/[^\d.]/g, ""));
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
    var typeLower = (obj.type || "").toLowerCase();
    var typeOk = tabMatch.typeKeywords.some(function (kw) { return typeLower.includes(kw); });
    if (!typeOk) return false;
    if (tabMatch.rooms != null && Number(obj.rooms) !== tabMatch.rooms) return false;
    return true;
  }

  function buildCard(obj) {
    var images  = getImages(obj);
    var area    = getObjectArea(obj);
    var price   = getObjectPrice(obj);
    var slug    = obj.slug || "";
    var url     = "/objects/" + slug;
    var city    = obj.city || "";
    var address = obj.address || "";
    var location = [city ? "г. " + city : "", address].filter(Boolean).join(", ");
    var dealBadge = obj.dealType || "Продажа";
    var isNew     = isNewObject(obj);
    var rooms     = obj.rooms ? Number(obj.rooms) : null;

    var roomsLabel = rooms
      ? rooms + " комн."
      : null;
    var areaLabel = area ? area + " м²" : null;

    var specsHTML = [
      roomsLabel
        ? '<span class="fp-card-spec"><i class="fa-solid fa-door-open" aria-hidden="true"></i>' + roomsLabel + "</span>"
        : "",
      areaLabel
        ? '<span class="fp-card-spec"><i class="fa-solid fa-ruler-combined" aria-hidden="true"></i>' + areaLabel + "</span>"
        : "",
    ].join("");

    var hasMultiple = images.length > 1;

    var arrowsHTML = hasMultiple
      ? '<button class="fp-slide-btn fp-slide-prev" aria-label="Предыдущее фото" type="button">' +
          '<i class="fa-solid fa-chevron-left"></i>' +
        '</button>' +
        '<button class="fp-slide-btn fp-slide-next" aria-label="Следующее фото" type="button">' +
          '<i class="fa-solid fa-chevron-right"></i>' +
        '</button>' +
        '<div class="fp-slide-dots">' +
          images.map(function (_, i) {
            return '<span class="fp-dot' + (i === 0 ? ' is-active' : '') + '"></span>';
          }).join("") +
        '</div>'
      : "";

    return (
      '<li class="featured-prop-item" data-slug="' + slug + '">' +
        '<article class="fp-card">' +
          '<div class="fp-card__img-wrap" data-images=\'' + JSON.stringify(images) + '\' data-index="0">' +
            '<a href="' + url + '" class="fp-card__img-link" aria-label="' + (obj.title || "").replace(/'/g, "&#39;") + '" tabindex="-1">' +
              '<img loading="lazy" src="' + images[0] + '" alt="' + (obj.title || "").replace(/"/g, "&quot;") + '" class="fp-card__img">' +
            '</a>' +
            '<span class="fp-card__deal-badge">' + dealBadge + '</span>' +
            (isNew ? '<span class="fp-card__new-badge">Новинка</span>' : "") +
            arrowsHTML +
          "</div>" +
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

  function bindSlider(grid) {
    grid.querySelectorAll(".fp-card__img-wrap").forEach(function (wrap) {
      var images = JSON.parse(wrap.dataset.images || "[]");
      if (images.length <= 1) return;

      var img  = wrap.querySelector(".fp-card__img");
      var dots = wrap.querySelectorAll(".fp-dot");
      var idx  = 0;

      function goTo(next) {
        idx = (next + images.length) % images.length;
        img.classList.add("fp-img--fade");
        setTimeout(function () {
          img.src = images[idx];
          img.classList.remove("fp-img--fade");
          dots.forEach(function (d, i) { d.classList.toggle("is-active", i === idx); });
        }, 150);
        wrap.dataset.index = idx;
      }

      wrap.querySelector(".fp-slide-prev").addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        goTo(idx - 1);
      });

      wrap.querySelector(".fp-slide-next").addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        goTo(idx + 1);
      });
    });
  }

  function applyFilter(grid, allRecs, tabMatch) {
    var filtered = allRecs.filter(function (obj) {
      return matchesTab(obj, tabMatch);
    }).slice(0, MAX_CARDS);

    var items = grid.querySelectorAll(".featured-prop-item");

    function renderAndBind() {
      grid.innerHTML = filtered.length
        ? filtered.map(buildCard).join("")
        : '<li class="featured-prop-empty">Объекты не найдены</li>';
      bindSlider(grid);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          grid.querySelectorAll(".featured-prop-item").forEach(function (el) {
            el.classList.add("is-visible");
          });
        });
      });
    }

    if (items.length === 0) {
      renderAndBind();
      return;
    }

    items.forEach(function (el) {
      el.classList.remove("is-visible");
      el.classList.add("is-leaving");
    });

    setTimeout(renderAndBind, 320);
  }

  function init() {
    var section = document.getElementById("featured-properties");
    var tabsEl  = document.getElementById("fp-tabs");
    var grid    = document.getElementById("fp-grid");

    if (!section || !tabsEl || !grid) return;

    fetch("/data/objects.json")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var allRecs = data.filter(function (obj) { return obj.recommended === true; });
        var activeKey = "all";

        tabsEl.innerHTML = TABS.map(function (tab) {
          return (
            '<button class="fp-tab' + (tab.key === "all" ? " is-active" : "") +
            '" data-key="' + tab.key + '" role="tab" aria-selected="' + (tab.key === "all") + '">' +
            tab.label + "</button>"
          );
        }).join("");

        applyFilter(grid, allRecs, null);

        tabsEl.addEventListener("click", function (e) {
          var btn = e.target.closest(".fp-tab");
          if (!btn) return;
          var key = btn.dataset.key;
          if (key === activeKey) return;
          activeKey = key;
          tabsEl.querySelectorAll(".fp-tab").forEach(function (b) {
            var active = b.dataset.key === key;
            b.classList.toggle("is-active", active);
            b.setAttribute("aria-selected", active);
          });
          var tab = TABS.find(function (t) { return t.key === key; });
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
