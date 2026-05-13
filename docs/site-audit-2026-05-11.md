# Полный аудит проекта turko.by (11.05.2026)

## 1) Анализ проекта

### Структура и архитектура
- Текущий стек: мультистраничный сайт на HTML/PHP + ванильный JS + CSS, без сборщика и без компонентной системы.
- Контентные страницы: `index.html`, `nedvizhimost-lida.html`, `rieltor-lida.html`, `faq.html`, `contact.html`, блог и детальные страницы (`blog.html`, `blog-detail.php`, `object-detail.php`).
- Данные объектов и блога лежат в JSON (`data/objects.json`, `data/objects-list.json`, `data/blog-articles.json`), фронт подтягивает их через `fetch`.
- Админка отделена в `adminka_objects/*` (собственные CSS/JS/PHP-endpoints).

### Слабые места в организации кода (конкретно)
1. **Дублирование бизнес-логики цен/площади**: функции `getObjectPriceByn`, `getObjectArea` продублированы в публичной части и админке. Это повышает риск расхождения расчетов.
2. **Жестко прошитые ключи/конфиги в фронтенде**: в `js/object-detail.js` есть MAPTILER key в коде.
3. **Нет унифицированного lifecycle для JS-модулей**: много `addEventListener` в init-функциях без единого `destroy()` (критично для повторной инициализации/частичной навигации).
4. **Смешение responsibility**: часть SEO-логики (`canonical`, `noindex`) меняется на клиенте в `filters.js`, а не формируется сервером до рендера.

---

## 2) SEO аудит

### Что уже реализовано (не дублирую как «рекомендации»)
- На главной есть `title`, `description`, `canonical`, OG/Twitter и JSON-LD `RealEstateAgent` + `WebSite`.
- На карточке объекта есть динамический `canonical` + JSON-LD `BreadcrumbList` + `Product/Offer`.
- Есть `robots.txt` и `sitemap.xml`.

### Найденные ошибки и правки

#### Ошибка 1: Canonical/robots для фильтров выставляется только JS-ом
Проблема: бот может увидеть HTML до выполнения JS. Для URL с параметрами canonical/noindex должен быть серверным.

**Исправление (PHP-шаблон листинга):**
```php
<?php
$hasQuery = !empty($_SERVER['QUERY_STRING']);
$canonical = 'https://turko.by/nedvizhimost-lida';
?>
<link rel="canonical" href="<?= $canonical ?>">
<meta name="robots" content="<?= $hasQuery ? 'noindex,follow' : 'index,follow' ?>">
```

#### Ошибка 2: Schema для недвижимости использует `Product`
Для SEO недвижимости лучше гибрид: `RealEstateListing` + `Offer` + `Residence` (`Apartment`/`House`) вместо e-commerce semantics.

**Исправление (пример JSON-LD):**
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "RealEstateListing",
  "name": "2-комнатная квартира в Лиде, ул. ...",
  "url": "https://turko.by/objects/...",
  "datePosted": "2026-05-10",
  "offers": {
    "@type": "Offer",
    "price": "185000",
    "priceCurrency": "BYN",
    "availability": "https://schema.org/InStock"
  },
  "about": {
    "@type": "Apartment",
    "numberOfRooms": 2,
    "floorSize": {"@type":"QuantitativeValue","value":52.4,"unitCode":"MTK"}
  }
}
</script>
```

#### Ошибка 3: Отсутствует `hreflang`
Если есть RU-контент + потенциальный BY/EN трафик, добавить хотя бы self hreflang для стабильной гео-интерпретации.

```html
<link rel="alternate" hreflang="ru-BY" href="https://turko.by/">
<link rel="alternate" hreflang="x-default" href="https://turko.by/">
```

#### Ошибка 4: Внутренняя перелинковка не усилена тематическими кластерами
Нужно из карточки объекта и блога ставить связки: район → похожие объекты → кейсы продаж по району.

**Практика:** блок «Похожие по району/бюджету» с dofollow-ссылками и анкорами вида «Квартиры в Южном городке».

---

## 3) Техническая оптимизация

### Узкие места
1. `fetch(..., { cache: "no-store" })` в карточке объекта отключает кеш браузера для стабильных JSON.
2. Много CSS подключается как preload+onload, но критический CSS не выделен отдельным inlined-бандлом для hero above-the-fold.
3. Есть риск избыточных webfont-ресурсов (Inter + Montserrat + Flaticon + FontAwesome), что давит LCP.
4. Не видно стратегии immutable-cache headers для `/images/*`, `/fonts/*`, `/css/*`.

### Конкретные правки

#### 3.1 Кэш JSON объектов
```js
// было
fetch(OBJECT_URL(slug), { cache: "no-store" })

// стало
fetch(OBJECT_URL(slug), { cache: "force-cache" })
```
И сервером добавить `Cache-Control: public, max-age=300, stale-while-revalidate=86400`.

#### 3.2 LCP-оптимизация hero
- Оставить только 1 preload LCP-картинки.
- Добавить явные размеры изображения и `fetchpriority="high"` на `<img>` hero.

```html
<img src="/images/main-slider/1.webp"
     width="1600" height="900"
     loading="eager" fetchpriority="high" decoding="async"
     alt="Недвижимость в Лиде — подбор и продажа">
```

#### 3.3 Скрипты
- Всё не критичное в `defer`, а аналитические/внешние — `async`.
- Свести ранний JS к 1 bootstrap-файлу + route-based init.

---

## 4) JS аудит (ключевое)

### Потенциальные memory leaks / перегрузки
1. В `optimize.js` много слушателей событий на документ/элементы без централизованного снятия.
2. В анимации цены (`object-detail.js`) используются `setTimeout`, но нет отмены при уходе со страницы/ре-инициализации.
3. В `filters.js` глобальные mutable state (`allObjects`, `lastRenderedList`, кэши) живут весь lifetime вкладки; нет soft-reset при повторных заходах на страницу через PJAX/SPA-подобную навигацию.

### Тяжелые места
- Повторные проходы по большим спискам в фильтрации и рендере карточек.
- Потенциальные reflow при частых DOM-вставках без `DocumentFragment`.

### Готовые оптимизированные паттерны

#### 4.1 Делегирование + AbortController для cleanup
```js
const pageController = new AbortController();
const { signal } = pageController;

document.addEventListener('click', onClick, { signal });
window.addEventListener('resize', onResize, { passive: true, signal });

function destroyPage() {
  pageController.abort(); // снимает все listeners
}
```

#### 4.2 Батч-рендер карточек
```js
function renderCards(items) {
  const frag = document.createDocumentFragment();
  for (const item of items) {
    frag.appendChild(createCardNode(item));
  }
  objectsList.replaceChildren(frag);
}
```

#### 4.3 Мемоизация фильтра
```js
const filterCache = new Map();
function getFiltered(list, params) {
  const key = JSON.stringify(params);
  if (filterCache.has(key)) return filterCache.get(key);
  const out = list.filter(/* ... */);
  filterCache.set(key, out);
  return out;
}
```

---

## 5) UI/UX анализ (что уже есть и где просадки)

### Уже есть на сайте
- Hero + CTA, каталог объектов с фильтрами, блог, FAQ, формы заявки/просмотра, карточка объекта с галереей/характеристиками.

### Слабые места конверсии
1. **Ранняя перегрузка выбором**: много фильтров до того, как пользователь сформировал критерии.
2. **Недостаток trust-сигналов в моменте решения**: рядом с CTA не всегда «соцдоказательство + сроки + гарантия ответа».
3. **Слабый flow для «не знаю что выбрать»**: квиз есть, но нужен более явный «guided funnel» прямо на листинге и карточке.
4. **Мало страховочных сценариев для “не подошёл объект”** (автоподписка на новые варианты/уведомления).

---

## 6) 20 новых UI/UX блоков (не повторяют базовые существующие)

1. **Smart Match Score** — блок «насколько объект подходит вам». Конверсия: ↑ вовлеченность. Размещение: под первым экраном карточки.
2. **Price Fairness Meter** — индикатор «ниже/в рынке/выше рынка». Конверсия: ↑ доверие к цене. Под ценой.
3. **Deal Readiness Checklist** — прогресс готовности к сделке (документы, ипотека, аванс). Конверсия: ↓ тревожность.
4. **Response SLA Badge** — обещание «ответ за N минут» + таймер. Конверсия: ↑ CTR по CTA.
5. **Next Best Action Panel** — персональный следующий шаг (звонок/просмотр/ипотека). Конверсия: ↑ micro-conversions.
6. **Neighborhood Pulse** — «что рядом и как меняется район» (школы, транспорт, спрос).
7. **Commute Time Comparator** — сравнение времени до ключевых точек.
8. **Offer Strategy Simulator** — калькулятор «стартовая оферта/торг/вероятность принятия».
9. **Viewing Route Optimizer** — подбор маршрута 2–4 просмотров за день.
10. **Buyer Confidence Timeline** — этапы сделки с текущим статусом.
11. **Silent Objection Block** — FAQ «что обычно пугает покупателей» + ответы.
12. **Lifestyle Fit Cards** — «для семьи/инвестора/переезда родителей».
13. **Micro-commitment Sticky Bar** — фиксбар: «получить PDF-отчёт по объекту».
14. **Local Expert Voice Note** — 30–45 сек аудио-комментарий риэлтера.
15. **Alternative Scenario Switcher** — «если бюджет +10% / -10%». 
16. **Urgency With Integrity** — честный индикатор активности (просмотры/сохранения за 7 дней).
17. **Renovation Potential Block** — потенциал ремонта с диапазоном бюджета.
18. **Family Safety Snapshot** — тихие улицы/освещение/детская инфраструктура.
19. **Auto Alerts Widget** — «сообщать о новых объектах по фильтру».
20. **Decision Recap Emailer** — отправка сравнения/заметок себе на email.

Минимальный каркас (пример для блока #1):
```html
<section class="smart-match" data-object-id="obj-21">
  <h2>Насколько объект вам подходит</h2>
  <div class="score" aria-live="polite">87%</div>
  <ul>
    <li>Бюджет: совпадает</li>
    <li>Район: близко к вашим точкам</li>
    <li>Площадь: +8 м² к минимуму</li>
  </ul>
  <button class="btn" id="recalcMatch">Уточнить критерии</button>
</section>
<script>
  document.getElementById('recalcMatch')?.addEventListener('click', () => {
    // открытие мини-квиза/модалки и пересчет score
  });
</script>
```

---

## 7) Улучшения админки

1. **Массовое редактирование**: таблица + multi-select + bulk actions (статус, цена, район, теги, публикация).
2. **Предпросмотр до публикации**: sandbox URL c noindex и мета-проверкой.
3. **SEO-поля на объект**: title, description, canonical override, OG image, robots.
4. **Валидатор карточки перед сохранением**: обязательные поля, размеры изображений, schema-проверка.
5. **Пакетная загрузка фото**: drag&drop, авто-webp/avif, авто-порядок, контроль веса.
6. **Контентные шаблоны**: быстрые сниппеты описаний для квартир/домов.
7. **Журнал изменений (audit trail)**: кто и что поменял.
8. **Быстрый дашборд SLA**: новые лиды, просроченные ответы, конверсия по источникам.
9. **Авто-генерация sitemap/rss после publish/unpublish**.
10. **One-click дубль объекта** для похожих лотов.

---

## 8) Roadmap внедрения

### Быстрые (1–2 дня)
- Серверный canonical/noindex для URL с query-параметрами.
- Убрать `no-store` для JSON, включить короткий HTTP-cache.
- Вынести и унифицировать helper-логику цены/площади в общий модуль.
- Добавить Response SLA Badge возле ключевых CTA.

### Средние (1 неделя)
- Рефактор JS на модульный lifecycle (`init/destroy`, AbortController).
- Внедрить 5 конверсионных блоков: Smart Match, Price Fairness, Auto Alerts, Next Best Action, Silent Objection.
- Расширить schema до `RealEstateListing` + `Offer` + `Residence`.
- Реализовать bulk-edit + preview в админке.

### Сложные (2+ недели)
- Полный performance-pass (critical CSS extraction, font diet, route-based JS splitting).
- Viewing Route Optimizer + Offer Strategy Simulator.
- Decision Recap Emailer и сценарии реактивации лидов.
- Расширенная аналитика воронки по этапам сделки.

### Приоритет по влиянию
1. **Конверсия**: SLA badge → Smart Match → Next Best Action → Auto Alerts.
2. **SEO**: server-side canonical/noindex → schema listing-model → кластерная перелинковка.
3. **Скорость**: cache policy JSON/статика → font/css cleanup → route-based JS.
