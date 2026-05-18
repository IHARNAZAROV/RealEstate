<div align="center">

# Realter · turko.by

**Профессиональный сайт риэлтора Ольги Турко (Лида, Беларусь):** каталог недвижимости, блог, услуги, заявки на просмотр и контент на русском языке.

[![License: MIT](https://img.shields.io/badge/License-MIT-teal.svg)](LICENSE)
[![Stack](https://img.shields.io/badge/stack-HTML%20%7C%20PHP%20%7C%20Vanilla%20JS-0d9488)](https://github.com/IHARNAZAROV/realter)
[![PHP](https://img.shields.io/badge/PHP-8.2-777BB4?logo=php&logoColor=white)](https://www.php.net/)
[![Node utilities](https://img.shields.io/badge/Node.js-20+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/) *(опционально, только скрипты данных)*
[![Live](https://img.shields.io/badge/site-turko.by-success)](https://turko.by/)

<br />

<img src="images/main-slider/1.webp" alt="Главный экран turko.by — слайдер и призыв к действию" width="920" />

*Главная страница: hero-слайдер и ключевые блоки (WebP).*

</div>

---

## О проекте

Публичный маркетинговый и каталожный веб-проект: статические HTML-страницы и PHP-шаблоны для динамических маршрутов, данные объектов в JSON, лёгкий фронтенд без SPA-фреймворков. Подходит для классического shared-хостинга с PHP и для локальной разработки через встроенный сервер PHP.

### Ключевые возможности

| Область | Что реализовано |
|--------|------------------|
| Каталог | Список объектов, фильтры, карточки с медиа |
| Объект | `object-detail.php` — галерея, карта (MapLibre), FAQ, форма записи на просмотр |
| Контент | Блог (`blog-detail.php`), услуги, районы (`raion.php`), RSS |
| Интеграции | Telegram-уведомления из `api/book-viewing.php`, PWA manifest, service worker |
| Администрирование | Каталог `adminka_objects/` для работы с JSON-данными (защита по паролю на сервере) |

### Почему так устроено

- **Предсказуемый стек:** нет обязательного npm-сборщика — деплой копированием файлов.
- **SEO и скорость:** семантика, мета-теги, Open Graph, sitemap, lazy-load изображений, разделение критичных и отложенных стилей.
- **Поддерживаемость:** данные отделены в `data/`, обслуживающая логика — в `scripts/*.cjs`.

---

## Технологический стек

| Слой | Технологии |
|------|------------|
| Разметка | HTML5, PHP-шаблоны для ЧПУ (`router.php`) |
| Стили | CSS (модульные файлы в `css/`), **Bootstrap** (минифицированный), **Swiper** CSS, **Font Awesome** (локально в `css/fontawesome/`) |
| Скрипты | **Vanilla JavaScript (ES6+)**, без React/Vue/Angular |
| Слайдеры | **Swiper** (`js/swiper-bundle.min.js`, кастомная инициализация в `js/swiper.js`) |
| Карты | **MapLibre GL** (вендор в `libs/maplibre/`, динамическая подгрузка в `js/object-detail.js`) |
| Бэкенд | PHP 8.x — API, роутинг, версионирование статики |
| Данные | JSON (`data/objects.json`, `data/objects/*.json`, `data/blog-articles.json` и др.) |
| Утилиты | Node.js (`*.cjs`) — валидация, бэкапы, sitemap, курсы НБРБ, RSS |

> В репозитории **нет** исходников на SCSS/Sass и **нет** GSAP — анимации строятся на CSS и возможностях Swiper (в т.ч. parallax).

---

## Возможности (features)

- Адаптивная вёрстка под мобильные, планшеты и десктоп
- Hero- и контентные **слайдеры** (главная, «О себе», отзывы, объекты услуг)
- **Lazy loading** и `decoding="async"` для изображений на ключевых шаблонах
- **Производительность:** preload шрифтов и LCP-изображения, отложенная загрузка части CSS, service worker для статики
- **SEO:** `meta`, canonical, `robots.txt`, `sitemap.xml`, Open Graph / Twitter Card, JSON-LD (в т.ч. `Product`, `FAQPage`, хлебные крошики на карточке объекта)
- **Доступность:** осмысленные `alt`, `aria-label` на контролах слайдеров, блокировка скролла и ловушка фокуса в контактной панели (`js/optimize.js`, `js/contact-widget.js`)
- Онлайн-калькулятор ипотеки, квиз, чеклисты документов — отдельные JS-модули под страницы

---

## Структура репозитория

```text
realter/
├── api/                    # PHP API (напр. заявка на просмотр → Telegram)
├── adminka_objects/        # Внутренние инструменты для JSON/блога (не индексируется в robots)
├── css/                    # Стили: Bootstrap, Swiper, компоненты, Font Awesome
├── data/                   # Источники данных: objects, blog, services…
│   └── objects/            # По одному JSON на объект (генерация/сплит скриптами)
├── docs/                   # Внутренняя документация (аудиты и т.п.)
├── fonts/                  # Self-hosted шрифты (Inter, Montserrat)
├── images/, media/         # Изображения, видео
├── js/                     # Клиентская логика страниц и виджетов
├── libs/maplibre/          # Локальная поставка MapLibre GL (JS + CSS)
├── scripts/                # Node.js: бэкап, валидация, sitemap, курсы, meta…
├── router.php              # ЧПУ: /objects/{slug}, /blog/{slug}, /raion/{slug}, алиасы HTML
├── index.html, *.html      # Статические страницы
├── object-detail.php       # Карточка объекта по slug
├── blog-detail.php, raion.php, services-detail.php …
├── js/sw.js                   # Service Worker (кеш только статики)
├── site-version.php        # Cache-busting: window.SITE_VERSION (mtime .deploy или time)
├── js/generate-rss.js         # Генерация rss.xml
├── sitemap.xml             # Результат generate-sitemap.cjs (коммитится/обновляется скриптом)
└── robots.txt
```

---

## Установка и запуск

### Требования

- **PHP 8.1+** (в проекте ориентир на 8.2 — см. `.replit`)
- **Node.js 18+** — только если нужны скрипты в `scripts/` и `js/generate-rss.js`

### Клонирование

```bash
git clone https://github.com/IHARNAZAROV/realter.git
cd realter
```

### Локальный сервер (рекомендуется)

ЧПУ и PHP-страницы работают через `router.php`:

```bash
php -S 0.0.0.0:5000 -t . router.php
```

Откройте в браузере `http://localhost:5000/`.

<details>
<summary><strong>Без router.php</strong> (только статика)</summary>

Можно открыть `index.html` напрямую или поднять любой static server, но **маршруты вида `/objects/slug` и PHP-формы работать не будут**.

</details>

### «Сборка» и превью

Отдельного шага сборки фронтенда **нет**: CSS/JS уже в репозитории в готовом виде (включая минифицированные библиотеки). «Превью» = запуск PHP-сервера выше.

### Обновление данных и артефактов SEO

После правок JSON-данных имеет смысл прогнать пайплайн:

```bash
node scripts/update-all.cjs
```

В конце выполняется `generate-sitemap.cjs` → обновляется `sitemap.xml`.

RSS:

```bash
node js/generate-rss.js
```

---

## Скрипты (Node.js)

В проекте **нет** `package.json`; команды запускаются напрямую через `node`.

| Команда | Назначение |
|---------|------------|
| `node scripts/update-all.cjs` | Полный цикл: бэкап → валидация → split объектов → meta → цены BYN → sitemap |
| `node scripts/backup-objects.cjs` | Резервная копия `data/objects.json` в `backups/` |
| `node scripts/validate-objects.cjs` | Проверка структуры данных объектов |
| `node scripts/split-objects.cjs` | Разбиение агрегированного JSON на `data/objects/*.json` |
| `node scripts/update-meta-descriptions.cjs` | Обновление мета-описаний из данных |
| `node scripts/update-prices-byn.cjs` | Пересчёт цен в BYN по курсу НБРБ |
| `node scripts/generate-sitemap.cjs` | Генерация `sitemap.xml` |
| `node js/generate-rss.js` | Генерация `rss.xml` |

---

## Производительность

- **LCP / приоритеты:** `preload` для ключевого hero-изображения и шрифтов (`index.html` и др.).
- **CSS:** критичные стили подключаются сразу; часть стилей Swiper подгружается с паттерном `preload` → `stylesheet` on load.
- **Изображения:** формат **WebP** в слайдерах и контенте; `loading="lazy"` и `decoding="async"` на ряде шаблонов.
- **Service Worker (`js/sw.js`):** кешируется только статика (шрифты, иконки, логотипы); JSON и картинки объектов идут в сеть — актуальность данных не страдает.
- **Версионирование статики:** `data-versioned` / `SITE_VERSION` для сброса кеша браузера после деплоя.
- **Минификация:** используются готовые `.min.css` / `.min.js` для крупных библиотек; отдельного webpack/vite в репозитории нет (**tree shaking / code splitting как у фреймворчного бандла не применяются**).

---

## SEO

- Уникальные **`<title>`** и **`<meta name="description">`**, **canonical**, `meta robots`
- **Open Graph** и **Twitter Card** для шаринга
- **`robots.txt`** с `Sitemap:` и правилами для служебных путей
- **`sitemap.xml`** — генерация из статических URL и JSON (`scripts/generate-sitemap.cjs`)
- **Структурированные данные** Schema.org (JSON-LD + микроразметка FAQ на карточке объекта)
- **RSS** (`js/generate-rss.js` → `rss.xml`)
- **PWA:** `site.webmanifest`, иконки

---

## Адаптивность

Вёрстка опирается на сетки и компоненты Bootstrap и кастомные брейкпоинты в CSS: контент и навигация перестраиваются от узких экранов к широким. Новые блоки лучше проектировать **mobile-first** (сначала мобильный вид, затем усиление для `md`/`lg`).

---

## Поддержка браузеров

Ориентир — **современные evergreen-браузеры** (последние Chrome, Firefox, Safari, Edge) с поддержкой ES6+, CSS Grid/Flexbox, Service Worker и динамического `import()` там, где он используется. Internet Explorer не является целевой платформой.

---

## Заметки для разработчиков

- **Архитектура:** «толстый» статический HTML + точечный PHP для динамических страниц и API; маршрутизация централизована в `router.php`.
- **Vanilla JS:** бизнес-логика разбита по файлам в `js/` (фильтры, деталь объекта, блог, виджет связи и т.д.) без единого фреймворкового рантайма.
- **Данные:** источник истины для листинга — JSON; скрипты в `scripts/` поддерживают целостность и производные поля.
- **Безопасность Telegram:** для продакшена задайте переменные окружения **`TELEGRAM_BOT_TOKEN`**, **`TELEGRAM_CHAT_IDS`** (и при необходимости **`TELEGRAM_USERNAMES`**) на сервере; не храните реальные токены в публичных ветках и issue.

---

## Деплой

### Текущий продакшен (по артефактам репозитория)

- Публичный сайт: **[turko.by](https://turko.by/)**
- В корне есть **`.cpanel.yml`**: деплой через **rsync** из git-директории хостинга в `public_html` (типичный сценарий **cPanel**).

### Replit

Файл `.replit` задаёт запуск `php -S 0.0.0.0:5000 -t . router.php` для разработки и webview.

### Прочие платформы

Сайт можно разместить на любом хостинге с **PHP** и возможностью **записи/чтения JSON** (и опционально защищённой админки). Чистый **GitHub Pages / Netlify static-only** подойдёт только для статического среза **без** PHP-маршрутов, формы записи на просмотр и динамических карточек.

После выкладки полезно обновить маркер деплоя (например, **touch `.deploy`**) — от этого зависит `version.php` / сброс кеша статики.

---

## Участие в разработке

1. Fork репозитория  
2. Ветка: `git checkout -b feat/кратко-о-задаче`  
3. Атомарные коммиты с понятными сообщениями  
4. Pull Request с описанием изменений; для UI — скриншоты до/после  
5. Уважайте существующий стиль кода и не коммитьте секреты (.env, токены ботов)

---

## Лицензия

Проект распространяется под лицензией **MIT** — см. файл [LICENSE](LICENSE).

---

## Авторы и контакты

- **Риэлтор / контент:** Ольга Турко — сайт [turko.by](https://turko.by/)  
- **Репозиторий:** [IHARNAZAROV/realter](https://github.com/IHARNAZAROV/realter)
