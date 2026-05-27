# Аудит подключения JS и CSS — turko.by

Дата: 2026-04-24

## Методология

Проанализированы 12 страниц (10 HTML + 2 PHP). Для каждой:

1. Извлечены все `<script src>` и `<link rel="stylesheet">` (включая `preload as="style"`).
2. Для каждого подключённого JS выявлены DOM-маркеры (ID/класс/data-attr), которые он запрашивает.
3. Проверено наличие этих маркеров на странице (включая случаи, когда скрипт сам инжектирует DOM — `cookie-consent.js`, `contact-widget.js`, `service-detail.js`).
4. Для CSS — поиск сигнатурных классов в HTML и проверка зависимости от других скриптов.

> Все рекомендации — **только анализ**. Никаких изменений в коде не сделано.

---

## КРИТИЧНО: полностью неиспользуемые файлы

| Файл | Статус |
|------|--------|
| `js/blog-list.js` | **Никогда не подключается** ни одной страницей. Можно удалить или подключить на `blog.html` (если задумывался для фильтра по тегам) |
| `css/privacy.css` | **Никогда не подключается** ни одной страницей (даже `Privacy.html` и `cookies-policy.html` его не используют) |

---

## PAGE: index.html

### JS

| Файл | Статус | Комментарий |
|---|---|---|
| `/site-version.js` | используется | глобальный cache-busting |
| `/js/swiper-bundle.min.js` | используется | слайдеры `.about-home-swiper`, `.testimonials-swiper`, `.service-swiper` |
| `/js/swiper.js` | используется | инициализация `.about-home-swiper`, `.testimonials-swiper` |
| `/js/home-recommended-slider.js` | используется | слайдер `.service-swiper` |
| `/js/optimize.js` | используется | хедер/нав/счётчики/turkoCard |
| `/js/footer-post.js` | используется | `#footer-recent-posts` |
| `/js/cookie-consent.js` | используется | `#cookieModal` (единственная страница, где DOM в HTML; на других страницах создаётся самим скриптом) |
| `/js/analytics-consent-loader.js` | используется | подключает Метрику/GTM по согласию |
| `https://cdn.jsdelivr.net/...chart.js` | используется | требуется для `market-analytics.js` |
| `/js/live-price.js` | используется | экспортирует `window.RealterPrice`, нужно `market-analytics.js` |
| `/js/market-analytics.js` | используется | `#market-price-chart` |
| `/js/blog-smart-badge.js` | используется | `#blogBadge` |
| `/js/objects-smart-badge.js` | используется | `#objectsBadge` |
| `/js/filters-custom-select.js` | используется | в карточках с `.objects-filters` |
| `/js/documents-checklist.js` | используется | `#documentsChecklistModal` |
| `/js/client-quiz.js` | используется | `#clientQuizModal` |
| `/js/sw-register.js` | используется | регистрация SW |
| `contact-widget.js` | используется | `#cw-modal` |
| `/js/nav-market-status.js` | используется | `#marketStatus` (единственная страница!) |

### CSS

| Файл | Статус |
|---|---|
| `/css/bootstrap.min.css` | используется |
| `/css/style.css` | используется |
| `/css/documents-checklist.css` | используется |
| `/css/client-quiz.css` | используется |
| `/css/swiper-bundle.css` | используется |
| `/css/swiper.css` | используется |
| `/css/fontawesome/css/fontawesome.min.css` | используется |
| `/css/fontawesome/css/brands.min.css` | частично (только WhatsApp/TG/Viber иконки) |
| `/css/fontawesome/css/regular.min.css` | проверить — почти все иконки на сайте solid |
| `/css/fontawesome/css/solid.min.css` | используется |
| `/css/flaticon.min.css` | используется (6 классов `flaticon-*` найдено) |
| `/css/blog-badge.css` | используется |
| `/css/nav-market-status.css` | используется |
| `/css/contact-widget.css` | используется |

> В `<head>` дублируются `swiper-bundle.css`, `swiper.css`, fontawesome-блок, `flaticon.min.css`, `blog-badge.css`, `nav-market-status.css` — они подключены **дважды**: один раз через `<link rel="preload" as="style">` + один раз через обычный `<link rel="stylesheet">`. Это нормально (preload + stylesheet — типовой паттерн), но `nav-market-status.css?v=8` в preload и `nav-market-status.css` без версии в stylesheet — **разные URL → двойная загрузка одного файла**.

---

## PAGE: nedvizhimost-lida.html (каталог объектов)

### JS

| Файл | Статус |
|---|---|
| `/site-version.js` | используется |
| `/js/optimize.js` | используется (header/nav) |
| `/js/analytics-consent-loader.js` | используется |
| `/js/cookie-consent.js` | используется (создаёт DOM сам) |
| `/js/footer-post.js` | используется (`#footer-recent-posts`) |
| `/js/live-price.js` | используется (нужен `filters.js`) |
| `/js/filters.js` | используется (`#objectsList`, `#priceFrom`, `#typeSelect`) |
| `/js/filters-custom-select.js` | используется (`.objects-filters select`) |
| `/js/objects-smart-badge.js` | **НЕ используется** — `#objectsBadge` есть только на `index.html` |
| `/js/sw-register.js` | используется |
| `contact-widget.js` | используется |

### CSS

| Файл | Статус |
|---|---|
| `css/bootstrap.min.css` | используется |
| `css/flaticon.min.css` | **НЕ используется** (нет ни одного `flaticon-*` класса) |
| `css/style.css` | используется |
| fontawesome (4 файла) | только `solid` + `brands` нужны |
| `/css/contact-widget.css` | используется |

---

## PAGE: blog.html (список статей)

### JS

| Файл | Статус |
|---|---|
| `/site-version.js` | используется |
| `/js/blog-tags.js` | используется (`#tags-filter`/`#post-tags`) |
| `/js/blog-views.js` | используется (инжектит `data-blog-views-id` в карточки) |
| `/js/blog-sidebar.js` | используется (`#blogGridList`, `#bsbCatList`) |
| `/js/calendar-sidebar.js` | используется (`.blog-calendar-sidebar`) |
| `/js/optimize.js` | используется |
| `/js/analytics-consent-loader.js` | используется |
| `/js/cookie-consent.js` | используется |
| `/js/footer-post.js` | используется |
| `/js/blog-smart-badge.js` | **НЕ используется** — `#blogBadge` есть только на `index.html` |
| `/js/sw-register.js` | используется |
| `contact-widget.js` | используется |

### CSS

| Файл | Статус |
|---|---|
| `css/bootstrap.min.css` | используется |
| `css/flaticon.min.css` | **НЕ используется** |
| `/css/blog-tags.css` | используется |
| `/css/blog-views.css` | используется |
| `/css/contact-widget.css` | используется |
| `/css/calendar-sidebar.css` | используется |
| `/css/blog-sidebar.css` | используется |

> Не подключён `style.css` — проверить, не нужны ли стили хедера/футера. Если хедер/футер инлайнятся отдельным шаблоном — нормально.

---

## PAGE: blog-detail.php

### JS

| Файл | Статус |
|---|---|
| `/site-version.js` | используется |
| `/js/optimize.js` | используется |
| `/js/blog-tags.js` | используется (`#post-tags`) |
| `/js/blog-views.js` | используется (инжектит счётчик в `#post-views-badge`) |
| `/js/analytics-consent-loader.js` | используется |
| `/js/cookie-consent.js` | используется |
| `/js/blog-detail.js` | используется (рендерит контент статьи) |
| `/js/footer-post.js` | используется |
| `/js/blog-smart-badge.js` | **НЕ используется** — `#blogBadge` нет на этой странице |
| `/js/sw-register.js` | используется |
| `contact-widget.js` | используется |

### CSS

| Файл | Статус |
|---|---|
| `css/bootstrap.min.css` | используется |
| `css/flaticon.min.css` | **НЕ используется** |
| `css/style.css` | используется |
| fontawesome (4 файла) | regular/brands проверить |
| `/css/blog-tags.css` | используется |
| `/css/blog-views.css` | используется |
| `/css/blog-related.css` | используется (блок «По теме») |
| `/css/contact-widget.css` | используется |

---

## PAGE: object-detail.php

### JS

| Файл | Статус |
|---|---|
| `/site-version.js` | используется |
| `/js/optimize.js` | используется |
| `/js/live-price.js` | используется (нужен `object-detail.js` и `mortgage-calculator.js`) |
| `/js/mortgage-programs.js` | используется (на странице 36 элементов `mortgage*`: `#mortgageProgram`, `#mortgagePrice` и т.д.) |
| `/js/mortgage-calculator.js` | используется |
| `/js/object-detail.js` | используется (основной рендерер карточки + Swiper галереи + карта) |
| `/js/analytics-consent-loader.js` | используется |
| `/js/cookie-consent.js` | используется |
| `/js/footer-post.js` | используется |
| `/js/viewing-booking.js` | используется (`#viewing-booking-form`) |
| `/libs/maplibre/maplibre-gl.js` | используется |
| `/js/objects-smart-badge.js` | **НЕ используется** — `#objectsBadge` есть только на `index.html` |
| `/js/sw-register.js` | используется |
| `contact-widget.js` | используется |

### CSS

| Файл | Статус |
|---|---|
| `css/bootstrap.min.css` | используется |
| `css/flaticon.min.css` | **НЕ используется** |
| `/css/swiper-bundle.css` | используется (галерея фото объекта инициализируется внутри `object-detail.js`) |
| `/css/swiper.css` | проверить — этот файл содержит кастомные стили для `.about-home-swiper` и `.testimonials-swiper`, которых **нет** на странице. Скорее всего **НЕ нужен**. |
| fontawesome (4 файла) | regular/brands проверить |
| `/libs/maplibre/maplibre-gl.css` | используется |
| `css/style.css` | используется |
| `/css/object-share.css` | используется |
| `/css/contact-widget.css` | используется |

---

## PAGE: services-detail.php

### JS

| Файл | Статус |
|---|---|
| `/site-version.js` | используется |
| `/js/optimize.js` | используется |
| `/js/analytics-consent-loader.js` | используется |
| `/js/cookie-consent.js` | используется |
| `/js/footer-post.js` | используется |
| `/js/service-detail.js` | используется (главный рендерер: читает `/data/services.json`, генерирует FAQ, разделы и т.д.) |
| `/js/sw-register.js` | используется |
| `contact-widget.js` | используется |

### CSS

| Файл | Статус |
|---|---|
| `css/bootstrap.min.css` | используется |
| `css/flaticon.min.css` | **НЕ используется** |
| fontawesome (4 файла) | regular/brands проверить |
| `/css/contact-widget.css` | используется |

> Не подключён `style.css` — проверьте визуальное оформление: возможно, страница опирается на global CSS, который не подключён напрямую.

---

## PAGE: about.html

### JS — все используются

`site-version.js`, `optimize.js` (нужен для `#turkoCard`, `hubDiagram` и др.), `analytics-consent-loader.js`, `cookie-consent.js`, `footer-post.js`, `sw-register.js`, `contact-widget.js`

### CSS

| Файл | Статус |
|---|---|
| `css/bootstrap.min.css` | используется |
| `css/flaticon.min.css` | **НЕ используется** |
| fontawesome (4 файла) | regular/brands проверить |
| `/css/Hub.css` | используется (62 класса `hub-*` на странице) |
| `/css/contact-widget.css` | используется |

> В `<head>` НЕ подключены `about-video-premium.css` и `client-trust-wall.css`, хотя соответствующие классы (`.about-video-premium`, `.client-trust-wall__message`) **есть в HTML и в `style.css`**. Если визуально всё в порядке — стили вшиты в `style.css`; если эти файлы — отдельные, они **не загружаются**. Проверить.

---

## PAGE: contact.html

### JS

| Файл | Статус |
|---|---|
| `/site-version.js` | используется |
| `/js/optimize.js` | используется |
| `/js/analytics-consent-loader.js` | используется |
| `/js/cookie-consent.js` | используется |
| `/js/footer-post.js` | используется |
| `/js/sw-register.js` | используется |
| `contact-widget.js` | используется |

### CSS

| Файл | Статус |
|---|---|
| `css/bootstrap.min.css` | используется |
| `css/flaticon.min.css` | **НЕ используется** |
| fontawesome (4 файла) | regular/brands проверить |
| `/css/contact-widget.css` | используется |

---

## PAGE: faq.html

### JS

| Файл | Статус |
|---|---|
| `/site-version.js` | используется |
| `/js/optimize.js` | используется |
| `/js/analytics-consent-loader.js` | используется |
| `/js/cookie-consent.js` | используется |
| `/js/footer-post.js` | используется |
| `/js/delay-calc.js` | используется (`#delayCalcForm`) |
| `contact-widget.js` | используется |

> Не подключён `sw-register.js` (есть на всех остальных страницах) — может быть забыто.

### CSS

| Файл | Статус |
|---|---|
| `css/bootstrap.min.css` | используется |
| `css/flaticon.min.css` | **НЕ используется** |
| `css/style.css` | используется |
| fontawesome (4 файла) | regular/brands проверить |
| `/css/contact-widget.css` | используется |
| `/css/delay-calc.css` | используется |

---

## PAGE: 404.html

### JS — все используются

`site-version.js`, `optimize.js`, `footer-post.js`, `sw-register.js`, `contact-widget.js`

> Не подключены `cookie-consent.js` и `analytics-consent-loader.js` — пользователь, попавший на 404, не увидит баннер cookies и не учтётся в Метрике. Возможно, осознанно — но стоит проверить.

### CSS

| Файл | Статус |
|---|---|
| fontawesome (4 файла) | regular/brands проверить |
| `/css/contact-widget.css` | используется |

> Не подключены `bootstrap.min.css` и `style.css`. Если страница использует bootstrap-классы (`.container`, `.row`) — они не сработают. Проверить визуально.

---

## PAGE: cookies-policy.html

### JS

| Файл | Статус |
|---|---|
| `/js/cookie-consent.js` | используется (модалка настроек cookies) |
| `/js/analytics-consent-loader.js` | используется |
| `/js/sw-register.js` | используется |
| `contact-widget.js` | используется |

### CSS

| Файл | Статус |
|---|---|
| fontawesome (только fontawesome + solid) | используется |
| `/css/contact-widget.css` | используется |

> Минимальный набор — корректно. Текст оформлен инлайн-стилями.

---

## PAGE: Privacy.html

### JS

| Файл | Статус |
|---|---|
| `/js/sw-register.js` | используется |
| `contact-widget.js` | используется |

### CSS

| Файл | Статус |
|---|---|
| fontawesome (только fontawesome + solid) | используется |
| `/css/contact-widget.css` | используется |

> Минимально. Стили — инлайн.

---

## СВОДНАЯ ТАБЛИЦА: лишние подключения по страницам

| Страница | Файлы, которые можно убрать |
|---|---|
| `nedvizhimost-lida.html` | `js/objects-smart-badge.js`, `css/flaticon.min.css` |
| `blog.html` | `js/blog-smart-badge.js`, `css/flaticon.min.css` |
| `blog-detail.php` | `js/blog-smart-badge.js`, `css/flaticon.min.css` |
| `object-detail.php` | `js/objects-smart-badge.js`, `css/swiper.css` (только `swiper-bundle.css` нужен), `css/flaticon.min.css` |
| `services-detail.php` | `css/flaticon.min.css` |
| `about.html` | `css/flaticon.min.css` |
| `contact.html` | `css/flaticon.min.css` |
| `faq.html` | `css/flaticon.min.css` |
| `404.html` | (всё нужно) |
| `index.html` | проверить дубль `nav-market-status.css` (с `?v=8` и без) |

---

## Файлы, которые используются ровно на одной странице

| Файл | Только на |
|---|---|
| `js/home-recommended-slider.js` | index.html |
| `js/swiper.js` (кастом) | index.html |
| `js/swiper-bundle.min.js` | index.html |
| `js/market-analytics.js` + chart.js CDN | index.html |
| `js/nav-market-status.js` | index.html |
| `js/blog-smart-badge.js` (реально используется) | index.html |
| `js/objects-smart-badge.js` (реально используется) | index.html |
| `js/client-quiz.js` | index.html |
| `js/documents-checklist.js` | index.html |
| `js/blog-list.js` | **нигде** (мёртвый файл) |
| `js/blog-sidebar.js` | blog.html |
| `js/calendar-sidebar.js` | blog.html |
| `js/blog-detail.js` | blog-detail.php |
| `js/filters.js` | nedvizhimost-lida.html |
| `js/filters-custom-select.js` | nedvizhimost-lida.html + index.html |
| `js/object-detail.js` | object-detail.php |
| `js/mortgage-calculator.js` | object-detail.php |
| `js/mortgage-programs.js` | object-detail.php |
| `js/viewing-booking.js` | object-detail.php |
| `js/service-detail.js` | services-detail.php |
| `js/delay-calc.js` | faq.html |
| `js/live-price.js` | index + nedvizhimost + object-detail |
| `css/blog-badge.css`, `css/client-quiz.css`, `css/documents-checklist.css`, `css/swiper.css`, `css/swiper-bundle.css`, `css/nav-market-status.css` | index.html |
| `css/Hub.css`, `css/about-video-premium.css`, `css/client-trust-wall.css` | about.html |
| `css/object-share.css` | object-detail.php |
| `css/blog-tags.css`, `css/blog-views.css` | blog.html + blog-detail.php |
| `css/blog-related.css` | blog-detail.php |
| `css/blog-sidebar.css`, `css/calendar-sidebar.css` | blog.html |
| `css/delay-calc.css` | faq.html |

---

## ВЫВОДЫ И РЕКОМЕНДАЦИИ

### 1. Удалить лишние подключения (безопасно сейчас)

```diff
# blog.html, blog-detail.php
- <script src="/js/blog-smart-badge.js" ...>

# nedvizhimost-lida.html, object-detail.php
- <script src="/js/objects-smart-badge.js" ...>

# object-detail.php
- <link rel="stylesheet" href="/css/swiper.css">
- <link rel="preload" as="style" href="/css/swiper.css">

# Все страницы кроме index.html
- <link rel="stylesheet" href="css/flaticon.min.css">
```

**Эффект:** ~5–8 KB GZIP на каждую страницу + 4 устранённых HTTP-запроса на каталоге, blog, blog-detail, object-detail.

### 2. Удалить мёртвые файлы

```bash
js/blog-list.js          # никем не подключается
css/privacy.css          # никем не подключается
```

> Сначала проверьте, не планировалось ли их использование в `Privacy.html`/`cookies-policy.html`.

### 3. Дубль в `index.html` — `nav-market-status.css`

```html
<link rel="preload" as="style" href="/css/nav-market-status.css?v=8">
<link rel="stylesheet" href="/css/nav-market-status.css">   ← без версии!
```

URL разные → браузер скачает файл дважды. Привести к одной строке с `?v=8`.

### 4. FontAwesome — раздельные CSS

Сейчас на каждой странице, кроме `cookies-policy.html`/`Privacy.html`, грузятся **4 файла FA** (`fontawesome` + `brands` + `regular` + `solid`).

- `regular` (`.far`) почти не используется — проверить grep'ом по реальным иконкам.
- `brands` (`.fab`) нужен только там, где есть соц-иконки (`fa-brand-whatsapp` и т.п.).
- На `services-detail.php`, `faq.html`, `about.html`, `contact.html`, `nedvizhimost-lida.html` — оставить только `fontawesome.min.css` + `solid.min.css`.

**Эффект:** ~60–80 KB на страницу.

### 5. Проверить визуально (риск ошибки разметки)

- `404.html` — нет `bootstrap.min.css` и `style.css`. Если в разметке используются `.container`, `.row` — они «лысые».
- `services-detail.php`, `blog.html` — нет `style.css`. Возможно стили общего хедера/футера лежат в `bootstrap.min.css` или инлайн, но это нетипично.
- `about.html` — есть классы `.about-video-premium__*` и `.client-trust-wall__*`, но соответствующие CSS-файлы не подключены. Стили могут уже быть скопированы в `style.css` — проверить, иначе блоки ломаются.
- `faq.html` — нет `sw-register.js` (на всех остальных есть).

### 6. Стратегия загрузки JS

Большинство `<script>` уже стоят в конце `</body>` — это хорошо. Дополнительно:

| Скрипт | Рекомендация |
|---|---|
| `analytics-consent-loader.js` | `defer` — подгрузка Метрики/GTM не блокирует рендер |
| `cookie-consent.js` | `defer` — баннер появляется после загрузки |
| `contact-widget.js` | уже отложен через `requestIdleCallback` внутри — оставить как есть |
| `sw-register.js` | `defer` или `async` |
| `footer-post.js` | `defer` — наполняет футер |
| `blog-smart-badge.js` / `objects-smart-badge.js` (только index) | `defer` |
| `nav-market-status.js` | `defer` |
| `chart.js` (CDN) + `market-analytics.js` | **lazy load** через `IntersectionObserver` на `#market-price-chart` — экономия ~70 KB на главной до скролла |
| `client-quiz.js`, `documents-checklist.js` | **dynamic `import()`** при первом клике на кнопку открытия модалки — модалки пользователю не нужны при первой загрузке |
| `viewing-booking.js` | dynamic import при клике «Записаться на показ» |
| `mortgage-calculator.js` + `mortgage-programs.js` | dynamic import при скролле к секции ипотеки на `object-detail.php` |
| `maplibre-gl.js` (~700 KB!) | lazy load через `IntersectionObserver` на `#objectMap` — это самый тяжёлый скрипт сайта |

### 7. CSS-стратегия

- **Critical CSS** — выделить inline в `<head>` стили хедера, hero-блока (`bootstrap` Reset + `style.css` для шапки и первого экрана). Остальное — `<link>` в конце `<head>`.
- **`fontawesome` + `flaticon`** — добавить `media="print" onload="this.media='all'"` для отложенной загрузки (иконки не критичны для первого рендера).
- **`swiper-bundle.css` + `swiper.css`** — объединить в один минифицированный файл (на index.html они оба используются вместе).
- **Page-specific CSS** уже правильно разделён (`Hub.css`, `client-quiz.css`, `delay-calc.css`, `object-share.css` и т.д.) — сохранить этот подход.
- **`bootstrap.min.css`** — если используется только `grid`/`utilities` — собрать кастомную сборку Bootstrap (только нужные модули). Полный bootstrap ~200 KB; кастомный — 30–50 KB.

### 8. Сводный потенциал оптимизации

| Действие | Экономия на странице |
|---|---|
| Убрать неиспользуемые JS/CSS (см. п.1) | 5–10 KB |
| Убрать `flaticon.min.css` с 8 страниц | 5–8 KB × 8 |
| Раздельная загрузка FA (только нужные стили) | 60–80 KB |
| Lazy load `chart.js` + `market-analytics` | 70 KB (главная) |
| Lazy load `maplibre` | 700 KB (object-detail!) |
| Dynamic import модалок | 15–25 KB до открытия |

**Итого** при полном внедрении: главная экономит ~90 KB до скролла, страница объекта — до **800 KB** до показа карты.

---

## Что НЕ нужно трогать

- `optimize.js` — глобальный, нужен на всех страницах (хедер, мобильная навигация, sticky, аккордеоны).
- `sw-register.js` — service worker.
- `site-version.js` — fallback для cache-busting.
- `cookie-consent.js` — самоинжектит DOM, нужен для GDPR-флоу.
- `contact-widget.js` — самоинжектит виджет, есть на всех страницах.
- `analytics-consent-loader.js` — подключает аналитику только после согласия.
