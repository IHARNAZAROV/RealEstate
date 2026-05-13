(function () {
  "use strict";

  const OBJECT_URL = (slug) => `/data/objects/${encodeURIComponent(slug)}.json`;
  const LIST_URL = "/data/objects-list.json";
  const MAPTILER_KEY = "ZSZnUbPl4oOTpdLavjmE"

  /* =====================================================
     HELPERS
  ===================================================== */
  const qs = (s, r = document) => r.querySelector(s);

  const isFilled = (v) =>
    v !== null && v !== undefined && String(v).trim() !== "";

  const safeJoin = (parts, sep = " • ") => parts.filter(isFilled).join(sep);

  const formatPrice = (v) =>
    typeof v === "number" ? v.toLocaleString("ru-RU") : "";

  function getDisplayBynPrice(obj) {
    if (typeof window.RealterPrice?.getLiveBynPriceSync === "function") {
      return window.RealterPrice.getLiveBynPriceSync(obj);
    }

    return typeof obj?.priceBYN === "number" ? obj.priceBYN : null;
  }

  async function fetchUsdRate() {
    if (typeof window.RealterPrice?.fetchUsdRate === "function") {
      return window.RealterPrice.fetchUsdRate();
    }

    throw new Error("Модуль live-price.js не подключён");
  }

  function createPriceState(obj) {
    return {
      isUsd: false,
      isAnimating: false,
      isRateLoading: false,
      bynFallback: getDisplayBynPrice(obj),
      usd: typeof obj.priceUSD === "number" ? obj.priceUSD : null,
      usdRateData: null,
    };
  }

  function getBynPrice(state) {
    if (state.usdRateData && typeof state.usd === "number") {
      return Math.round(state.usd * state.usdRateData.ratePerUnit);
    }

    return state.bynFallback;
  }

  function getFormattedPriceData(state) {
    if (state.isUsd) {
      return {
        label: "Цена в долларах",
        value:
          typeof state.usd === "number"
            ? `${formatPrice(state.usd)} USD`
            : "Цена в USD недоступна",
      };
    }

    if (state.isRateLoading && typeof state.usd === "number") {
      return {
        label: "Цена",
        value: "Загрузка...",
      };
    }

    const bynValue = getBynPrice(state);
    const bynLabel = state.usdRateData?.dateLabel
      ? `Цена (по курсу НБРБ на ${state.usdRateData.dateLabel})`
      : "Цена";

    return {
      label: bynLabel,
      value: typeof bynValue === "number" ? `${formatPrice(bynValue)} BYN` : "",
    };
  }

  function updatePriceButtonContent(button, state) {
    const label = button.querySelector("[data-price-label]");
    const value = button.querySelector("[data-price-value]");
    const content = getFormattedPriceData(state);

    if (label) label.textContent = content.label;
    if (value) value.textContent = content.value;

    button.setAttribute(
      "aria-label",
      state.isUsd
        ? "Показать цену в белорусских рублях"
        : "Показать цену в долларах США",
    );
    button.setAttribute("aria-pressed", state.isUsd ? "true" : "false");
    button.dataset.currency = state.isUsd ? "usd" : "byn";
  }

  function animatePriceSwap(button, state) {
    if (state.isAnimating) return;

    state.isAnimating = true;
    button.classList.add("is-animating");

    window.setTimeout(() => {
      updatePriceButtonContent(button, state);
      button.classList.add("is-animating-in");
    }, 180);

    window.setTimeout(() => {
      button.classList.remove("is-animating", "is-animating-in");
      state.isAnimating = false;
    }, 420);
  }

  function setupPriceToggle(button, obj) {
    const state = createPriceState(obj);
    updatePriceButtonContent(button, state);

    if (typeof state.usd === "number") {
      state.isRateLoading = true;
      updatePriceButtonContent(button, state);
      button.classList.add("is-loading");

      fetchUsdRate()
        .then((rateData) => {
          state.usdRateData = rateData;

          if (!state.isUsd) {
            updatePriceButtonContent(button, state);
          }
        })
        .catch((error) => {
          console.error(error);
        })
        .finally(() => {
          state.isRateLoading = false;
          if (!state.isUsd) {
            updatePriceButtonContent(button, state);
          }
          button.classList.remove("is-loading");
        });
    }

    button.addEventListener("click", async () => {
      if (state.isAnimating) return;

      const nextIsUsd = !state.isUsd;

      if (!state.usdRateData && typeof state.usd === "number") {
        state.isRateLoading = true;
        if (!state.isUsd) {
          updatePriceButtonContent(button, state);
        }
        button.classList.add("is-loading");

        try {
          state.usdRateData = await fetchUsdRate();
        } catch (error) {
          console.error(error);
        } finally {
          state.isRateLoading = false;
          if (!state.isUsd) {
            updatePriceButtonContent(button, state);
          }
          button.classList.remove("is-loading");
        }
      }

      if (nextIsUsd && typeof state.usd !== "number") {
        return;
      }

      if (!nextIsUsd && !state.usdRateData && typeof state.bynFallback !== "number") {
        return;
      }

      state.isUsd = nextIsUsd;
      animatePriceSwap(button, state);
    });
  }

  function getSlugFromUrl() {
    const url = new URL(window.location.href);

    const qsSlug = url.searchParams.get("slug");
    if (isFilled(qsSlug)) return qsSlug.trim();

    const parts = url.pathname.replace(/^\/+|\/+$/g, "").split("/");
    if (parts.length === 2 && (parts[0] === "objects" || parts[0] === "object")) return decodeURIComponent(parts[1]);

    return "";
  }

  async function fetchSingleObject(slug) {
    const res = await fetch(OBJECT_URL(slug), { cache: "no-store" });
    if (!res.ok) throw new Error(`Объект не найден: ${slug}`);
    return res.json();
  }

  async function fetchObjectsList() {
    const res = await fetch(LIST_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("Ошибка загрузки objects-list.json");
    return res.json();
  }

  function getObjectArea(obj) {
    const raw =
      obj.area ?? obj.areaTotal ?? obj.totalArea ?? obj.square ?? null;

    if (!raw) return null;

    const n = Number(
      String(raw)
        .replace(",", ".")
        .replace(/[^\d.]/g, ""),
    );
    return n > 0 ? n : null;
  }

  /* =====================================================
     JSON-LD SCHEMA (DYNAMIC)
  ===================================================== */
  function cleanObject(obj) {
    if (Array.isArray(obj)) {
      const cleanedArray = obj
        .map((item) => cleanObject(item))
        .filter(
          (item) =>
            item !== undefined &&
            item !== null &&
            !(typeof item === "string" && item.trim() === "") &&
            !(Array.isArray(item) && item.length === 0) &&
            !(typeof item === "object" && !Array.isArray(item) && Object.keys(item).length === 0)
        );
      return cleanedArray.length ? cleanedArray : undefined;
    }

    if (obj && typeof obj === "object") {
      const cleanedObj = Object.entries(obj).reduce((acc, [key, value]) => {
        const cleanedValue = cleanObject(value);
        if (
          cleanedValue !== undefined &&
          cleanedValue !== null &&
          !(typeof cleanedValue === "string" && cleanedValue.trim() === "") &&
          !(Array.isArray(cleanedValue) && cleanedValue.length === 0) &&
          !(typeof cleanedValue === "object" && !Array.isArray(cleanedValue) && Object.keys(cleanedValue).length === 0)
        ) {
          acc[key] = cleanedValue;
        }
        return acc;
      }, {});

      return Object.keys(cleanedObj).length ? cleanedObj : undefined;
    }

    if (typeof obj === "string") {
      const trimmed = obj.trim();
      return trimmed === "" ? undefined : trimmed;
    }

    return obj;
  }

  function toAbsoluteUrl(url) {
    if (!isFilled(url)) return null;
    return String(url).startsWith("http") ? String(url) : `https://turko.by${url}`;
  }

  function normalizeType(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/ё/g, "е")
      .trim();
  }

  function detectPropertySchemaType(obj) {
    const typeRaw = normalizeType(obj.type || obj.category || obj.objectCategory);

    if (typeRaw.includes("квартир")) {
      return { specificType: "Apartment", residenceType: "Residence" };
    }

    if (typeRaw.includes("дом") || typeRaw.includes("коттедж") || typeRaw.includes("таунхаус")) {
      return { specificType: "SingleFamilyResidence", residenceType: "House" };
    }

    if (
      typeRaw.includes("коммер") ||
      typeRaw.includes("офис") ||
      typeRaw.includes("склад") ||
      typeRaw.includes("бизн")
    ) {
      return { specificType: "CommercialProperty", residenceType: "Place" };
    }

    if (typeRaw.includes("участ")) {
      return { specificType: "Landform", residenceType: "Place" };
    }

    return { specificType: "Residence", residenceType: "Residence" };
  }

  function upsertObjectSchema(schema) {
    document
      .querySelectorAll('script[type="application/ld+json"][data-schema="object-detail"]')
      .forEach((node) => node.remove());

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-schema", "object-detail");
    script.textContent = JSON.stringify(schema, null, 2);
    document.head.appendChild(script);
  }

  function generateObjectSchema(obj) {
    if (!obj) return;

    const canonicalUrl = `https://turko.by/objects/${obj.slug}`;
    const pageUrl = window.location.href;
    const schemaPrice = getDisplayBynPrice(obj) || obj.priceBYN;
    const area = getObjectArea(obj);
    const lat = obj.location?.lat ?? obj.lat;
    const lng = obj.location?.lng ?? obj.lng;

    const images = (Array.isArray(obj.images) ? obj.images : [])
      .filter((src) => isFilled(src))
      .slice(0, 15)
      .map((src, index) => ({
        "@type": "ImageObject",
        contentUrl: toAbsoluteUrl(src),
        url: toAbsoluteUrl(src),
        position: index + 1,
      }));

    const { specificType, residenceType } = detectPropertySchemaType(obj);
    const priceValidUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const offer = {
      "@type": "Offer",
      "@id": `${canonicalUrl}#offer`,
      url: pageUrl,
      price: schemaPrice ? String(schemaPrice) : undefined,
      priceCurrency: "BYN",
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/UsedCondition",
      seller: {
        "@type": "RealEstateAgent",
        name: "Ольга Турко",
        url: "https://turko.by",
        telephone: "+375291416605",
        areaServed: "BY",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Лида",
          addressCountry: "BY",
        },
      },
      validFrom: obj.publishedAt || undefined,
      priceValidUntil,
    };

    const address = {
      "@type": "PostalAddress",
      streetAddress: obj.address,
      addressLocality: obj.city || "Лида",
      addressRegion: obj.district,
      addressCountry: "BY",
    };

    const place = {
      "@type": "Place",
      name: obj.title,
      address,
      geo:
        lat && lng
          ? {
              "@type": "GeoCoordinates",
              latitude: Number(lat),
              longitude: Number(lng),
            }
          : undefined,
    };

    const property = {
      "@type": specificType,
      "@id": `${canonicalUrl}#property`,
      name: obj.title,
      description: obj.description || obj.cardDescription,
      category: obj.type || obj.category || obj.objectCategory,
      additionalType: [residenceType, "Product"],
      url: pageUrl,
      image: images,
      additionalProperty: [
        obj.houseType
          ? {
              "@type": "PropertyValue",
              name: "Тип дома",
              value: obj.houseType,
            }
          : undefined,
        obj.layout
          ? {
              "@type": "PropertyValue",
              name: "Планировка",
              value: obj.layout,
            }
          : undefined,
        obj.renovation
          ? {
              "@type": "PropertyValue",
              name: "Ремонт",
              value: obj.renovation,
            }
          : undefined,
        obj.dealType
          ? {
              "@type": "PropertyValue",
              name: "Тип сделки",
              value: obj.dealType,
            }
          : undefined,
        obj.contractNumber
          ? {
              "@type": "PropertyValue",
              name: "Номер договора",
              value: obj.contractNumber,
            }
          : undefined,
      ],
      floorSize: area
        ? {
            "@type": "QuantitativeValue",
            value: area,
            unitCode: "MTK",
            unitText: "кв.м",
          }
        : undefined,
      numberOfRooms: obj.rooms ? Number(obj.rooms) : undefined,
      numberOfBathroomsTotal: obj.bathroom ? 1 : undefined,
      floorLevel: obj.floor ? Number(obj.floor) : undefined,
      numberOfFloors: obj.floorsTotal ? Number(obj.floorsTotal) : undefined,
      yearBuilt: obj.yearBuilt ? Number(obj.yearBuilt) : undefined,
      accommodationFloorPlan: obj.layout,
      address,
      geo: place.geo,
      containsPlace: place,
      offers: offer,
    };

    const offerCatalog = {
      "@type": "OfferCatalog",
      "@id": `${canonicalUrl}#catalog`,
      name: `Каталог предложения: ${obj.title}`,
      url: pageUrl,
      itemListElement: [
        {
          "@type": "Offer",
          "@id": `${canonicalUrl}#catalog-offer`,
          itemOffered: {
            "@id": `${canonicalUrl}#property`,
          },
          price: schemaPrice ? String(schemaPrice) : undefined,
          priceCurrency: "BYN",
          availability: "https://schema.org/InStock",
          url: pageUrl,
          seller: offer.seller,
        },
      ],
    };

    const listing = {
      "@type": "RealEstateListing",
      "@id": `${canonicalUrl}#listing`,
      name: obj.title,
      description: obj.cardDescription || obj.description,
      datePosted: obj.publishedAt || new Date().toISOString().split("T")[0],
      url: pageUrl,
      image: images,
      offers: offer,
      mainEntity: property,
      itemOffered: property,
      address,
      geo: place.geo,
      potentialAction: {
        "@type": "ViewAction",
        target: pageUrl,
      },
    };

    // BreadcrumbList JSON-LD is server-rendered in PHP (see object-detail.php)

    const payload = cleanObject({
      "@context": "https://schema.org",
      "@graph": [offerCatalog, property, offer, listing],
    });

    if (payload) {
      upsertObjectSchema(payload);
    }
  }

  /* =====================================================
     DYNAMIC PAGE META (og:*, description, canonical)
  ===================================================== */
  function upsertMetaTag({ attr, key, content }) {
    const selector = `meta[${attr}="${key}"]`;
    let tag = document.querySelector(selector);

    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute(attr, key);
      document.head.appendChild(tag);
    }

    tag.setAttribute("content", content);
  }

  function updatePageMeta(obj) {
    const AGENT_PHONE = "+375291809516";
    const title = `${obj.title} — Ольга Турко`;
    const firstImage = Array.isArray(obj.images) && obj.images.length
      ? (obj.images[0].startsWith("http") ? obj.images[0] : `https://turko.by${obj.images[0]}`)
      : "https://turko.by/images/main-slider/2.webp";

    const shortDescription = obj.metaDescription
      || obj.cardDescription
      || (obj.description ? obj.description.slice(0, 140).trimEnd() + "…" : "")
      || "Объект недвижимости в Лиде";

    const bynPrice = getDisplayBynPrice(obj);
    const priceText = typeof bynPrice === "number" ? `${formatPrice(bynPrice)} BYN` : "Цена по запросу";
    const desc = `${shortDescription}. Цена: ${priceText}. Телефон: ${AGENT_PHONE}`;
    const url = `https://turko.by/objects/${obj.slug}`;

    document.title = title;

    const metaEntries = [
      { attr: "name", key: "description", content: desc },

      { attr: "property", key: "og:type", content: "product" },
      { attr: "property", key: "og:title", content: title },
      { attr: "property", key: "og:description", content: desc },
      { attr: "property", key: "og:image", content: firstImage },
      { attr: "property", key: "og:image:alt", content: obj.title },
      { attr: "property", key: "og:url", content: url },
      { attr: "property", key: "og:site_name", content: "turko.by" },
      { attr: "property", key: "og:phone_number", content: AGENT_PHONE },
      { attr: "property", key: "product:price:amount", content: typeof bynPrice === "number" ? String(bynPrice) : "" },
      { attr: "property", key: "product:price:currency", content: "BYN" },

      { attr: "name", key: "twitter:card", content: "summary_large_image" },
      { attr: "name", key: "twitter:title", content: title },
      { attr: "name", key: "twitter:description", content: desc },
      { attr: "name", key: "twitter:image", content: firstImage },
      { attr: "name", key: "twitter:label1", content: "Цена" },
      { attr: "name", key: "twitter:data1", content: priceText },
      { attr: "name", key: "twitter:label2", content: "Телефон" },
      { attr: "name", key: "twitter:data2", content: AGENT_PHONE },
    ];

    metaEntries
      .filter((entry) => isFilled(entry.content))
      .forEach(upsertMetaTag);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", url);
  }

  /* =====================================================
     RENDER BLOCKS
  ===================================================== */
function renderTopTitle(obj) {
  const title = obj?.title || "Детали объекта";

  // <title> в head
  document.title = `${title} — Ольга Турко`;

  // PAGE INTRO TITLE
  const h = document.querySelector("[data-page-title]");

  if (h) {
    h.textContent = title;
  }
}


function renderHeroBlock(obj) {
  const imagesWrap = document.querySelector("[data-hero-images]");
  if (!imagesWrap) return;

  const imgs = Array.isArray(obj.images) ? obj.images.slice(0, 4) : [];

const desc = document.querySelector("[data-hero-description]");

if (desc && obj.description) {
  const text = obj.description.trim();


  const paragraphs = text
    .split(/\n\s*\n|\.\s*\n/)
    .map(p => p.trim())
    .filter(Boolean);

 
  const highlightNumbers = (str) =>
    str.replace(
      /(\d+[.,]?\d*\s?(м²|м2|кв\.м|кв\. м)?|\d+-этажного|\d+\s?этаж|\d+\s?комнат)/gi,
      "<strong>$1</strong>"
    );

  desc.innerHTML = paragraphs
    .map(p => `<p>${highlightNumbers(p)}</p>`)
    .join("");
}
  imagesWrap.innerHTML = imgs
    .map(
      (src) => `
      
        <div class="object-hero-image">
          <img loading="lazy" decoding="async" src="${src}" alt="${obj.title}">
        </div>
   
    `,
    )
    .join("");



    
  // META
  const title = document.querySelector("[data-hero-title]");
  const location = document.querySelector("[data-hero-location]");
  const published = document.querySelector("[data-published]");
  const dealType = document.querySelector("[data-deal-type]");
  const featured = document.querySelector("[data-featured]");

  if (title) title.textContent = obj.title || "";

  if (location)
    location.textContent = [obj.city, obj.address].filter(Boolean).join(", ");

  if (published) {
    published.textContent = obj.publishedAt
      ? new Date(obj.publishedAt).toLocaleDateString("ru-RU")
      : "";
  }

if (dealType) {
  const isSold = obj?.status?.type === "sold";

  if (isSold) {
    const soldDate = obj?.status?.date;
    const now = Date.now();

    if (soldDate) {
      const soldTime = new Date(soldDate).getTime();
      const diffDays = (now - soldTime) / (1000 * 60 * 60 * 24);

      // показываем "Продан" только 7 дней
      if (diffDays <= 7) {
        dealType.textContent = "Продано";
      } else {
        dealType.textContent = "Продажа";
      }
    } else {
      dealType.textContent = "Продано";
    }

  } else {
    dealType.textContent = obj.dealType || "Продажа";
  }
}

  if (featured && obj.recommended) {
    featured.hidden = false;
  }
}


function getAreaTotal(obj) {
  return obj.areaTotal ?? obj.totalArea ?? null;
}

function getAreaLiving(obj) {
  return obj.areaLiving ?? obj.livingArea ?? null;
}

function getAreaKitchen(obj) {
  return obj.areaKitchen ?? obj.kitchenArea ?? null;
}

function renderObjectDetails(obj) {
  const wrap = document.querySelector("[data-object-details]");
  const priceWrap = document.querySelector("[data-object-price]");
  if (!wrap || !priceWrap) return;

  const isFlat = String(obj.type || "").toLowerCase().includes("квартир");

  /* PRICE */
  if (typeof obj.priceBYN === "number" || typeof obj.priceUSD === "number") {
    const displayBynPrice = getDisplayBynPrice(obj);
    const initialPriceValue =
      typeof obj.priceUSD === "number"
        ? "Загрузка..."
        : typeof displayBynPrice === "number"
        ? `${formatPrice(displayBynPrice)} BYN`
        : "";

    priceWrap.innerHTML = `
      <button
        type="button"
        class="object-price-toggle"
        data-price-toggle
        aria-pressed="false"
      >
        <span class="object-price-label" data-price-label>Цена</span>
        <span class="object-price-value" data-price-value>
          ${initialPriceValue}
        </span>
      </button>
    `;

    const priceButton = priceWrap.querySelector("[data-price-toggle]");
    if (priceButton) {
      setupPriceToggle(priceButton, obj);
    }
  }

  const has = (v) =>
    v !== null && v !== undefined && String(v).trim() !== "";

  const make = (icon, label, value, group) =>
    has(value) ? { icon, label, value, group } : null;

  let items = [];

  if (isFlat) {
    items.push(
      make("fa-house", "Тип объекта", obj.type, "Основное"),
      make("fa-door-open", "Комнат", obj.rooms, "Основное"),
      make(
        "fa-layer-group",
        "Этаж",
        obj.floor && obj.floorsTotal
          ? `${obj.floor} из ${obj.floorsTotal}`
          : obj.floor,
        "Основное"
      ),
      make("fa-expand", "Общая площадь", obj.areaTotal && `${obj.areaTotal} м²`, "Площади"),
      make("fa-couch", "Жилая площадь", obj.areaLiving && `${obj.areaLiving} м²`, "Площади"),
      make("fa-ruler-combined", "Кухня", obj.areaKitchen && `${obj.areaKitchen} м²`, "Площади"),
      make("fa-bath", "Санузел", obj.bathroom, "Площади"),
      make("fa-calendar", "Год постройки", obj.yearBuilt, "Основное")
    );
  } else {
    items.push(
      make("fa-house", "Тип объекта", obj.type, "Основное"),
      make("fa-expand", "Площадь дома", obj.areaTotal && `${obj.areaTotal} м²`, "Площади"),
      make("fa-couch", "Жилая площадь", obj.areaLiving && `${obj.areaLiving} м²`, "Площади"),
      make("fa-tree", "Участок", obj.areaPlot && `${obj.areaPlot} соток`, "Площади"),
      make("fa-fire", "Отопление", obj.heating, "Коммуникации"),
      make("fa-faucet", "Вода", obj.water, "Коммуникации"),
      make("fa-toilet", "Канализация", obj.sewerage, "Коммуникации"),
      make("fa-calendar", "Год постройки", obj.yearBuilt, "Основное")
    );
  }

  items = items.filter(Boolean);

  const groups = {};
  items.forEach((i) => {
    if (!groups[i.group]) groups[i.group] = [];
    groups[i.group].push(i);
  });

  wrap.innerHTML = Object.entries(groups)
    .map(
      ([group, rows]) => `
        <div class="object-details-group">
          <h5 class="object-details-group-title">${group}</h5>
          <div class="object-details-list">
            ${rows
              .map(
                (r) => `
                <div class="object-detail-row">
                  <div class="object-detail-label">
                    <i class="fa-solid ${r.icon}"></i>
                    ${r.label}
                  </div>
                  <div class="object-detail-value">${r.value}</div>
                </div>
              `
              )
              .join("")}
          </div>
        </div>
      `
    )
    .join("");
}



  function renderMeta(obj) {
    const meta = qs("[data-meta-list]");
    if (!meta) return;

    const rows = [];

    if (obj.type) rows.push(["Тип объекта", obj.type]);
    if (obj.city || obj.address)
      rows.push(["Локация", safeJoin([obj.city, obj.address], ", ")]);
    if (obj.rooms) rows.push(["Комнат", obj.rooms]);
    if (obj.areaTotal) rows.push(["Площадь", `${obj.areaTotal} м²`]);
    if (obj.yearBuilt) rows.push(["Год", obj.yearBuilt]);

    const displayPrice = getDisplayBynPrice(obj);
    if (typeof displayPrice === "number")
      rows.push(["Цена", `${formatPrice(displayPrice)} BYN`]);

    if (!rows.length) return;

    meta.innerHTML = rows
      .map(
        ([l, v]) => `
        <li style="display:flex;justify-content:space-between">
          <span style="font-weight:700;color:#155945">${l}</span>
          <span>${v}</span>
        </li>`,
      )
      .join("");
  }

  // Кэш для нередко меняющихся данных объекта
let _cachedObjectPrices = {};
let _cachedObjectPriceKey = null;

function getCachedObjectPrice(obj) {
  const key = obj?.slug;
  if (_cachedObjectPriceKey === key && _cachedObjectPrices[key]) {
    return _cachedObjectPrices[key];
  }
  _cachedObjectPriceKey = key;
  
  const displayPrice = getDisplayBynPrice(obj);
  if (typeof displayPrice === "number" && displayPrice > 0) {
    _cachedObjectPrices[key] = displayPrice;
    return displayPrice;
  }
  
  _cachedObjectPrices[key] = null;
  return null;
}

function renderRightText(obj) {
    const titleEl = qs("[data-object-title]");
    const subEl = qs("[data-object-subtitle]");
    const descEl = qs("[data-object-description]");

    if (titleEl) titleEl.textContent = obj.title;

    const typeLower = String(obj.type || "").toLowerCase();

    if (subEl) {
      const line =
        typeLower === "дом"
          ? safeJoin(
              [
                obj.areaPlot && `Участок ${obj.areaPlot} соток`,
                obj.water && `Вода: ${obj.water}`,
                obj.heating && `Отопление: ${obj.heating}`,
              ],
              " • ",
            )
          : (() => {
              const cachedPrice = getCachedObjectPrice(obj);
              return safeJoin(
                [
                  obj.type,
                  obj.areaTotal && `${obj.areaTotal} м²`,
                  cachedPrice && `${formatPrice(cachedPrice)} BYN`,
                ],
                " • ",
              );
            })();
      if (Array.isArray(obj.features) && obj.features.length) {
        blocks.push(`
          <p><b>Преимущества:</b></p>
          <ul>${obj.features.map((f) => `<li>${f}</li>`).join("")}</ul>
        `);
      }

      blocks.push(`
        <p style="margin-top:14px">
          📍 Агентство недвижимости «ГермесГрупп»<br>
          г. Лида, б-р Князя Гедимина, 12, пом. 9.
        </p>
      `);

      descEl.innerHTML = blocks.join("");
    }
  }

  function renderNotFound(slug) {
    renderTopTitle({ title: "Объект не найден" });
    const box = qs(".project-detail-containt-2 .bg-white");
    if (!box) return;

    box.innerHTML = `
      <h4>Объект не найден</h4>
      <p>slug: <b>${slug || "—"}</b></p>
    `;
  }


function renderSidebarFooter(obj) {
  const box = document.querySelector("[data-sidebar-footer]");
  if (!box) return;

  const contract = obj.contractNumber
    ? `<div class="sidebar-contract">${obj.contractNumber}</div>`
    : "";

  box.innerHTML = `
    <div class="sidebar-agency">
      <div class="sidebar-agency-title">
        📍 Агентство недвижимости «ГермесГрупп»
      </div>
      <div class="sidebar-agency-address">
        г. Лида, б-р Князя Гедимина, дом 12, помещение 9.
      </div>
      ${contract}
    </div>
  `;
}


  /* =====================================================
   SIMILAR OBJECTS (Похожие варианты)
===================================================== */

  function getObjectPrice(obj) {
    return getCachedObjectPrice(obj);
  }

  function normalizeText(v) {
    return String(v || "")
      .trim()
      .toLowerCase();
  }

  function scoreSimilar(current, candidate) {
    let score = 0;

    // Тип объекта — самый важный
    if (normalizeText(current.type) !== normalizeText(candidate.type)) {
      score += 100000;
    }

    // Город
    if (normalizeText(current.city) !== normalizeText(candidate.city)) {
      score += 10000;
    }

    // Цена
    const p1 = getObjectPrice(current);
    const p2 = getObjectPrice(candidate);

    if (typeof p1 === "number" && typeof p2 === "number") {
      score += Math.abs(p1 - p2);
    } else {
      score += 5000;
    }

    return score;
  }

  function isSoldObject(obj) {
    return (
      typeof obj?.status?.type === "string" &&
      obj.status.type.toLowerCase() === "sold"
    );
  }

  let _cachedSimilarObjects = null;
  let _cachedSimilarKey = null;
  
  function pickSimilarObjects(currentObj, allObjects, limit = 6) {
    const cacheKey = currentObj?.slug;
    
    if (_cachedSimilarKey === cacheKey && _cachedSimilarObjects) {
      return _cachedSimilarObjects;
    }
    
    const result = allObjects
      .filter(
        (o) => o && o.slug && o.slug !== currentObj.slug && !isSoldObject(o)
      )
      .map((o) => ({ obj: o, score: scoreSimilar(currentObj, o) }))
      .sort((a, b) => a.score - b.score)
      .slice(0, limit)
      .map((x) => x.obj);
    
    _cachedSimilarKey = cacheKey;
    _cachedSimilarObjects = result;
    return result;
  }

  function renderSimilarItem(obj) {
    const img =
      Array.isArray(obj.images) && obj.images[0]
        ? obj.images[0]
        : "/images/objects/pic1.webp";

    const title = obj.title || "Объект недвижимости";
    const link = `/objects/${encodeURIComponent(obj.slug)}`;

    return `
    <div class="item">
      <div class="project-mas m-a30">
      
        <div class="image-effect-one">
          <img loading="lazy" decoding="async" src="${img}" alt="${title}">
        </div>
        <div class="project-info p-t20">
          <h4 class="sx-tilte m-t0">
            <a href="${link}">${title}</a>
          </h4>
          <a href="${link}">
            <i class="link-plus bg-primary"></i>
          </a>
        </div>
      </div>
    </div>
  `;
  }

  function renderSimilarSlider(currentObj, allObjects) {
    const carousel = document.querySelector("#similarCarousel");
    if (!carousel) return;

    const similar = pickSimilarObjects(currentObj, allObjects, 6);

    if (!similar.length) {
      carousel.innerHTML = "";
      return;
    }

    carousel.innerHTML = similar.map(renderSimilarItem).join("");
  }


/* =====================================================
   FAVORITES (localStorage)
===================================================== */

const FAVORITES_KEY = "favoriteObjects";

function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
  } catch {
    return [];
  }
}

function saveFavorites(list) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
}

function isFavorite(slug) {
  return getFavorites().includes(slug);
}

function toggleFavorite(slug) {
  const favs = getFavorites();
  const idx = favs.indexOf(slug);

  if (idx >= 0) {
    favs.splice(idx, 1);
  } else {
    favs.push(slug);
  }

  saveFavorites(favs);
  return favs.includes(slug);
}



// renderHeroMeta удаления — логика встроена в renderHeroBlock


function renderSidebarTitle(obj) {
  const title = document.querySelector("[data-sidebar-title]");
  if (title) title.textContent = obj.title || "";
}


function initSidebarSlider(currentObj, allObjects) {
  const track = document.querySelector("[data-sidebar-track]");
  if (!track) return;

  const items = pickSimilarObjects(currentObj, allObjects, 6);
  if (!items.length) return;

  let index = 0;
  let autoTimer = null;

  function renderSlides() {
    track.innerHTML = items
      .map((obj) => {
        const img =
          Array.isArray(obj.images) && obj.images[0]
            ? obj.images[0]
            : "/images/objects/pic1.webp";

        const displayPrice = getDisplayBynPrice(obj);
        const price =
          typeof displayPrice === "number"
            ? `${displayPrice.toLocaleString("ru-RU")} BYN`
            : "";

        return `
          <a href="/objects/${obj.slug}" class="sidebar-slide">
            <div class="sidebar-slide-image">
              <img src="${img}" alt="${obj.title}">
            </div>

            <div class="sidebar-slide-content">
              <h6>${obj.title}</h6>

              <div class="sidebar-slide-location">
                <i class="fa-solid fa-location-dot"></i>
                ${[obj.city, obj.address].filter(Boolean).join(", ")}
              </div>

              <div class="sidebar-slide-price">${price}</div>
            </div>
          </a>
        `;
      })
      .join("");
  }

  function updatePosition() {
    track.style.transform = `translateX(-${index * 100}%)`;
  }

  function next() {
    index = (index + 1) % items.length;
    updatePosition();
  }

  function prev() {
    index = (index - 1 + items.length) % items.length;
    updatePosition();
  }

  function startAuto() {
    stopAuto();
    autoTimer = setInterval(next, 5000);
  }

  function stopAuto() {
    if (autoTimer) clearInterval(autoTimer);
  }
  
  const handleMouseEnter = stopAuto;
  const handleMouseLeave = startAuto;
  const handleTouchStart = (e) => {
    const startX = e.touches[0].clientX;
    stopAuto();
    
    const handleTouchEnd = (e) => {
      const diff = e.changedTouches[0].clientX - startX;
      if (Math.abs(diff) > 50) {
        diff < 0 ? next() : prev();
      }
      startAuto();
      track.removeEventListener("touchend", handleTouchEnd);
    };
    
    track.addEventListener("touchend", handleTouchEnd, { once: true });
  };

  /* INIT */
  renderSlides();
  updatePosition();
  startAuto();

  /* HOVER PAUSE */
  track.addEventListener("mouseenter", handleMouseEnter);
  track.addEventListener("mouseleave", handleMouseLeave);

  /* SWIPE */
  track.addEventListener("touchstart", handleTouchStart);
  
  /* CLEANUP */
  const cleanup = () => {
    stopAuto();
    track.removeEventListener("mouseenter", handleMouseEnter);
    track.removeEventListener("mouseleave", handleMouseLeave);
    track.removeEventListener("touchstart", handleTouchStart);
  };
  
  window._sidebarSliderCleanup = cleanup;
}



function animateAgentCardOnce() {
  const card = document.querySelector(".agent-card");
  if (!card) return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        card.classList.add("is-visible");
        observer.disconnect(); // ⬅️ только один раз
      }
    },
    {
      threshold: 0.3,
    },
  );

  observer.observe(card);
}


function renderAmenities(obj) {
  const wrap = document.querySelector("[data-object-amenities]");
  const list = document.querySelector("[data-amenities-list]");

  if (!wrap || !list) return;

  if (!Array.isArray(obj.features) || !obj.features.length) {
    wrap.hidden = true;
    return;
  }

  wrap.hidden = false;

  list.innerHTML = obj.features
    .map(
      (item) => `
      <div class="amenity-item">
        <span class="amenity-icon">
          <i class="fa-solid fa-check"></i>
        </span>
        <span class="amenity-text">${item}</span>
      </div>
    `,
    )
    .join("");
}

function initRevealBlocks() {
  const blocks = document.querySelectorAll(".reveal");
  if (!blocks.length) return;

  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  blocks.forEach(block => observer.observe(block));
  
  // Очистка
  window._revealBlocksObserver = observer;
}

// initRevealBlocks вызывается в init(), убрал дублирование DOMContentLoaded







function initCustomSelectUI(nativeSelect) {
  if (!nativeSelect || nativeSelect.dataset.customReady === "1") return;

  const wrapper = document.createElement("div");
  wrapper.className = "filter-select-ui";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "filter-select-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");

  const triggerText = document.createElement("span");
  triggerText.className = "filter-select-trigger-text";

  const menu = document.createElement("div");
  menu.className = "filter-select-menu";
  menu.setAttribute("role", "listbox");

  wrapper.appendChild(trigger);
  trigger.appendChild(triggerText);
  wrapper.appendChild(menu);

  nativeSelect.classList.add("is-customized-select");
  nativeSelect.dataset.customReady = "1";
  nativeSelect.insertAdjacentElement("afterend", wrapper);

  const closeAll = () => {
    document.querySelectorAll(".filter-select-ui.is-open").forEach((el) => {
      if (el !== wrapper) {
        el.classList.remove("is-open");
        el
          .querySelector(".filter-select-trigger")
          ?.setAttribute("aria-expanded", "false");
      }
    });
  };

  function buildOptions() {
    menu.innerHTML = "";

    Array.from(nativeSelect.options).forEach((option) => {
      const optionBtn = document.createElement("button");
      optionBtn.type = "button";
      optionBtn.className = "filter-select-option";
      optionBtn.textContent = option.textContent;
      optionBtn.dataset.value = option.value;
      optionBtn.disabled = option.disabled;

      optionBtn.addEventListener("click", () => {
        if (nativeSelect.disabled || optionBtn.disabled) return;

        nativeSelect.value = optionBtn.dataset.value;
        nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));

        syncFromNative();
        wrapper.classList.remove("is-open");
        trigger.setAttribute("aria-expanded", "false");
      });

      menu.appendChild(optionBtn);
    });
  }

  function syncFromNative() {
    const selected = nativeSelect.options[nativeSelect.selectedIndex];
    triggerText.textContent = selected ? selected.textContent : "";

    menu.querySelectorAll(".filter-select-option").forEach((btn) => {
      btn.classList.toggle("is-selected", btn.dataset.value === nativeSelect.value);
    });

    wrapper.classList.toggle("is-disabled", nativeSelect.disabled);
    trigger.disabled = nativeSelect.disabled;
  }

  trigger.addEventListener("click", () => {
    if (nativeSelect.disabled) return;

    const willOpen = !wrapper.classList.contains("is-open");
    closeAll();
    wrapper.classList.toggle("is-open", willOpen);
    trigger.setAttribute("aria-expanded", willOpen ? "true" : "false");
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".filter-select-ui")) {
      wrapper.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      wrapper.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
    }
  });

  nativeSelect.addEventListener("change", syncFromNative);

  buildOptions();
  syncFromNative();
}

window.initCustomSelectUI = initCustomSelectUI;

/* =====================================================
   ОБЩИЙ ЛЕНИВЫЙ ЗАГРУЗЧИК СКРИПТОВ
   Используется для maplibre, ипотечного калькулятора,
   формы записи на просмотр и т.п. Кеширует промис, чтобы
   повторные вызовы не качали файл дважды.
===================================================== */
const _lazyScriptPromises = new Map();
function loadScriptOnce(url) {
  if (_lazyScriptPromises.has(url)) return _lazyScriptPromises.get(url);

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

  _lazyScriptPromises.set(url, promise);
  return promise;
}

/* =====================================================
   ЛЕНИВАЯ ЗАГРУЗКА ИПОТЕЧНОГО КАЛЬКУЛЯТОРА
   mortgage-programs.js + mortgage-calculator.js (~19 КБ)
   подгружаются только когда блок калькулятора
   попадает в зону видимости.
===================================================== */
function initMortgageCalculator(obj) {
  const mortgageEl = document.querySelector("[data-mortgage-calculator]");
  if (!mortgageEl) return;

  const startLoad = function () {
    loadScriptOnce("/js/mortgage-programs.js?v=20260425-1")
      .then(function () { return loadScriptOnce("/js/mortgage-calculator.js"); })
      .then(function () {
        if (typeof window.initMultiBankMortgageCalculator === "function") {
          window.initMultiBankMortgageCalculator(obj);
        }
      })
      .catch(function (err) {
        console.error("Ошибка загрузки ипотечного калькулятора:", err);
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

  io.observe(mortgageEl);
}

/* =====================================================
   ЛЕНИВАЯ ЗАГРУЗКА ФОРМЫ ЗАПИСИ НА ПРОСМОТР
   viewing-booking.js (~5 КБ) подгружается только при
   первом клике на кнопку «Записаться на просмотр».
===================================================== */
function initViewingBookingLazyLoad() {
  const buttons = document.querySelectorAll("[data-open-booking-modal]");
  if (!buttons.length) return;

  function handleFirstClick(event) {
    event.preventDefault();
    event.stopPropagation();
    const button = event.currentTarget;

    buttons.forEach(function (b) {
      b.removeEventListener("click", handleFirstClick);
    });

    loadScriptOnce("/js/viewing-booking.js")
      .then(function () {
        button.click();
      })
      .catch(function (err) {
        console.error("Ошибка загрузки формы записи:", err);
      });
  }

  buttons.forEach(function (b) {
    b.addEventListener("click", handleFirstClick);
  });
}


/* =====================================================
   ЛЕНИВАЯ ЗАГРУЗКА MAPLIBRE-GL
   Библиотека (~745 КБ JS + 63 КБ CSS) подгружается только
   когда блок карты появляется в зоне видимости — экономит
   трафик пользователям, которые не доскроллили до карты.
===================================================== */
let _maplibrePromise = null;
function loadMaplibre() {
  if (_maplibrePromise) return _maplibrePromise;

  _maplibrePromise = new Promise((resolve, reject) => {
    if (window.maplibregl) {
      resolve(window.maplibregl);
      return;
    }

    if (!document.querySelector('link[data-maplibre-css]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/libs/maplibre/maplibre-gl.css';
      link.setAttribute('data-maplibre-css', '');
      document.head.appendChild(link);
    }

    const existing = document.querySelector('script[data-maplibre-js]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.maplibregl));
      existing.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.src = '/libs/maplibre/maplibre-gl.js';
    script.async = true;
    script.setAttribute('data-maplibre-js', '');
    script.onload = () => resolve(window.maplibregl);
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return _maplibrePromise;
}

function createObjectMap(obj, mapEl) {
  const { lat, lng } = obj.location;

  const map = new maplibregl.Map({
    container: mapEl,
    style: `https://api.maptiler.com/maps/basic-v2/style.json?key=${MAPTILER_KEY}`,
    center: [lng, lat],
    zoom: 15,
    attributionControl: true
  });

  map.on("load", () => {
    const layers = map.getStyle().layers;
    layers.forEach(layer => {
      if (
        layer.type === "symbol" &&
        layer.layout &&
        layer.layout["text-field"]
      ) {
        map.setLayoutProperty(layer.id, "text-field", [
          "coalesce",
          ["get", "name:ru"],
          ["get", "name"]
        ]);
      }
    });
  });

  map.addControl(new maplibregl.NavigationControl(), "top-right");
  map.scrollZoom.disable();
  map.dragRotate.disable();
  map.touchZoomRotate.disableRotation();

  new maplibregl.Marker({
    color: "var(--color-primary)",
    scale: 1.1
  })
    .setLngLat([lng, lat])
    .addTo(map);

  // Сохраняем инстанс для возможной очистки при переходе
  window._objectMap = map;
}

function initObjectMap(obj) {
  if (!obj || !obj.location || !obj.location.lat || !obj.location.lng) {
    console.warn("Координаты объекта не найдены");
    return;
  }

  const mapEl = document.getElementById("objectMap");
  if (!mapEl) {
    console.warn("Контейнер #objectMap не найден");
    return;
  }

  const startMap = () => {
    loadMaplibre()
      .then(() => createObjectMap(obj, mapEl))
      .catch((err) => console.error("Ошибка загрузки maplibre-gl:", err));
  };

  // Если IntersectionObserver недоступен — грузим сразу (старые браузеры)
  if (typeof IntersectionObserver === "undefined") {
    startMap();
    return;
  }

  const io = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        observer.disconnect();
        startMap();
      }
    });
  }, { rootMargin: "200px 0px" });

  io.observe(mapEl);
}



  /* =====================================================
     CLEANUP (для переходов между страницами)
  ===================================================== */
  function cleanupResources() {
    // Очистка карты
    if (window._objectMap) {
      window._objectMap.remove();
      window._objectMap = null;
    }

    // Очистка share block listeners
    if (window._shareAbortController) {
      window._shareAbortController.abort();
      window._shareAbortController = null;
    }

    const shareBlock = document.getElementById("object-share-block");
    if (shareBlock) {
      shareBlock.dataset.bound = "0";
    }
    
    // Очистка слайдера сайдбара
    if (window._sidebarSliderCleanup) {
      window._sidebarSliderCleanup();
      window._sidebarSliderCleanup = null;
    }
    
    // Очистка IntersectionObserver'ов
    if (window._agentCardObserver) {
      window._agentCardObserver.disconnect();
      window._agentCardObserver = null;
    }
    
    if (window._revealBlocksObserver) {
      window._revealBlocksObserver.disconnect();
      window._revealBlocksObserver = null;
    }
    
    // Очистка кэша
    _cachedObjectPrices = {};
    _cachedObjectPriceKey = null;
    _cachedSimilarObjects = null;
    _cachedSimilarKey = null;
  }
  
  window._cleanupObjectDetail = cleanupResources;

  // bfcache: браузер «замораживает» страницу вместо выгрузки —
  // cleanupResources должна сработать до заморозки
  window.addEventListener("pagehide", cleanupResources);

  /* =====================================================
     INIT
  ===================================================== */
  let _initCompleted = false;

  /* =====================================================
     SHARE BLOCK
  ===================================================== */
  function initShareBlock(obj) {
    const block = document.getElementById("object-share-block");
    if (!block) return;

    const pageUrl = `https://turko.by/objects/${obj.slug}`;
    const title = obj.title || "Объект недвижимости в Лиде";
    const shareText = `${title} — ${pageUrl}`;

    const viberBtn = document.getElementById("share-viber");
    if (viberBtn) {
      viberBtn.href = `viber://forward?text=${encodeURIComponent(shareText)}`;
    }

    const tgBtn = document.getElementById("share-telegram");
    if (tgBtn) {
      tgBtn.href = `https://t.me/share/url?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(title)}`;
    }

    if (block.dataset.bound === "1") {
      block.style.display = "";
      return;
    }

    block.dataset.bound = "1";

    if (window._shareAbortController) {
      window._shareAbortController.abort();
    }
    const shareAbortController = new AbortController();
    window._shareAbortController = shareAbortController;

    const copyBtn = document.getElementById("share-copy");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(pageUrl).then(() => {
          const svgIcon = copyBtn.querySelector("svg");
          if (svgIcon) svgIcon.style.display = "none";
          const checkMark = document.createElement("span");
          checkMark.textContent = "✓";
          checkMark.style.cssText = "font-size:15px;line-height:1;flex-shrink:0";
          checkMark.className = "share-check-tmp";
          copyBtn.insertBefore(checkMark, copyBtn.firstChild);
          copyBtn.classList.add("copied");
          const textNode = Array.from(copyBtn.childNodes).find(n => n.nodeType === 3 && n.textContent.trim());
          if (textNode) textNode.textContent = " Скопировано!";
          setTimeout(() => {
            copyBtn.classList.remove("copied");
            if (svgIcon) svgIcon.style.display = "";
            const tmp = copyBtn.querySelector(".share-check-tmp");
            if (tmp) tmp.remove();
            if (textNode) textNode.textContent = " Скопировать";
          }, 2200);
        }).catch(() => {
          const ta = document.createElement("textarea");
          ta.value = pageUrl;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
        });
      }, { signal: shareAbortController.signal });
    }

    const qrBtn = document.getElementById("share-qr");
    const qrModal = document.getElementById("share-qr-modal");
    const qrImg = document.getElementById("share-qr-img");
    const qrUrlEl = document.getElementById("share-qr-url");
    const qrClose = document.getElementById("share-qr-close");

    if (qrBtn && qrModal && qrImg) {
      qrBtn.addEventListener("click", () => {
        const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=10&data=${encodeURIComponent(pageUrl)}`;
        qrImg.src = qrSrc;
        if (qrUrlEl) qrUrlEl.textContent = pageUrl;
        qrModal.classList.add("active");
        document.body.style.overflow = "hidden";
      }, { signal: shareAbortController.signal });

      const closeQr = () => {
        qrModal.classList.remove("active");
        document.body.style.overflow = "";
      };

      if (qrClose) qrClose.addEventListener("click", closeQr, { signal: shareAbortController.signal });
      qrModal.addEventListener("click", (e) => { if (e.target === qrModal) closeQr(); }, { signal: shareAbortController.signal });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape" && qrModal.classList.contains("active")) closeQr(); }, { signal: shareAbortController.signal });
    }

    block.style.display = "";
  }

  async function init() {
    if (_initCompleted) return;
    _initCompleted = true;

    try {
    let slug = getSlugFromUrl();
    let listObjects;

    /* =========================
       DEBUG MODE (localhost, slug не задан)
    ========================= */
    if (!isFilled(slug)) {
      const isLocal =
        location.hostname === "localhost" ||
        location.hostname === "127.0.0.1";

      if (isLocal) {
        console.warn("DEBUG MODE: slug не найден, берём первый объект из списка");
        listObjects = await fetchObjectsList();
        if (!Array.isArray(listObjects) || !listObjects.length) {
          renderNotFound(slug);
          return;
        }
        slug = listObjects[0].slug;
      }
    }

    if (!isFilled(slug)) {
      renderNotFound(slug);
      return;
    }

    /* =========================
       ПАРАЛЛЕЛЬНАЯ ЗАГРУЗКА
    ========================= */
    const [obj, fetchedList] = await Promise.all([
      fetchSingleObject(slug),
      listObjects ? Promise.resolve(listObjects) : fetchObjectsList(),
    ]);

    listObjects = Array.isArray(fetchedList) ? fetchedList : (listObjects || []);

    /* =========================
       LIVE PRICES
    ========================= */
    let enrichedObj = obj;
    if (typeof window.RealterPrice?.enrichObjectsWithLivePrices === "function") {
      const result = await window.RealterPrice.enrichObjectsWithLivePrices([obj]);
      enrichedObj = result[0] || obj;
    }

    /* =========================
       RENDER
    ========================= */
    renderTopTitle(enrichedObj);
    updatePageMeta(enrichedObj);
    renderHeroBlock(enrichedObj);
    renderMeta(enrichedObj);
    renderRightText(enrichedObj);
    renderSidebarTitle(enrichedObj);
    renderObjectDetails(enrichedObj);
    renderSidebarFooter(enrichedObj);
    initSidebarSlider(enrichedObj, listObjects);
    renderSimilarSlider(enrichedObj, listObjects);
    animateAgentCardOnce();
    renderAmenities(enrichedObj);
    generateObjectSchema(enrichedObj);
    initObjectMap(enrichedObj);
    initMortgageCalculator(enrichedObj);
    initShareBlock(enrichedObj);
    initRevealBlocks();

  } catch (e) {
    console.error("INIT ERROR:", e);
    renderNotFound(getSlugFromUrl());
  }
}


  document.addEventListener("DOMContentLoaded", function () {
    initViewingBookingLazyLoad();
    init();
  });
})();
