"use strict";

/* ======================================================
   STATE
====================================================== */
let objects = [];
let isDirty = false;
let currentFilter = "all";
let statsFilters = {
  rooms: null,
  city: null,
  priceRange: null,
};
let selectedDate = null;
let objectsListEl;
let currentSort = "new";

// ===============================
// NUMERIC HELPERS
// ===============================
function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function getObjectPriceByn(obj) {
  if (typeof window.RealterPrice?.getLiveBynPriceSync === "function") {
    const livePrice = window.RealterPrice.getLiveBynPriceSync(obj);
    if (typeof livePrice === "number" && livePrice > 0) {
      return livePrice;
    }
  }

  if (typeof obj?.priceBYN === "number" && obj.priceBYN > 0) {
    return obj.priceBYN;
  }

  return null;
}

async function syncObjectsWithLivePrices(list) {
  if (typeof window.RealterPrice?.enrichObjectsWithLivePrices !== "function") {
    return list;
  }

  return window.RealterPrice.enrichObjectsWithLivePrices(list);
}

const METRICS_INFO = {
  price: {
    title: "Цена за м²",
    html: `
   <p><strong>Что это:</strong><br>
Стоимость одного квадратного метра конкретного объекта недвижимости.</p>

<p><strong>Базовая формула:</strong></p>
<ul>
  <li>Цена объекта / Общая площадь</li>
</ul>

<p><strong>Как определяется “рынок”:</strong></p>
<ul>
  <li>Берутся <b>аналогичные объекты</b> из текущего портфеля</li>
  <li>Учитываются:
    <ul>
      <li>тип объекта (квартира / дом)</li>
      <li>город</li>
      <li>количество комнат (для квартир)</li>
    </ul>
  </li>
  <li>Проданные объекты не участвуют в расчёте</li>
</ul>

<p><strong>Очистка данных:</strong></p>
<ul>
  <li>Из расчёта убираются аномально дешёвые и дорогие варианты</li>
  <li>Используется усреднённая рыночная цена, а не фиксированная цифра</li>
</ul>

<p><strong>Корректировки:</strong></p>
<ul>
  <li>Цена рынка автоматически корректируется по площади</li>
  <li>Небольшие квартиры допускают более высокую цену за м²</li>
  <li>Большие объекты — более низкую</li>
</ul>

<p><strong>Как интерпретировать отклонение:</strong></p>
<ul>
  <li><b>−7% и ниже</b> — цена заметно ниже рынка, выгодное предложение</li>
  <li><b>−7% … +7%</b> — объект в рыночном диапазоне</li>
  <li><b>+7% и выше</b> — цена выше рынка, возможен торг</li>
</ul>

<p class="metric-note">
Значение рассчитывается автоматически и обновляется при изменении портфеля.
</p>
    `,
  },

  liquidity: {
    title: "Индекс ликвидности",
    html: `
     <p><strong>Что это:</strong><br>
Индекс ликвидности показывает, насколько быстро и без существенного торга объект может быть продан на текущем рынке.</p>

<p><strong>Как формируется индекс:</strong></p>
<ul>
  <li>Ликвидность рассчитывается по нескольким независимым факторам</li>
  <li>Каждый фактор оценивается отдельно и вносит вклад в итоговый балл</li>
</ul>

<p><strong>Основные факторы:</strong></p>
<ul>
  <li><b>Цена относительно рынка</b> — главный фактор спроса</li>
  <li><b>Характеристики объекта</b> — планировка, этаж, состояние</li>
  <li><b>Локация</b> — город и район</li>
  <li><b>Ситуация на рынке</b> — количество конкурирующих предложений</li>
</ul>

<p><strong>Принцип расчёта:</strong></p>
<ul>
  <li>Каждый блок получает собственную оценку</li>
  <li>Цена влияет сильнее остальных факторов</li>
  <li>Итоговый индекс — это взвешенная сумма всех оценок</li>
</ul>

<p><strong>Диапазоны значений:</strong></p>
<ul>
  <li><b>0–40</b> — низкая ликвидность, продажа может занять длительное время</li>
  <li><b>40–70</b> — средняя ликвидность, стандартный срок экспозиции</li>
  <li><b>70+</b> — высокая ликвидность, объект продаётся быстро</li>
</ul>

<p><strong>Что важно понимать:</strong></p>
<ul>
  <li>Высокая ликвидность не всегда означает самую низкую цену</li>
  <li>Низкая ликвидность часто указывает на завышенную цену или слабую планировку</li>
  <li>Индекс помогает оценить <b>реалистичный срок продажи</b></li>
</ul>

<p class="metric-note">
Индекс пересчитывается автоматически при изменении цены и состава портфеля.
</p>
    `,
  },

  layout: {
    title: "Коэффициент планировки",
    html: `
<p><strong>Что это:</strong><br>
Показатель планировки отражает, насколько рационально используется общая площадь объекта.</p>

<p><strong>Базовый принцип:</strong></p>
<ul>
  <li>Оценивается соотношение полезной площади к общей</li>
  <li>Учитывается не только жилая площадь, но и кухня</li>
</ul>

<p><strong>Как считается:</strong></p>
<ul>
  <li>Жилая площадь берётся полностью</li>
  <li>Площадь кухни учитывается частично, как функциональное пространство</li>
  <li>Полученное значение делится на общую площадь</li>
</ul>

<p><strong>Дополнительные корректировки:</strong></p>
<ul>
  <li>Количество комнат влияет на ожидания по пропорциям</li>
  <li>Для многокомнатных квартир требования к планировке выше</li>
</ul>

<p><strong>Интерпретация показателя:</strong></p>
<ul>
  <li><b>&lt; 0.48</b> — слабая планировка, много неэффективных зон</li>
  <li><b>0.48–0.58</b> — хорошая, сбалансированная планировка</li>
  <li><b>&gt; 0.58</b> — отличная, максимально полезная площадь</li>
</ul>

<p><strong>Почему это важно:</strong></p>
<ul>
  <li>Планировка напрямую влияет на удобство проживания</li>
  <li>Объекты с хорошей планировкой продаются быстрее</li>
</ul>

<p class="metric-note">
Показатель используется при расчёте ликвидности и потенциала перепродажи.
</p>
    `,
  },

  resale: {
    title: "Потенциал перепродажи",
    html: `
    <p><strong>Что это:</strong><br>
Показатель перепродажи оценивает потенциал выгодного выхода из объекта
с учётом цены, качества объекта и рыночного спроса.</p>

<p><strong>Как формируется:</strong></p>
<ul>
  <li>Анализируется запас цены относительно рынка</li>
  <li>Учитывается качество планировки</li>
  <li>Оценивается риск выхода через ликвидность</li>
</ul>

<p><strong>Принцип:</strong></p>
<ul>
  <li>Дешёвый объект без спроса — рискован</li>
  <li>Ликвидный, но дорогой — без потенциала роста</li>
  <li>Лучшие объекты сочетают оба фактора</li>
</ul>

<p><strong>Интерпретация:</strong></p>
<ul>
  <li><b>Высокий</b> — возможна выгодная перепродажа</li>
  <li><b>Средний</b> — ограниченный потенциал роста</li>
  <li><b>Ограниченный</b> — объект больше для жизни, чем для инвестиций</li>
</ul>

<p class="metric-note">
Показатель не гарантирует прибыль, но помогает оценить инвестиционный риск.
</p>
    `,
  },
};

METRICS_INFO.exposure = {
  title: "Возраст экспозиции",
  html: `
    <p><strong>Что это:</strong><br>
    Количество дней, прошедших с момента публикации объекта.</p>

    <p><strong>Зачем важно:</strong></p>
    <ul>
      <li>Помогает понять, продаётся ли объект в нормальном режиме</li>
      <li>Долгая экспозиция часто указывает на завышенную цену</li>
    </ul>
  `,
};

METRICS_INFO.stagnation = {
  title: "Стагнация объекта",
  html: `
    <p><strong>Что это:</strong><br>
    Показатель того, «завис» ли объект в продаже.</p>

    <p><strong>Как определяется:</strong></p>
    <ul>
      <li>Учитывается срок экспозиции</li>
      <li>Сравнивается цена с рынком</li>
      <li>Анализируется ликвидность</li>
    </ul>

    <p><strong>Интерпретация:</strong></p>
    <ul>
      <li><b>Нет</b> — объект продаётся нормально</li>
      <li><b>Средняя</b> — стоит пересмотреть стратегию</li>
      <li><b>Высокая</b> — объект «завис», рекомендуется корректировка цены</li>
    </ul>
  `,
};

const SCHEMA = {
  common: {
    title: { label: "Заголовок", type: "text" },
    priceBYN: { label: "Цена BYN", type: "number" },
    priceUSD: { label: "Цена USD", type: "number" },
    cardDescription: { label: "Описание карточки", type: "textarea" },
    description: { label: "Полное описание", type: "textarea" },
    recommended: { label: "Рекомендуемый", type: "checkbox" },
    contractNumber: { label: "Номер договора", type: "text" },
  },

  flat: {
    rooms: { label: "Количество комнат", type: "number" },
    roomsSeparate: { label: "Раздельных комнат", type: "number" },
    areaTotal: { label: "Площадь общая", type: "float" },
    areaLiving: { label: "Площадь жилая", type: "float" },
    yearBuilt: { label: "Год постройки", type: "number" },
    floor: { label: "Этаж", type: "number" },
    floorsTotal: { label: "Этажность", type: "number" },
    houseType: { label: "Тип дома", type: "text" },
    balcony: { label: "Балкон", type: "text" },
    renovation: { label: "Ремонт", type: "text" },
    bathroom: { label: "Санузел", type: "text" },
  },

  house: {
    areaPlot: { label: "Площадь участка", type: "number" },
    areaTotal: { label: "Площадь общая", type: "number" },
    areaLiving: { label: "Площадь жилая", type: "number" },
    houseMaterial: { label: "Материал стен", type: "text" },
    roofMaterial: { label: "Материал крыши", type: "text" },
    heating: { label: "Отопление", type: "text" },
    water: { label: "Вода", type: "text" },
    sewerage: { label: "Канализация", type: "text" },
    electricity: { label: "Электроснабжение", type: "text" },
    landStatus: { label: "Статус земли", type: "text" },
  },
};

const previewImages = {
  "dom-lidskiy-rayon-krupovo": "/images/objects/pic1.webp",
  "dom-lida-severnyy-gorodok-ul-govorova": "/images/objects/pic2.webp",
  "kvartira-lida-ul-zarechnaya-39": "/images/objects/pic3.webp",
  "dom-lidskiy-rayon-sheybaki": "/images/objects/pic4.webp",
  "kvartira-lida-yuzhnyy-gorodok": "/images/objects/pic5.webp",
  "dom-shchuchinskiy-rayon-rozhanka": "/images/objects/pic6.webp",
  "kvartira-lida-yuzhnyy-gorodok-d-19": "/images/objects/pic7.webp",
  "dom-dokudovo-2": "/images/objects/pic8.webp",
  "kvartira-lida-ul-varshavskaya-44": "/images/objects/pic9.webp",
  "kvartira-lida-ul-letnaya-8": "/images/objects/pic10.webp",
  "dom-lidskiy-rayon-melyashi": "/images/objects/pic11.webp",
  "kvartira-lida-ul-tuhachevskogo-65-k1": "/images/objects/pic12.webp",
  "kvartira-lida-ul-masherova-7-k2": "/images/objects/pic13.webp",
  "kvartira-lida-ul-masherova": "/images/objects/pic14.webp",
  "kvartira-lida-ul-tuhachevskogo": "/images/objects/pic15.webp",
  "dom-lidskiy-rayon-minoyty": "/images/objects/pic16.webp",
  "kvartira-lida-ul-kosmonavtov": "/images/objects/pic17.webp",
  "kvartira-lida-ul-zarechnaya-7": "/images/objects/pic18.webp",
  "dom-lidskiy-rayon-ostrovlya-novoselov": "/images/objects/pic19.webp",
  "kvartira-laykovshchina-lidskiy-rayon": "/images/objects/pic20.webp",
  "kvartira-lida-ul-prolygina-4": "/images/objects/pic21.webp",
  "dom-shchuchinskiy-rayon-skribovtsy": "/images/objects/pic22.webp",
  "dom-shchuchinskiy-rayon-boyary-zheludokskie": "/images/objects/pic23.webp",
  "kvartira-volkovysk-centr": "/images/objects/pic24.webp",
  "kvartira-lida-knyazya-gedimina-7": "/images/objects/pic25.webp",
  "sto-lida-ignatova-42-veras-avto": "/images/objects/pic26.webp",
  "kvartira-volkovysk-socialisticheskaya": "/images/objects/pic27.webp",
  "dom-lida-ul-shchedrina": "/images/objects/pic28.webp",
  "kvartira-lida-ul-tavlaya-25a": "/images/objects/pic29.webp",
  "kvartira-shchuchin-ul-ostrovskogo-5": "/images/objects/pic30.webp",
  "kvartira-lida-ul-nevskogo-20a": "/images/objects/pic31.webp",
  "kvartira-lida-ul-sovetskaya-36": "/images/objects/pic32.webp",
  "kvartira-lida-ul-respublikanskaya-7": "/images/objects/pic33.webp",
  "kvartira-lida-ul-kosmonavtov-12-k1": "/images/objects/pic34.webp",
  "dom-yodki-ul-sadovaya": "/images/objects/pic35.webp",
  "kvartira-lida-ul-urickogo-60": "/images/objects/pic36.webp",
  "kvartira-lida-ul-yuzhnyy-gorodok-24": "/images/objects/pic37.webp",
  "kvartira-lida-ul-tukhachevskogo-65": "/images/objects/pic38.webp",
  "kvartira-lida-ul-sovetskaya-36-stalinka": "/images/objects/pic39.webp",
  "kvartira-lida-ul-nevskogo-20-cheshka": "/images/objects/pic40.webp",
  "kvartira-lida-ul-naberezhnaya-1-vid-na-ozero": "/images/objects/pic41.webp",
  "kvartira-lida-ul-hasanovskaya-1-64": "/images/objects/pic42.webp",
  "kvartira-lida-ul-sovetskaya-5-center": "/images/objects/pic43.webp",
  "kvartira-volkovysk-ul-novye-borki-23": "/images/objects/pic44.webp",
  "dom-lida-ul-novoprudskaya-2": "/images/objects/pic45.webp",
  "kvartira-lida-ul-nevskogo-44-severny": "/images/objects/pic46.webp",
  "kvartira-lida-ul-rybinovskogo-22": "/images/objects/pic47.webp",
  "kvartira-lida-ul-masherova-15-2": "/images/objects/pic48.webp",
  "dom-lida-ul-poselkovaya-industrialny": "/images/objects/pic49.webp",
  "kvartira-lida-ul-kommunisticheskaya-49": "/images/objects/pic50.webp",
  "kvartira-shchuchin-ul-ostrovskogo-22": "/images/objects/pic51.webp",
  "kvartira-lida-yuzhny-gorodok-13-stary-yuzhny": "/images/objects/pic52.webp",
  "dom-lida-ul-urickogo-chast-doma": "/images/objects/pic53.webp",
  "kvartira-lida-ul-gastello-65": "/images/objects/pic54.webp",
  "kvartira-lida-ul-kommunisticheskaya-39k1": "/images/objects/pic55.webp",
  "dom-lida-ul-kievskaya": "/images/objects/pic56.webp",
  "kvartira-lida-ul-kooperativnaya-50": "/images/objects/pic57.webp",
  "dom-feliksovo-ekaterininskiy-trakt": "/images/objects/pic58.webp",
  "dom-ogorodniki-molodezhnaya-24": "/images/objects/pic60.webp",
  "dom-lida-ul-dobrolyubova": "/images/objects/pic59.webp",
  "dom-lida-ul-proletarskaya-sloboda": "/images/objects/pic61.webp",
  "kvartira-lida-ul-tavlaya-35-k1": "/images/objects/pic62.webp",
};

/* ======================================================
   DOM
====================================================== */
const container = document.getElementById("objects");
const saveBtn = document.getElementById("saveBtn");
const downloadBtn = document.getElementById("downloadBtn");
const setTokenBtn = document.getElementById("setTokenBtn");
const dirtyIndicator = document.getElementById("dirtyIndicator");
const errorsBox = document.getElementById("errors");

/* ===== MODAL ===== */
const addModal = document.getElementById("addModal");
const openAddModal = document.getElementById("openAddModal");
const closeAddModal = document.getElementById("closeAddModal");
const cancelAdd = document.getElementById("cancelAdd");

/* ===== ADD FORM ===== */
const addForm = document.getElementById("addObjectForm");
const addType = document.getElementById("addType");
const addFlat = document.getElementById("addFlat");
const addHouse = document.getElementById("addHouse");
/* ===== EDIT MODAL ===== */
const editModal = document.getElementById("editModal");
const modalBody = document.getElementById("editModalBody");
const modalTitle = document.getElementById("editModalTitle");
const closeEditModal = document.getElementById("closeEditModal");
const cancelEdit = document.getElementById("cancelEdit");
const saveEdit = document.getElementById("saveEdit");

/* ===== DELETE CONFIRM MODAL ===== */
const deleteConfirmModal = document.getElementById("deleteConfirmModal");
const deleteConfirmText = document.getElementById("deleteConfirmText");
const closeDeleteConfirm = document.getElementById("closeDeleteConfirm");
const cancelDeleteConfirm = document.getElementById("cancelDeleteConfirm");
const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
let pendingDeleteIndex = null;

/* ======================================================
   LOAD DATA
====================================================== */
let isInitialized = false;

fetch("/data/objects.json")
  .then((r) => r.json())
  .then((data) => syncObjectsWithLivePrices(data))
  .then((data) => {
    objects = data || [];

    // Инициализируем event delegation только один раз
    if (!isInitialized) {
      setupEventDelegation();
      bindEditButtons();
      bindDeleteButtons();
      bindInlinePriceEdit();
      bindQuickActions();
      bindDashboardFilters();
      isInitialized = true;
    }

    render();
  });

/* ======================================================
   DIRTY STATE + AUTOSAVE
====================================================== */
function setDirty(state = true) {
  isDirty = state;
  dirtyIndicator.classList.toggle("is-visible", isDirty);
}

// Инициализируем createdAt за один раз, без срабатывания setDirty()
let hasCreatedAtUpdates = false;
objects.forEach((obj) => {
  if (!obj.createdAt) {
    obj.createdAt = obj.publishedAt || new Date().toISOString();
    hasCreatedAtUpdates = true;
  }
});
if (hasCreatedAtUpdates) {
  setDirty();
}
/* ======================================================
   RENDER - OPTIMIZED
====================================================== */
function render() {
  container.innerHTML = "";

  // 1. применяем фильтры
  let list = applyFilter(objects);

  // 2. применяем сортировку из хедера
  list = sortObjects(list);

  // 🔥 2.1 РЕНДЕРИМ СТАТИСТИКУ ПОРТФЕЛЯ (НАД СПИСКОМ)
  renderPortfolioStats(list);

  // 3. рендерим объекты с индексом из массива objects
  const indexMap = new Map();
  objects.forEach((obj, i) => indexMap.set(obj, i));

  list.forEach((obj) => {
    const index = indexMap.get(obj);
    container.appendChild(renderObject(obj, index));
  });

  // 4. обновляем статистику
  updateStats();
  renderDashboardCharts();

  // 5. переинициализируем drag-and-drop (только DOM заново создан)
  enableDragAndDrop(container, objects);
}

function enableDragAndDrop(container, dataArray) {
  if (!container) return;

  if (!container.__dndState) {
    container.__dndState = { draggedEl: null, dataArray };
  } else {
    container.__dndState.dataArray = dataArray;
  }

  if (!container.__dndHandlersBound) {
    container.__dndHandlersBound = true;

    // Используем event delegation вместо привязки к каждому элементу
    container.addEventListener("dragstart", (e) => {
      const item = e.target.closest(".object");
      if (!item) return;

      container.__dndState.draggedEl = item;
      item.classList.add("dragging");
    });

    container.addEventListener("dragend", (e) => {
      const item = e.target.closest(".object");
      if (!item) return;

      item.classList.remove("dragging");
      container.__dndState.draggedEl = null;
    });

    container.addEventListener("dragover", (e) => {
      e.preventDefault();
    });

    container.addEventListener("drop", (e) => {
      e.preventDefault();
      const draggedEl = container.__dndState?.draggedEl;
      const currentDataArray = container.__dndState?.dataArray || dataArray;
      if (!draggedEl) return;

      const dropTarget = e.target.closest(".object");
      if (!dropTarget || draggedEl === dropTarget) return;

      const fromIndex = Number(draggedEl.dataset.index);
      const toIndex = Number(dropTarget.dataset.index);
      if (Number.isNaN(fromIndex) || Number.isNaN(toIndex)) return;

      /* ===== 1. ДВИГАЕМ DOM ===== */
      const rect = dropTarget.getBoundingClientRect();
      const isAfter = e.clientY > rect.top + rect.height / 2;

      container.insertBefore(
        draggedEl,
        isAfter ? dropTarget.nextSibling : dropTarget,
      );

      /* ===== 2. ОБНОВЛЯЕМ МАССИВ ===== */
      const moved = currentDataArray.splice(fromIndex, 1)[0];
      currentDataArray.splice(toIndex, 0, moved);

      /* ===== 3. ОБНОВЛЯЕМ data-index ===== */
      container.querySelectorAll(".object").forEach((el, i) => {
        el.dataset.index = i;
      });

      setDirty();
    });
  }

  // Устанавливаем draggable атрибут для всех элементов
  container.querySelectorAll(".object").forEach((item) => {
    item.draggable = true;
  });
}

function renderObject(obj, index) {
  const status = obj.status?.type || "active";
  const date = obj.status?.date || "";
  const previewSrc = resolvePreviewImage(obj);
  const metrics = calculateMetrics(obj);
  const displayPriceByn = getObjectPriceByn(obj);

  const div = document.createElement("div");
  div.className = `object ${obj.recommended ? "is-recommended" : ""} ${status === "sold" ? "is-sold" : ""}`;
  div.dataset.index = index;

  // 🆕 Возраст экспозиции
  const exposureHtml =
    metrics?.exposureDays != null ? `${metrics.exposureDays} дн.` : "—";

  // 🆕 Стагнация — цвет
  let stagnationClass = "";
  if (metrics?.stagnation?.label === "Средняя")
    stagnationClass = "stagnation-medium";
  if (metrics?.stagnation?.label === "Высокая")
    stagnationClass = "stagnation-high";

  div.innerHTML = `
    <!-- ФОТО -->
    <div class="object-preview">
      ${previewSrc ? `<img src="${previewSrc}" alt="" loading="lazy">` : ""}
    </div>

    <!-- ИНФОРМАЦИЯ -->
    <div class="object-info">
      <div class="object-header">
        <div class="object-title">${obj.title}</div>

        <div class="object-badges">
          <span
            class="badge badge-star recommend-toggle ${obj.recommended ? "" : "is-muted"}"
            data-index="${index}"
            title="Рекомендованный объект"
          >
            ⭐
          </span>

          <span
            class="badge status-badge ${status === "sold" ? "badge--sold" : "badge--active"}"
            data-index="${index}"
            title="Изменить статус объекта"
          >
            ${status === "sold" ? `Продано${date ? " • " + date : ""}` : "В продаже"}
          </span>
        </div>
      </div>

      <div class="object-price">
        ${displayPriceByn?.toLocaleString() || "—"} BYN
        <span class="price-usd">/ ${obj.priceUSD?.toLocaleString()} $</span>
      </div>

      <div class="object-address">
        📍 ${obj.city || ""}${obj.address ? ", " + obj.address : ""}
      </div>
    </div>

    <!-- МЕТРИКИ -->
    ${
      metrics
        ? `
      <div class="object-metrics">

        <!-- Цена -->
        <div class="metric" data-metric="price">
          <span class="metric-label">Цена / м²</span>
          <span class="metric-value">${metrics.pricePerM2} $</span>
          <span class="${metrics.deviation <= -7 ? "good" : metrics.deviation >= 7 ? "bad" : "neutral"}">
            ${metrics.deviation > 0 ? "+" : ""}${metrics.deviation}% от рынка
          </span>
        </div>

        <!-- Ликвидность -->
        <div class="metric" data-metric="liquidity">
          <span class="metric-label">Ликвидность</span>
          <div class="liquidity-bar">
            <span style="--value:${metrics.liquidity}"></span>
          </div>
          <span class="metric-sub">${metrics.liquidity} / 100</span>
        </div>

        <!-- Планировка -->
        <div class="metric" data-metric="layout">
          <span class="metric-label">Планировка</span>
          <span class="metric-value">
            ${metrics.layoutIndex !== null ? metrics.layoutIndex : "—"}
          </span>
        </div>

        <!-- Перепродажа -->
        <div class="metric" data-metric="resale">
          <span class="metric-label">Перепродажа</span>
          <span class="metric-value">${metrics.resale}</span>
        </div>

        <!-- 🆕 Экспозиция -->
        <div class="metric" data-metric="exposure">
          <span class="metric-label">Экспозиция</span>
          <span class="metric-value">${exposureHtml}</span>
        </div>

        <!-- 🆕 Стагнация -->
        <div class="metric ${stagnationClass}" data-metric="stagnation">
          <span class="metric-label">Стагнация</span>
          <span class="metric-value">
            ${metrics.stagnation?.label ?? "—"}
          </span>
        </div>

      </div>
      `
        : ""
    }

    <!-- КНОПКИ -->
    <div class="object-actions">
      <button class="edit-btn" data-index="${index}">✏️</button>
      <button class="view-btn" data-slug="${obj.slug}">👁</button>
      <button class="delete-btn" data-index="${index}" title="Удалить объект">🗑</button>
    </div>
  `;

  return div;
}
/* ======================================================
   EVENTS (LIST) - CENTRALIZED EVENT DELEGATION
====================================================== */
function setupEventDelegation() {
  // Используем event delegation на контейнер вместо привязки к каждому элементу
  container.addEventListener("input", (e) => {
    const index = e.target.dataset.index;
    if (!index) return;

    if (e.target.classList.contains("price")) {
      objects[index].priceBYN = Number(e.target.value);
      setDirty();
    } else if (e.target.classList.contains("desc")) {
      objects[index].cardDescription = e.target.value.trim();
      setDirty();
    }
  });

  container.addEventListener("change", (e) => {
    const index = e.target.dataset.index;
    if (!index) return;

    if (e.target.classList.contains("recommended")) {
      objects[index].recommended = e.target.checked;
      setDirty();
      render();
    } else if (e.target.classList.contains("status")) {
      if (e.target.value === "sold") {
        objects[index].status = {
          type: "sold",
          date: new Date().toISOString().slice(0, 10),
        };
      } else {
        delete objects[index].status;
      }
      setDirty();
      render();
    } else if (e.target.classList.contains("date")) {
      if (objects[index].status) {
        objects[index].status.date = e.target.value;
        setDirty();
      }
    }
  });
}

/* ======================================================
   MODAL LOGIC
====================================================== */
function closeModal() {
  if (!addModal) return;
  addModal.classList.remove("is-open");
  document.body.style.overflow = "";
}

if (openAddModal && addModal) {
  openAddModal.addEventListener("click", () => {
    addModal.classList.add("is-open");
    document.body.style.overflow = "hidden";
  });

  closeAddModal?.addEventListener("click", closeModal);
  cancelAdd?.addEventListener("click", closeModal);

  addModal.addEventListener("click", (e) => {
    if (e.target === addModal) closeModal();
  });
}

/* ======================================================
   ADD OBJECT FORM
====================================================== */
/* ======================================================
   ADD OBJECT FORM
====================================================== */
addType.addEventListener("change", () => {
  addFlat.hidden = addType.value !== "Квартира";
  addHouse.hidden = addType.value !== "Дом";
});

addForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const fd = new FormData(addForm);

  const features = fd
    .getAll("feature")
    .map((f) => f.trim())
    .filter(Boolean);

  const obj = {
    id: "obj-" + Date.now(),
    slug: slugifyLatin(fd.get("title")),
    title: fd.get("title"),
    type: fd.get("type"),
    dealType: "Продажа",
    city: fd.get("city"),
    address: fd.get("address"),
    priceBYN: Number(fd.get("priceBYN")),
    priceUSD: Number(fd.get("priceUSD")),
    cardDescription: fd.get("cardDescription"),
    description: fd.get("description"),
    features,
    publishedAt: new Date().toISOString().slice(0, 10),
  };

  if (obj.type === "Квартира") {
    Object.assign(obj, {
      rooms: fd.get("rooms"),
      roomsSeparate: fd.get("roomsSeparate"),
      areaTotal: fd.get("areaTotal"),
      areaLiving: fd.get("areaLiving"),
      yearBuilt: fd.get("yearBuilt"),
      floor: fd.get("floor"),
      floorsTotal: fd.get("floorsTotal"),
      houseType: fd.get("houseType"),
      balcony: fd.get("balcony"),
      repair: fd.get("repair"),
      ceilingHeight: fd.get("ceilingHeight"),
      bathroom: fd.get("bathroom"),
      contractNumber: fd.get("contractNumber"),
    });
  }

  if (obj.type === "Дом") {
    Object.assign(obj, {
      areaPlot: fd.get("areaPlot"),
      areaTotal: fd.get("areaTotal"),
      areaLiving: fd.get("areaLiving"),
      areaKitchen: fd.get("areaKitchen"),
      levels: fd.get("levels"),
      yearBuilt: fd.get("yearBuilt"),
      readyPercent: fd.get("readyPercent"),
      houseMaterial: fd.get("houseMaterial"),
      roofMaterial: fd.get("roofMaterial"),
      repair: fd.get("repair"),
      heating: fd.get("heating"),
      sewerage: fd.get("sewerage"),
      electricity: fd.get("electricity"),
      water: fd.get("water"),
      landStatus: fd.get("landStatus"),
      contractNumber: fd.get("contractNumber"),
    });
  }

  syncObjectsWithLivePrices([obj]).then(([enrichedObj]) => {
    objects.unshift(enrichedObj || obj);
    setDirty(true);
    render();
    addForm.reset();
    addFlat.hidden = true;
    addHouse.hidden = true;
    closeModal();
  });
});

/* ======================================================
   SAVE / DOWNLOAD
====================================================== */
function downloadJSON(filename) {
  const blob = new Blob([JSON.stringify(objects, null, 2)], {
    type: "application/json",
  });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();

  URL.revokeObjectURL(a.href);
}

function updateTokenButtonText() {
  if (!setTokenBtn) return;

  const hasToken = !!(localStorage.getItem("adminSaveToken") || "").trim();
  setTokenBtn.textContent = hasToken ? "🔐 Токен задан" : "🔐 Ввести токен";
}

function askAndStoreAdminToken() {
  const currentToken = (localStorage.getItem("adminSaveToken") || "").trim();
  const typed = prompt(
    "Введите токен для сохранения на сервере.\nОставьте пустым, чтобы удалить токен.",
    currentToken,
  );

  if (typed === null) {
    return;
  }

  const nextToken = typed.trim();
  if (!nextToken) {
    localStorage.removeItem("adminSaveToken");
    errorsBox.style.display = "none";
    updateTokenButtonText();
    return;
  }

  localStorage.setItem("adminSaveToken", nextToken);
  errorsBox.style.display = "none";
  updateTokenButtonText();
}

async function saveObjectsToServer() {
  const adminToken = localStorage.getItem("adminSaveToken") || "";
  const headers = {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  };

  if (adminToken) {
    headers["X-Admin-Token"] = adminToken;
  }

  const response = await fetch("/adminka_objects/save.php", {
    method: "POST",
    headers,
    body: JSON.stringify(objects),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (_) {
    // fallback: сервер мог вернуть не-JSON
  }

  if (!response.ok || payload?.status !== "ok") {
    throw new Error(payload?.error || "Не удалось сохранить данные на сервере");
  }
}

updateTokenButtonText();

if (setTokenBtn) {
  setTokenBtn.addEventListener("click", askAndStoreAdminToken);
}

downloadBtn.addEventListener("click", () => {
  const errors = validateJSON(objects);
  showErrors(errors);
  if (errors.length) return;
  downloadJSON("objects.modified.json");
  setDirty(false);
});

saveBtn.addEventListener("click", async () => {
  const errors = validateJSON(objects);
  showErrors(errors);
  if (errors.length) return;

  saveBtn.disabled = true;
  const originalText = saveBtn.textContent;
  saveBtn.textContent = "⏳ Сохраняем...";

  try {
    await saveObjectsToServer();
    setDirty(false);
    saveBtn.textContent = "✅ Сохранено";
    setTimeout(() => {
      saveBtn.textContent = originalText;
      saveBtn.disabled = false;
    }, 1200);
  } catch (error) {
    errorsBox.innerHTML = `<strong>Ошибка сохранения:</strong> ${error.message}`;
    errorsBox.style.display = "block";
    saveBtn.textContent = "❌ Ошибка";
    setTimeout(() => {
      saveBtn.textContent = originalText;
      saveBtn.disabled = false;
    }, 1400);
  }
});

/* ======================================================
   ERRORS UI
====================================================== */
function showErrors(errors) {
  if (!errors.length) {
    errorsBox.style.display = "none";
    return;
  }

  errorsBox.innerHTML = `
    <strong>Ошибки:</strong>
    <ul>${errors.map((e) => `<li>${e}</li>`).join("")}</ul>
  `;
  errorsBox.style.display = "block";
}

/* ======================================================
   HELPERS
====================================================== */
function slugifyLatin(text) {
  const map = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "c",
    ч: "ch",
    ш: "sh",
    щ: "sch",
    ы: "y",
    э: "e",
    ю: "yu",
    я: "ya",
  };

  return text
    .toLowerCase()
    .split("")
    .map((c) => map[c] || c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function generateFeaturesFromDescription(text, type) {
  if (!text) return [];

  const features = [];
  const t = text.toLowerCase();

  const common = [
    { re: /(\d+[,\.]?\d*)\s*м²/, f: (v) => `Площадь ${v} м²` },
    { re: /(центр|центре)/, f: () => "Центральный район" },
    { re: /(тихий|спокойный)/, f: () => "Тихий район" },
    { re: /(школ|сад|магазин)/, f: () => "Развитая инфраструктура" },
  ];

  const flatRules = [
    { re: /(\d+)[-\s]?комнат/, f: (v) => `${v}-комнатная` },
    { re: /этаж\s*(\d+)/, f: (v) => `Этаж ${v}` },
    { re: /(\d+)[-\s]?этажного/, f: (v) => `${v}-этажный дом` },
    { re: /(балкон|лоджия)/, f: (v) => `Есть ${v}` },
    { re: /(ремонт|отремонтирован)/, f: () => "Хорошее состояние" },
  ];

  const houseRules = [
    { re: /участ(ок|ке)/, f: () => "Собственный участок" },
    { re: /(отоплен|печ)/, f: () => "Отопление" },
    { re: /(вода|скважин)/, f: () => "Вода заведена" },
    { re: /(канализац)/, f: () => "Канализация" },
    { re: /(гараж)/, f: () => "Есть гараж" },
  ];

  const rules = [
    ...common,
    ...(type === "Квартира" ? flatRules : []),
    ...(type === "Дом" ? houseRules : []),
  ];

  rules.forEach((r) => {
    const m = t.match(r.re);
    if (m) {
      const val = m[1] || m[0];
      const feat = r.f(val.toString().replace(",", "."));
      if (!features.includes(feat)) features.push(feat);
    }
  });

  const fallback =
    type === "Дом"
      ? [
          "Подходит для постоянного проживания",
          "Удобный подъезд",
          "Хорошее состояние",
          "Документы готовы",
          "Выгодная цена",
          "Перспективный район",
        ]
      : [
          "Удобная планировка",
          "Хорошее состояние",
          "Подходит для проживания",
          "Документы готовы",
          "Выгодное предложение",
          "Комфортный район",
        ];

  while (features.length < 6) {
    const next = fallback[features.length % fallback.length];
    if (!features.includes(next)) features.push(next);
  }

  return features.slice(0, 8);
}

const descriptionField = addForm.querySelector('[name="description"]');

descriptionField.addEventListener("blur", () => {
  const text = descriptionField.value;
  const features = generateFeaturesFromDescription(text);

  const featureInputs = addForm.querySelectorAll('input[name="feature"]');

  featureInputs.forEach((input, i) => {
    input.value = features[i] || "";
  });
});
const regenBtn = document.getElementById("regenFeatures");
const descField = addForm.querySelector('[name="description"]');

function applyFeatures(features) {
  const inputs = addForm.querySelectorAll('input[name="feature"]');

  inputs.forEach((input, i) => {
    if (features[i]) {
      input.value = features[i];
      input.dataset.auto = "1";
    } else {
      input.value = "";
      input.dataset.auto = "0";
    }
  });
}

function regenerateFeatures() {
  const text = descField.value;
  const type = addType.value;

  if (!text || !type) return;

  const features = generateFeaturesFromDescription(text, type);
  applyFeatures(features);
}

regenBtn.addEventListener("click", regenerateFeatures);

descField.addEventListener("blur", () => {
  regenerateFeatures();
});

addForm.querySelectorAll('input[name="feature"]').forEach((input) => {
  input.addEventListener("input", () => {
    input.dataset.auto = "0";
  });
});

function renderField(key, config, value, onChange) {
  const wrapper = document.createElement("label");
  wrapper.className = "field";

  const title = document.createElement("span");
  title.textContent = config.label;
  wrapper.appendChild(title);

  let input;

  if (config.type === "textarea") {
    input = document.createElement("textarea");
    input.rows = 3;
    input.value = value ?? "";
  } else if (config.type === "checkbox") {
    input = document.createElement("input");
    input.type = "checkbox";
    input.checked = !!value;
  } else if (config.type === "number") {
    input = document.createElement("input");
    input.type = "number";
    input.value = value ?? "";
  } else if (config.type === "float") {
    input = document.createElement("input");
    input.type = "text";
    input.inputMode = "decimal";
    input.placeholder = "например, 78,8";
    input.value = value ?? "";

    input.addEventListener("input", () => {
      const v = input.value.replace(",", ".");
      if (!isNaN(v)) {
        onChange(Number(v));
        setDirty();
      }
    });
  } else {
    input = document.createElement("input");
    input.type = "text";
    input.value = value ?? "";
  }

  // обычный обработчик (кроме float — он уже выше)
  if (config.type !== "float") {
    input.addEventListener("input", () => {
      const newValue =
        config.type === "checkbox"
          ? input.checked
          : config.type === "number"
            ? Number(input.value)
            : input.value;

      onChange(newValue);
      setDirty();
    });
  }

  wrapper.appendChild(input);
  return wrapper;
}

function renderObjectEditor(obj) {
  const container = document.createElement("div");
  container.className = "object-editor";

  /* ===== ОСНОВНОЕ ===== */
  container.appendChild(renderSection("Основное"));

  Object.entries(SCHEMA.common).forEach(([key, cfg]) => {
    if (key in obj) {
      const field = renderField(key, cfg, obj[key], (val) => (obj[key] = val));
      if (["title", "cardDescription", "description"].includes(key)) {
        field.classList.add("full");
      }
      container.appendChild(field);
    }
  });

  /* ===== ПАРАМЕТРЫ ===== */
  const typeKey = obj.type === "Квартира" ? "flat" : "house";

  container.appendChild(
    renderSection(
      obj.type === "Квартира" ? "Параметры квартиры" : "Параметры дома",
    ),
  );

  Object.entries(SCHEMA[typeKey]).forEach(([key, cfg]) => {
    if (key in obj) {
      container.appendChild(
        renderField(key, cfg, obj[key], (val) => (obj[key] = val)),
      );
    }
  });

  /* ===== ЮРИДИЧЕСКОЕ ===== */
  if ("contractNumber" in obj) {
    container.appendChild(renderSection("Юридическое"));

    container.appendChild(
      renderField(
        "contractNumber",
        SCHEMA.common.contractNumber,
        obj.contractNumber,
        (val) => (obj.contractNumber = val),
      ),
    );
  }

  return container;
}

function bindEditButtons() {
  // Используем event delegation для кнопок редактирования
  container.addEventListener("click", (e) => {
    const editBtn = e.target.closest(".edit-btn");
    if (!editBtn) return;

    const index = Number(editBtn.dataset.index);
    openEditModal(index);
  });
}

function openDeleteConfirm(index) {
  const obj = objects[index];
  if (!obj || !deleteConfirmModal || !deleteConfirmText) return;

  pendingDeleteIndex = index;
  deleteConfirmText.textContent = `Вы действительно хотите удалить объект «${obj.title}»?`;
  deleteConfirmModal.classList.add("is-open");
  deleteConfirmModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeDeleteConfirmModal() {
  if (!deleteConfirmModal) return;

  pendingDeleteIndex = null;
  deleteConfirmModal.classList.remove("is-open");
  deleteConfirmModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function bindDeleteButtons() {
  // Используем event delegation для кнопок удаления
  container.addEventListener("click", (e) => {
    const deleteBtn = e.target.closest(".delete-btn");
    if (!deleteBtn) return;

    const index = Number(deleteBtn.dataset.index);
    if (Number.isNaN(index)) return;
    openDeleteConfirm(index);
  });
}

function openEditModal(index) {
  const obj = objects[index];

  modalTitle.textContent = `Редактирование: ${obj.title}`;
  modalBody.innerHTML = "";
  modalBody.appendChild(renderObjectEditor(obj));

  editModal.classList.add("is-open");
  document.body.style.overflow = "hidden";
}

function closeEdit() {
  editModal.classList.remove("is-open");
  document.body.style.overflow = "";
  modalBody.innerHTML = "";
}

closeEditModal.addEventListener("click", closeEdit);
cancelEdit.addEventListener("click", closeEdit);

editModal.addEventListener("click", (e) => {
  if (e.target === editModal) closeEdit();
});

closeDeleteConfirm?.addEventListener("click", closeDeleteConfirmModal);
cancelDeleteConfirm?.addEventListener("click", closeDeleteConfirmModal);

deleteConfirmModal?.addEventListener("click", (e) => {
  if (e.target === deleteConfirmModal) closeDeleteConfirmModal();
});

confirmDeleteBtn?.addEventListener("click", () => {
  if (pendingDeleteIndex === null) return;

  const obj = objects[pendingDeleteIndex];
  if (!obj) {
    closeDeleteConfirmModal();
    return;
  }

  objects.splice(pendingDeleteIndex, 1);
  setDirty(true);
  closeDeleteConfirmModal();
  render();
});

saveEdit.addEventListener("click", () => {
  const errors = validateJSON(objects);
  showErrors(errors);
  if (errors.length) return;

  syncObjectsWithLivePrices(objects).then((enrichedObjects) => {
    objects = enrichedObjects || objects;
    render();
    closeEdit();
  });
});

function renderSection(title) {
  const wrap = document.createElement("div");
  wrap.className = "form-section";
  wrap.innerHTML = `<h3>${title}</h3>`;
  return wrap;
}

function bindQuickActions() {
  // Используем event delegation для badge кликов
  container.addEventListener("click", (e) => {
    const statusBadge = e.target.closest(".status-badge");
    const recommendStar = e.target.closest(".recommend-toggle");

    if (statusBadge) {
      const i = statusBadge.dataset.index;
      const obj = objects[i];

      if (obj.status?.type === "sold") {
        delete obj.status;
      } else {
        obj.status = {
          type: "sold",
          date: new Date().toISOString().slice(0, 10),
        };
      }

      setDirty();
      render();
    }

    if (recommendStar) {
      const i = recommendStar.dataset.index;
      objects[i].recommended = !objects[i].recommended;
      setDirty();
      render();
    }
  });
}

function bindInlinePriceEdit() {
  // Используем event delegation для inline редактирования цены
  container.addEventListener("click", (e) => {
    const editablePrice = e.target.closest(".editable-price");
    if (!editablePrice || editablePrice.querySelector("input")) return;

    const i = editablePrice.dataset.index;
    const obj = objects[i];

    const input = document.createElement("input");
    input.type = "number";
    input.value = obj.priceBYN;
    input.className = "inline-input";

    editablePrice.innerHTML = "";
    editablePrice.appendChild(input);
    input.focus();

    function save() {
      obj.priceBYN = Number(input.value);
      setDirty();
      render();
    }

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") save();
      if (e.key === "Escape") render();
    });

    input.addEventListener("blur", save);
  });
}

function updateStats() {
  const total = objects.length;
  const sold = objects.filter((o) => o.status?.type === "sold").length;
  const active = total - sold;
  const recommended = objects.filter((o) => o.recommended).length;

  animateNumber(document.getElementById("statTotal"), total);
  animateNumber(document.getElementById("statActive"), active);
  animateNumber(document.getElementById("statSold"), sold);
  animateNumber(document.getElementById("statRecommended"), recommended);
}

function renderDashboardCharts() {
  // ⏱ временная ось
  const publishedStats = groupByDate(objects, (o) => o.publishedAt);

  // 🔴 продажи
  const soldStats = groupByDate(objects, (o) => o.status?.date);

  // ⭐ рекомендованные
  const recommendedStats = groupByDate(
    objects.filter((o) => o.recommended),
    (o) => o.publishedAt,
  );

  const cards = document.querySelectorAll(".admin-stats .stat");

  cards.forEach((card, i) => {
    const canvas = card.querySelector("canvas");
    if (!canvas) return;

    let data = [];
    let color = "#3b82f6";

    switch (i) {
      case 0: // Всего
        data = publishedStats;
        color = "#3b82f6";
        break;

      case 1: // В продаже
        data = publishedStats.filter((d) =>
          objects.some((o) => !o.status && o.publishedAt?.startsWith(d.date)),
        );
        color = "#22c55e";
        break;

      case 2: // Продано
        data = soldStats;
        color = "#ef4444";
        break;

      case 3: // ⭐ Рекоменд.
        data = recommendedStats;
        color = "#f59e0b";
        break;
    }

    drawInteractiveDateChart(canvas, data, color, (date) => {
      selectedDate = selectedDate === date ? null : date;
      render();
    });
  });
}
const createdStats = groupByDate(objects, (o) => o.createdAt);
const soldStats = groupByDate(objects, (o) => o.status?.date);

const canvases = document.querySelectorAll(".admin-stats canvas");

document.querySelectorAll(".admin-stats .stat").forEach((card, i) => {
  const canvas = card.querySelector("canvas");
  if (!canvas) return;

  const colors = ["#3b82f6", "#22c55e", "#ef4444", "#f59e0b"];
  drawMiniChart(canvas, colors[i]);
});

function bindDashboardFilters() {
  document.querySelectorAll(".admin-stats .stat").forEach((card) => {
    card.addEventListener("click", () => {
      currentFilter = card.dataset.filter || "all";

      document
        .querySelectorAll(".admin-stats .stat")
        .forEach((c) => c.classList.remove("is-active"));

      card.classList.add("is-active");
      render();
    });
  });
}

function drawMiniChart(canvas, color) {
  const ctx = canvas.getContext("2d");

  canvas.width = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  const points = Array.from(
    { length: 12 },
    () => Math.random() * canvas.height * 0.6 + 8,
  );

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();

  points.forEach((v, i) => {
    const x = (canvas.width / (points.length - 1)) * i;
    const y = canvas.height - v;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });

  ctx.stroke();
}

function animateNumber(el, to) {
  const from = Number(el.textContent) || 0;
  const duration = 600;
  const start = performance.now();

  function frame(time) {
    const progress = Math.min((time - start) / duration, 1);
    el.textContent = Math.round(from + (to - from) * progress);
    if (progress < 1) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

function groupByDate(objects, getter) {
  const map = {};

  objects.forEach((obj) => {
    const date = getter(obj);
    if (!date) return;

    const day = date.slice(0, 10); // YYYY-MM-DD
    map[day] = (map[day] || 0) + 1;
  });

  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));
}

function drawInteractiveDateChart(canvas, points, color, onPointClick) {
  const ctx = canvas.getContext("2d");
  const tooltip = document.getElementById("chartTooltip");

  // 🔥 ЯВНО ЗАДАЁМ РАЗМЕР
  const width = canvas.clientWidth;
  const height = 46;

  canvas.width = width;
  canvas.height = height;

  ctx.clearRect(0, 0, width, height);

  if (!points || points.length < 2) return;

  const max = Math.max(...points.map((p) => p.value));
  const padding = 6;

  // ✅ КЭШИРУЕМ координаты (вычисляем один раз)
  const coords = points.map((p, i) => {
    const x = (width / (points.length - 1)) * i;
    const y = height - (p.value / max) * (height - padding * 2) - padding;
    return { ...p, x, y };
  });

  // линия
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  coords.forEach((p, i) => {
    i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  // ✅ Используем кэшированные координаты при mousemove (не пересчитываем)
  canvas.onmousemove = (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;

    const nearest = coords.reduce((a, b) =>
      Math.abs(b.x - mx) < Math.abs(a.x - mx) ? b : a,
    );

    tooltip.textContent = `${nearest.date}: ${nearest.value}`;
    tooltip.style.left = `${e.clientX}px`;
    tooltip.style.top = `${e.clientY}px`;
    tooltip.style.opacity = 1;
  };

  canvas.onmouseleave = () => {
    tooltip.style.opacity = 0;
  };

  canvas.onclick = (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;

    const nearest = coords.reduce((a, b) =>
      Math.abs(b.x - mx) < Math.abs(a.x - mx) ? b : a,
    );

    onPointClick(nearest.date);
  };
}

function applyFilter(list) {
  let result = list;

  /* ===== existing filters ===== */
  if (currentFilter === "active") {
    result = result.filter((o) => !o.status);
  }

  if (currentFilter === "sold") {
    result = result.filter((o) => o.status?.type === "sold");
  }

  if (currentFilter === "recommended") {
    result = result.filter((o) => o.recommended);
  }

  if (selectedDate) {
    result = result.filter(
      (o) =>
        o.publishedAt?.startsWith(selectedDate) ||
        o.status?.date?.startsWith(selectedDate),
    );
  }

  /* ===== STATS FILTERS ===== */
  if (statsFilters.rooms) {
    result = result.filter((o) => {
      if (!o.rooms) return false;
      return statsFilters.rooms === "4+"
        ? o.rooms >= 4
        : String(o.rooms) === statsFilters.rooms;
    });
  }

  if (statsFilters.city) {
    result = result.filter((o) => o.city === statsFilters.city);
  }

  /* ===== PRICE RANGE FILTER ===== */
  if (statsFilters.priceRange) {
    result = result.filter((o) => {
      const price = o.priceUSD;
      if (!price) return false;

      switch (statsFilters.priceRange) {
        case "<30000":
          return price < 30000;

        case "30000-50000":
          return price >= 30000 && price < 50000;

        case "50000-80000":
          return price >= 50000 && price < 80000;

        case "80000+":
          return price >= 80000;

        default:
          return true;
      }
    });
  }

  return result;
}

function resolvePreviewImage(obj) {
  // 1. если есть явное поле в объекте
  if (obj.previewImage) {
    return obj.previewImage;
  }

  // 2. если есть mapping по slug — путь уже готовый
  if (typeof previewImages !== "undefined" && previewImages[obj.slug]) {
    return previewImages[obj.slug];
  }

  // 3. нет картинки
  return null;
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".view-btn");
  if (!btn) return;

  const slug = btn.dataset.slug;
  if (!slug) return;

  window.open(
    `https://turko.by/objects/${encodeURIComponent(slug)}`,
    "_blank",
    "noopener",
  );
});

function calculateMetrics(obj) {
  const market = calculateMarketDeviation(obj, objects);
  if (!market) return null;

  const layoutIndex = calculateLayoutIndex(obj);

  let liquidityBase = calculateLiquidity({
    price: scorePrice(market.deviation),
    object: scoreObject(obj, layoutIndex),
    location: scoreLocation(obj),
    market: scoreMarket(objects, obj),
  });

  let layoutImpact = 0;
  if (layoutIndex !== null) {
    if (layoutIndex >= 0.6) layoutImpact = +10;
    else if (layoutIndex >= 0.55) layoutImpact = +5;
    else if (layoutIndex >= 0.48) layoutImpact = 0;
    else if (layoutIndex >= 0.42) layoutImpact = -5;
    else layoutImpact = -10;
  }

  const liquidity = clamp(liquidityBase + layoutImpact);

  const resale = calculateResale(obj, {
    deviation: market.deviation,
    layoutIndex,
    liquidity,
  });

  // 🆕 Возраст и стагнация
  const exposureDays = calculateExposureDays(obj);
  const stagnation = calculateStagnation(obj, {
    deviation: market.deviation,
    liquidity,
  });

  return {
    pricePerM2: market.pricePerM2,
    deviation: market.deviation,
    layoutIndex,
    liquidity,
    resale: resale.label,
    resaleScore: resale.score,

    // 🆕 новые метрики
    exposureDays,
    stagnation,
  };
}
const metricsInfoModal = document.getElementById("metricsModal");
const metricsInfoTitle = metricsInfoModal.querySelector(
  ".metrics-modal__title",
);
const metricsInfoContent = metricsInfoModal.querySelector(
  ".metrics-modal__content",
);

document.addEventListener("click", (e) => {
  const metricEl = e.target.closest(".metric");
  if (!metricEl) return;

  const metricKey = metricEl.dataset.metric;
  if (!metricKey) return;

  const objectEl = metricEl.closest(".object");
  const index = Number(objectEl?.dataset.index);
  const obj = objects[index];
  const metrics = calculateMetrics(obj);

  /* =========================================
     1️⃣ ЛИКВИДНОСТЬ — кастомный разбор
  ========================================= */
  if (metricKey === "liquidity" && metrics?.liquidityExplain) {
    const ex = metrics.liquidityExplain;

    metricsInfoTitle.textContent = "Индекс ликвидности — разбор";

    const renderGroup = (title, items) => `
      <h4>${title}</h4>
      <ul class="liquidity-explain">
        ${items
          .map(
            (i) => `
          <li class="${i.value > 0 ? "plus" : "minus"}">
            <span class="value">${i.value > 0 ? "+" : ""}${i.value}</span>
            <span>${i.label}</span>
          </li>
        `,
          )
          .join("")}
      </ul>
    `;

    metricsInfoContent.innerHTML = `
      <p><strong>Итог:</strong> ${ex.total} / 100</p>

      ${renderGroup("Цена", ex.groups.price)}
      ${renderGroup("Объект", ex.groups.object)}
      ${renderGroup("Локация", ex.groups.location)}

      ${
        ex.advice.length
          ? `<h4>Как повысить ликвидность</h4>
             <ul class="liquidity-advice">
               ${ex.advice
                 .map(
                   (a) => `
                 <li>💡 ${a.label}
                 <strong>(≈ +${a.delta} баллов)</strong></li>
               `,
                 )
                 .join("")}
             </ul>`
          : ""
      }
    `;

    metricsInfoModal.hidden = false;
    return;
  }

  /* =========================================
     2️⃣ ВСЕ ОСТАЛЬНЫЕ МЕТРИКИ — METRICS_INFO
  ========================================= */
  const info = METRICS_INFO[metricKey];
  if (!info) return;

  metricsInfoTitle.textContent = info.title;
  metricsInfoContent.innerHTML = info.html;
  metricsInfoModal.hidden = false;
});

metricsInfoModal.addEventListener("click", (e) => {
  if (
    e.target.classList.contains("metrics-modal__overlay") ||
    e.target.classList.contains("metrics-modal__close")
  ) {
    metricsInfoModal.hidden = true;
  }
});

function sortObjects(list) {
  const arr = [...list];

  switch (currentSort) {
    case "price-desc":
      return arr.sort((a, b) => (b.priceUSD || 0) - (a.priceUSD || 0));

    case "price-asc":
      return arr.sort((a, b) => (a.priceUSD || 0) - (b.priceUSD || 0));

    case "new":
    default:
      return arr.sort((a, b) => {
        const da = new Date(a.publishedAt || 0).getTime();
        const db = new Date(b.publishedAt || 0).getTime();
        return db - da;
      });
  }
}

const sortSelect = document.getElementById("objectsSort");

if (sortSelect) {
  sortSelect.addEventListener("change", () => {
    currentSort = sortSelect.value;
    render();
  });
}

function formatRoomsLabel(key) {
  switch (key) {
    case "1":
      return "Однокомнатные";
    case "2":
      return "Двухкомнатные";
    case "3":
      return "Трёхкомнатные";
    case "4+":
      return "4+ комнаты";
    default:
      return `${key}-комнатные`;
  }
}

function formatPriceRangeLabel(key) {
  switch (key) {
    case "<30000":
      return "Меньше 30 тыс. $";
    case "30000-50000":
      return "30–50 тыс. $";
    case "50000-80000":
      return "50–80 тыс. $";
    case "80000+":
      return "Более 80 тыс. $";
    default:
      return key;
  }
}

function renderPortfolioStats(objects) {
  const stats = PortfolioStatistics.calculate(objects);

  renderStatsCards("statsRooms", stats.rooms, "rooms");
  renderStatsCards("statsCities", stats.cities, "cities");
  renderStatsCards("statsPrices", stats.priceRanges, "prices");
  renderAvgPrice(stats.avgPricePerM2);
}

function renderAvgPrice(data) {
  const footer = document.getElementById("statsAvgPrice");
  if (!footer) return;

  const parts = Object.entries(data).map(
    ([rooms, price]) => `${formatRoomsLabel(rooms)} — ${price} $/м²`,
  );

  footer.textContent = `Средняя цена за м²: ${parts.join(" | ")}`;
}

function renderStatsCards(containerId, data, type) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  Object.entries(data).forEach(([key, count]) => {
    if (count === 0) return;

    let label = key;
    let active = false;

    if (type === "rooms") {
      label = formatRoomsLabel(key);
      active = statsFilters.rooms === key;
    }

    if (type === "cities") {
      active = statsFilters.city === key;
    }

    if (type === "prices") {
      label = formatPriceRangeLabel(key);
      active = statsFilters.priceRange === key;
    }

    const card = document.createElement("div");
    card.className = `stats-card ${active ? "is-active" : ""}`;

    card.innerHTML = `
      <div class="stats-card__value">${count}</div>
      <div class="stats-card__label">${label}</div>
      <div class="stats-card__meta">шт.</div>
    `;

    card.addEventListener("click", () => {
      if (type === "rooms") {
        statsFilters.rooms = statsFilters.rooms === key ? null : key;
      }
      if (type === "cities") {
        statsFilters.city = statsFilters.city === key ? null : key;
      }
      if (type === "prices") {
        statsFilters.priceRange = statsFilters.priceRange === key ? null : key;
      }
      render();
    });

    container.appendChild(card);
  });
}

function clamp(v) {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function average(arr) {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function trimmedMean(arr, trim = 0.1) {
  if (arr.length < 3) return average(arr);

  const sorted = [...arr].sort((a, b) => a - b);
  const cut = Math.floor(sorted.length * trim);

  return average(sorted.slice(cut, sorted.length - cut));
}

function getAreaCoef(area) {
  if (!area) return 1;

  if (area < 35) return 1.08;
  if (area < 55) return 1.0;
  if (area < 80) return 0.95;
  return 0.9;
}

function calculateMarketDeviation(obj, objects) {
  const priceUSD = num(obj.priceUSD);
  const areaTotal = num(obj.areaTotal);

  if (!priceUSD || !areaTotal) return null;

  const pricePerM2 = priceUSD / areaTotal;

  const analogs = objects.filter((o) => {
    if (o === obj) return false;
    if (o.status?.type === "sold") return false;
    if (o.type !== obj.type) return false;
    if (o.city !== obj.city) return false;

    const p = num(o.priceUSD);
    const a = num(o.areaTotal);
    if (!p || !a) return false;

    if (obj.type === "Квартира" && String(o.rooms) !== String(obj.rooms)) {
      return false;
    }

    return true;
  });

  let marketPricePerM2;

  if (analogs.length >= 3) {
    const prices = analogs.map((o) => num(o.priceUSD) / num(o.areaTotal));
    marketPricePerM2 = trimmedMean(prices, 0.1);
  } else if (analogs.length > 0) {
    const prices = analogs.map((o) => num(o.priceUSD) / num(o.areaTotal));
    marketPricePerM2 = average(prices);
  } else {
    // 🔥 FALLBACK — СТАТИСТИКА ПОРТФЕЛЯ
    const stats = PortfolioStatistics.calculate(objects);
    const roomKey = obj.rooms >= 4 ? "4+" : String(obj.rooms);

    marketPricePerM2 =
      stats?.avgPricePerM2?.[roomKey] || (obj.type === "Квартира" ? 800 : 400);
  }

  marketPricePerM2 *= getAreaCoef(areaTotal);

  const deviation = ((pricePerM2 - marketPricePerM2) / marketPricePerM2) * 100;

  return {
    pricePerM2: Math.round(pricePerM2),
    marketPricePerM2: Math.round(marketPricePerM2),
    deviation: Math.round(deviation),
  };
}

function scorePrice(deviation) {
  if (deviation <= -15) return 100;
  if (deviation <= -7) return 85;
  if (deviation <= 0) return 70;
  if (deviation <= 5) return 55;
  if (deviation <= 10) return 35;
  return 15;
}

function scoreObject(obj, usefulRatio) {
  let score = 50;

  if (obj.yearBuilt) {
    const age = new Date().getFullYear() - obj.yearBuilt;
    score += age <= 20 ? 15 : -10;
  }

  if (obj.repair === "Хороший") score += 10;
  if (obj.repair === "Требует ремонта") score -= 15;

  if (obj.type === "Квартира") {
    if (obj.rooms <= 2) score += 15;
    else score -= 5;

    if (obj.floor >= 3 && obj.floor <= 7) score += 10;
    else score -= 5;

    if (usefulRatio >= 0.55) score += 10;
    if (usefulRatio < 0.45) score -= 10;
  }

  if (obj.type === "Дом") {
    if (obj.areaPlot >= 10) score += 15;
    if (obj.areaPlot < 6) score -= 10;

    if (obj.readyPercent >= 90) score += 15;
    if (obj.readyPercent < 70) score -= 15;
  }

  return clamp(score);
}

function scoreLocation(obj) {
  let score = 50;

  if (obj.city === "Лида") score += 20;
  else score -= 5;

  const STRONG = ["Центр", "Южный", "Северный"];
  const WEAK = ["Окраина", "Промзона"];

  if (STRONG.includes(obj.district)) score += 15;
  if (WEAK.includes(obj.district)) score -= 15;

  return clamp(score);
}

function scoreMarket(objects, obj) {
  const active = objects.filter(
    (o) => !o.status && o.type === obj.type && o.city === obj.city,
  ).length;

  if (active < 5) return 75;
  if (active < 15) return 60;
  return 45;
}

function calculateLiquidity(scores) {
  return Math.round(
    scores.price * 0.4 +
      scores.object * 0.3 +
      scores.location * 0.2 +
      scores.market * 0.1,
  );
}

function calculateLayoutIndex(obj) {
  const total = Number(obj.areaTotal);
  const living = Number(obj.areaLiving);
  const kitchen = Number(obj.areaKitchen);

  if (!total || !living) return null;

  // 1. Полезная площадь
  const useful = living + (Number.isFinite(kitchen) ? kitchen * 0.6 : 0);

  let ratio = useful / total;

  // 2. Корректировка по комнатам (для квартир)
  if (obj.type === "Квартира") {
    const rooms = Number(obj.rooms);

    if (rooms >= 4) ratio *= 0.94;
    else if (rooms === 3) ratio *= 0.97;
  }

  return Number(ratio.toFixed(2));
}

function calculateResale(obj, metrics) {
  if (!metrics) return { score: 0, label: "Ограниченный" };

  const deviation = metrics.deviation;
  const layoutIndex = metrics.layoutIndex;
  const liquidity = metrics.liquidity;

  // 1️⃣ Ценовой потенциал
  let priceScore = 0;
  if (deviation <= -15) priceScore = 100;
  else if (deviation <= -10) priceScore = 85;
  else if (deviation <= -5) priceScore = 65;
  else if (deviation <= 0) priceScore = 45;
  else if (deviation <= 5) priceScore = 20;
  else priceScore = 0;

  // 2️⃣ Планировка
  let layoutScore = 50;
  if (layoutIndex !== null) {
    if (layoutIndex >= 0.6) layoutScore = 100;
    else if (layoutIndex >= 0.55) layoutScore = 80;
    else if (layoutIndex >= 0.5) layoutScore = 60;
    else if (layoutIndex >= 0.45) layoutScore = 40;
    else layoutScore = 20;
  }

  // 3️⃣ Ликвидность
  const liquidityScore = liquidity ?? 0;

  // 4️⃣ Итоговый resaleScore
  const resaleScore = Math.round(
    priceScore * 0.5 + layoutScore * 0.3 + liquidityScore * 0.2,
  );

  // 5️⃣ Категория
  let label = "Ограниченный";
  if (resaleScore >= 70) label = "Высокий";
  else if (resaleScore >= 45) label = "Средний";

  return {
    score: resaleScore,
    label,
  };
}

function calculateExposureDays(obj) {
  if (!obj.publishedAt) return null;

  const published = new Date(obj.publishedAt);
  if (isNaN(published)) return null;

  const now = new Date();
  const diffMs = now - published;

  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function calculateStagnation(obj, metrics) {
  const days = calculateExposureDays(obj);
  if (days === null || !metrics) return null;

  let score = 0;

  // 1️⃣ Время в продаже
  if (days > 120) score += 40;
  else if (days > 90) score += 30;
  else if (days > 60) score += 20;
  else if (days > 30) score += 10;

  // 2️⃣ Цена относительно рынка
  if (metrics.deviation > 5) score += 25;
  else if (metrics.deviation > 0) score += 10;

  // 3️⃣ Ликвидность
  if (metrics.liquidity < 40) score += 25;
  else if (metrics.liquidity < 55) score += 10;

  // нормализация 0–100
  score = Math.min(100, score);

  // текстовая интерпретация
  let label = "Нет";
  if (score >= 60) label = "Высокая";
  else if (score >= 35) label = "Средняя";

  return {
    days,
    score,
    label,
  };
}
