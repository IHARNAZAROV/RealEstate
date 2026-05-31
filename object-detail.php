<?php
$rawSlug = isset($_GET['slug']) ? $_GET['slug'] : '';
$slug = preg_replace('/[^a-zA-Z0-9_\-]/', '', $rawSlug);
$canonicalUrl = $slug !== '' ? "https://germesgarant.by/objects/$slug" : "https://germesgarant.by/objects";

// Resolve OG image and title from objects.json by slug
$ogImage = "https://germesgarant.by/images/main-slider/2.webp";
$ogTitle = "Объект недвижимости в Лиде — Ольга Турко";
$ogDescription = "Детальная карточка объекта недвижимости в Лиде: фото, параметры, цена и консультация риэлтера Ольги Турко.";
$breadcrumbLeafName = "Объект недвижимости";
$currentObject = null;
if ($slug !== '') {
    $objectsFile = __DIR__ . '/data/objects.json';
    if (is_file($objectsFile)) {
        $objectsData = json_decode(file_get_contents($objectsFile), true);
        if (is_array($objectsData)) {
            foreach ($objectsData as $obj) {
                if (isset($obj['slug']) && $obj['slug'] === $slug) {
                    $currentObject = $obj;
                    if (isset($obj['id']) && preg_match('/(\d+)/', (string)$obj['id'], $m)) {
                        $picPath = "/images/objects/pic{$m[1]}.webp";
                        if (is_file(__DIR__ . $picPath)) {
                            $ogImage = "https://germesgarant.by{$picPath}";
                        }
                    }
                    if (!empty($obj['title'])) {
                        $ogTitle = $obj['title'] . ' — Ольга Турко, риэлтер в Лиде';
                        $breadcrumbLeafName = $obj['title'];
                    }
                    if (!empty($obj['cardDescription'])) {
                        $ogDescription = mb_substr(trim($obj['cardDescription']), 0, 280);
                    }
                    break;
                }
            }
        }
    }
}

$jsonLdProduct = null;
if (is_array($currentObject)) {
    $descriptionSource = $currentObject['description'] ?? ($currentObject['cardDescription'] ?? '');
    $description = mb_substr(trim(strip_tags((string)$descriptionSource)), 0, 280);
    $images = array_values(array_filter(array_map(
        static function ($path) {
            if (!is_string($path) || $path === '') {
                return null;
            }

            return 'https://germesgarant.by' . $path;
        },
        $currentObject['images'] ?? []
    )));
    $isSold = isset($currentObject['status']['type']) && $currentObject['status']['type'] === 'sold';
    $category = (($currentObject['type'] ?? '') === 'Дом') ? 'House' : 'Apartment';

    $jsonLdProduct = [
        '@context' => 'https://schema.org',
        '@type' => 'Product',
        'name' => $currentObject['title'] ?? $breadcrumbLeafName,
        'description' => $description,
        'image' => $images,
        'sku' => $currentObject['id'] ?? null,
        'category' => $category,
        'brand' => [
            '@type' => 'RealEstateAgent',
            'name' => 'Ольга Турко',
            'url' => 'https://germesgarant.by/',
        ],
        'offers' => [
            '@type' => 'Offer',
            'priceCurrency' => 'BYN',
            'price' => $currentObject['priceBYN'] ?? null,
            'availability' => $isSold ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
            'url' => $canonicalUrl,
            'priceValidUntil' => date('Y-12-31'),
            'seller' => [
                '@type' => 'RealEstateAgent',
                'name' => 'Ольга Турко',
                'telephone' => '+375291809516',
            ],
        ],
        'additionalProperty' => array_values(array_filter([
            isset($currentObject['areaTotal']) ? ['@type' => 'PropertyValue', 'name' => 'Площадь общая', 'value' => $currentObject['areaTotal']] : null,
            isset($currentObject['areaLiving']) ? ['@type' => 'PropertyValue', 'name' => 'Площадь жилая', 'value' => $currentObject['areaLiving']] : null,
            isset($currentObject['areaPlot']) ? ['@type' => 'PropertyValue', 'name' => 'Участок (соток)', 'value' => $currentObject['areaPlot']] : null,
            isset($currentObject['rooms']) ? ['@type' => 'PropertyValue', 'name' => 'Комнат', 'value' => $currentObject['rooms']] : null,
        ])),
    ];

    if (!empty($currentObject['location']['lat']) && !empty($currentObject['location']['lng'])) {
        $jsonLdProduct['geo'] = [
            '@type' => 'GeoCoordinates',
            'latitude' => $currentObject['location']['lat'],
            'longitude' => $currentObject['location']['lng'],
        ];
    }

    $jsonLdProduct = json_encode(
        $jsonLdProduct,
        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_LINE_TERMINATORS
    );
}
$breadcrumbJsonLd = json_encode([
    '@context' => 'https://schema.org',
    '@type' => 'BreadcrumbList',
    'itemListElement' => [
        ['@type' => 'ListItem', 'position' => 1, 'name' => 'Главная', 'item' => 'https://germesgarant.by/'],
        ['@type' => 'ListItem', 'position' => 2, 'name' => 'Недвижимость в Лиде', 'item' => 'https://germesgarant.by/nedvizhimost-lida'],
        ['@type' => 'ListItem', 'position' => 3, 'name' => $breadcrumbLeafName, 'item' => $canonicalUrl],
    ],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
$ogImageEsc = htmlspecialchars($ogImage, ENT_QUOTES);
$ogTitleEsc = htmlspecialchars($ogTitle, ENT_QUOTES);
$ogDescriptionEsc = htmlspecialchars($ogDescription, ENT_QUOTES);
?>
<!doctype html>
<html lang="ru">
  <head>
    <base href="/" />
    <!-- ==============================================
         META TAGS & CONFIGURATION
    =============================================== -->
    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <!-- SEO Meta -->
    <title><?php echo $ogTitleEsc; ?></title>
    <meta name="author" content="Ольга Турко, риэлтер в Лиде, Беларусь" />
    <meta name="robots" content="index, follow" />
    <meta
      name="description"
      content="<?php echo $ogDescriptionEsc; ?>"
    />
    <link rel="canonical" href="<?php echo htmlspecialchars($canonicalUrl, ENT_QUOTES); ?>" />
    <!-- Open Graph (Facebook/Instagram) -->
    <meta property="og:type" content="website" />
    <meta property="og:title" content="<?php echo $ogTitleEsc; ?>" />
    <meta
      property="og:description"
      content="<?php echo $ogDescriptionEsc; ?>"
    />
    <meta property="og:url" content="<?php echo htmlspecialchars($canonicalUrl, ENT_QUOTES); ?>" />
    <meta
      property="og:image"
      content="<?php echo $ogImageEsc; ?>"
    />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="<?php echo $ogTitleEsc; ?>" />
    <meta
      name="twitter:description"
      content="<?php echo $ogDescriptionEsc; ?>"
    />
    <meta
      name="twitter:image"
      content="<?php echo $ogImageEsc; ?>"
    />
    <meta name="twitter:image:width" content="1200" />
    <meta name="twitter:image:height" content="630" />
    <!-- Breadcrumbs (JSON-LD) -->
    <script type="application/ld+json"><?php echo $breadcrumbJsonLd; ?></script>
    <?php if ($jsonLdProduct !== null): ?>
    <script type="application/ld+json"><?php echo $jsonLdProduct; ?></script>
    <?php endif; ?>
    <!-- Favicons -->
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
    <link rel="manifest" href="/site.webmanifest">
    <meta name="theme-color" content="#006064" />
         <!-- ==============================================
         SITE VERSION (AUTO CACHE BUSTING)
    =============================================== -->
    <!-- Preload шрифты -->
    <link rel="preload" href="/fonts/inter/Inter-Regular.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="/fonts/inter/Inter-Medium.woff2" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="/fonts/montserrat/Montserrat-Bold.woff2" as="font" type="font/woff2" crossorigin>
    <!-- ==============================================
         RESOURCE HINTS (Performance)
    =============================================== -->
    <!-- Libraries -->
    <link rel="stylesheet" type="text/css" href="css/bootstrap.min.css" />
    <link rel="preload" href="/css/swiper-bundle.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
    <link rel="stylesheet" href="/css/fontawesome/css/fontawesome.min.css">
    <link rel="stylesheet" href="/css/fontawesome/css/brands.min.css">
    <link rel="stylesheet" href="/css/fontawesome/css/regular.min.css">
    <link rel="stylesheet" href="/css/fontawesome/css/solid.min.css">
    <!-- Main Styles -->
    <link rel="stylesheet" type="text/css" href="css/style.css"/>
    <link rel="stylesheet" href="/css/object-share.css" />
    <link rel="stylesheet" href="/css/district-info.css" />
    <link rel="stylesheet" href="/css/object-faq.css" />
    <!-- Legal & Compliance -->
    <link rel="stylesheet" href="/css/agency-legal.css">
</head>

  <body id="bg">
    <div class="page-wraper">
      <!-- =========================================
         HEADER START
         ========================================= -->
<header class="site-header nav-wide nav-transparent">
  <div class="sticky-header is-stuck main-bar-wraper navbar-expand-lg">
    <div class="main-bar">
      <div class="container clearfix">

        <!-- Logo -->
        <div class="logo-header">
          <div class="logo-header-inner logo-header-one">
            <a href="/">
              <img src="images/logo-text-light.svg" class="site-logo site-logo--light" alt="ГермесГарант — агентство недвижимости в Лиде" width="180" height="48" loading="lazy" decoding="async" />
            </a>
          </div>
        </div>

        <!-- Mobile Toggle (ONLY new mobile menu) -->
        <button
          id="mobile-side-drawer"
          type="button"
          class="navbar-toggler"
          aria-label="Открыть меню"
        >
          <span class="sr-only">Toggle navigation</span>
          <span class="icon-bar icon-bar-first"></span>
          <span class="icon-bar icon-bar-two"></span>
          <span class="icon-bar icon-bar-three"></span>
        </button>

        <!-- Desktop Navigation ONLY -->
        <div class="header-nav nav-dark justify-content-start">
          <ul class="nav navbar-nav">
            <li><a href="/">Главная</a></li>
            <li><a href="/about">О компании</a></li>
            <li><a href="/nedvizhimost-lida">Объекты</a></li>
            <li><a href="/analytics">Аналитика</a></li>
            <li><a href="/blog">Блог</a></li>
            <li><a href="/faq">Вопросы</a></li>
            <li><a href="/contact">Контакты</a></li>
          </ul>
        </div>

      </div>
    </div>
  </div>
</header>

      <!-- HEADER END -->

       <!-- MOBILE MENU (NEW, ISOLATED) -->
<div class="mnav-overlay" id="mnavOverlay"></div>

<nav class="mnav" id="mnav">
    <div class="mnav-header">
  <div class="mnav-name">Ольга Турко · Риэлтер · Лида</div>
</div>
<ul class="mnav-list">
  <li>
    <a href="/" data-path="/">
      <i class="fa-solid fa-house"></i>
      <span>Главная</span>
    </a>
  </li>

  <li>
    <a href="/about" data-path="/about">
      <i class="fa-solid fa-building-columns"></i>
      <span>О компании</span>
    </a>
  </li>

  <li>
    <a href="/nedvizhimost-lida" data-path="/nedvizhimost-lida">
      <i class="fa-solid fa-building"></i>
      <span>Объекты</span>
    </a>
  </li>

  <li>
    <a href="/analytics" data-path="/analytics">
      <i class="fa-solid fa-chart-line"></i>
      <span>Аналитика</span>
    </a>
  </li>

  <li>
    <a href="/blog" data-path="/blog">
      <i class="fa-solid fa-pen-nib"></i>
      <span>Блог</span>
    </a>
  </li>

  <li>
    <a href="/faq" data-path="/faq">
      <i class="fa-solid fa-circle-question"></i>
      <span>Вопросы</span>
    </a>
  </li>

  <li>
    <a href="/contact" data-path="/contact">
      <i class="fa-solid fa-phone"></i>
      <span>Контакты</span>
    </a>
  </li>
</ul>


  <!-- CTA -->
<div class="mnav-cta">
  <a href="tel:+375291809516" class="mnav-cta-btn">
    <i class="fa-solid fa-phone"></i>
    Позвонить мне
  </a>
</div>
</nav>
      <!-- CONTENT START -->
      <div class="page-content">
        <!-- INNER PAGE BANNER -->

<section class="page-intro">
  <div class="container">

    <div class="page-intro-inner">

      <!-- EYEBROW -->
      <span class="page-intro-eyebrow">
        Детали объекта
      </span>

      <!-- TITLE -->
      <h1
        class="page-intro-title"
        data-page-title
      ><?php echo htmlspecialchars($breadcrumbLeafName, ENT_QUOTES, 'UTF-8'); ?></h1>

      <!-- DESCRIPTION (статичный текст, как было) -->
      <p class="page-intro-description">
        Этот раздел помогает оценить объект ещё до просмотра:
        насколько он удобен, как вписывается в ваш образ жизни и что
        в нём действительно ценно.<br> Только то, что помогает принять
        решение быстро и уверенно.
      </p>

      <div class="page-intro-divider"></div>

      <!-- BREADCRUMB -->
      <nav class="page-intro-breadcrumb" aria-label="breadcrumb">
        <ul>
          <li><a href="/">Главная</a></li>
          <li><a href="/nedvizhimost-lida">Недвижимость в Лиде</a></li>
          <li><?php echo htmlspecialchars($breadcrumbLeafName, ENT_QUOTES); ?></li>
        </ul>
      </nav>

    </div>

  </div>
</section>





        <!-- INNER PAGE BANNER END -->
        <!-- SECTION CONTENT START -->
        <div class="section-full p-tb80 inner-page-padding stick_in_parent">
          <div class="container">
            <div class="row">
              <div class="col-lg-8 col-md-12">
                <div class="object-hero-wrapper" data-hero-wrapper>
                  <div
                    class="object-hero-images"
                    data-hero-images
                  ></div>

                  <div class="object-hero-meta">
                    <ul class="object-hero-tags">
                      <li class="tag-featured" data-featured hidden>
                        Рекомендуемый
                      </li>
                      <li>
                        <i class="fa-regular fa-calendar"></i>
                        <span data-published></span>
                      </li>
                      <li>
                        <i class="fa-solid fa-handshake"></i>
                        <span data-deal-type></span>
                      </li>
                    </ul>

                    <h3 class="object-hero-title" data-hero-title></h3>

                    <div class="object-hero-location">
                      <i class="fa-solid fa-location-dot"></i>
                      <span data-hero-location></span>
                    </div>

                    <p
                      class="object-hero-description"
                      data-hero-description
                    ></p>



<div class="object-amenities" data-object-amenities hidden>
  <h4 class="object-amenities-title">Преимущества объекта</h4>

  <div class="object-amenities-grid" data-amenities-list>
    
  </div>
</div>





                  </div>
                </div>



                <!-- OBJECT DETAILS -->
                <div class="object-details">
                  <!-- PRICE -->
                  <div class="object-price" data-object-price></div>

                  <!-- GROUPS -->
                  <div class="object-details-groups" data-object-details></div>
                </div>

<div class="booking-section booking-section--object">
  <button type="button" class="booking-open-btn" data-open-booking-modal>
    Записаться на просмотр
  </button>
</div>

<!-- SHARE BLOCK -->
<div class="object-share" id="object-share-block" style="display:none">
  <div class="object-share__label">Поделиться объектом</div>
  <div class="object-share__buttons">
    <a class="share-btn share-btn--viber" id="share-viber" href="#" target="_blank" rel="noopener" aria-label="Отправить в Viber">
      <i class="fa-brands fa-viber"></i> Viber
    </a>
    <a class="share-btn share-btn--telegram" id="share-telegram" href="#" target="_blank" rel="noopener" aria-label="Отправить в Telegram">
      <i class="fa-brands fa-telegram"></i> Telegram
    </a>
    <button class="share-btn share-btn--copy" id="share-copy" type="button" aria-label="Скопировать ссылку">
      <svg class="share-copy-icon" viewBox="0 0 20 20" fill="currentColor" width="14" height="14" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <rect x="7" y="1" width="11" height="13" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/>
        <rect x="2" y="5" width="11" height="14" rx="1.5"/>
        <rect x="3.5" y="6.5" width="8" height="1.5" rx=".75" fill="white"/>
        <rect x="3.5" y="9.5" width="8" height="1.5" rx=".75" fill="white"/>
        <rect x="3.5" y="12.5" width="5" height="1.5" rx=".75" fill="white"/>
      </svg> Скопировать
    </button>
    <button class="share-btn share-btn--qr" id="share-qr" type="button" aria-label="Показать QR-код">
      <svg class="share-qr-icon" viewBox="0 0 20 20" fill="currentColor" width="15" height="15" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="7" height="7" rx="1"/>
        <rect x="2.5" y="2.5" width="4" height="4" rx=".5" fill="white"/>
        <rect x="12" y="1" width="7" height="7" rx="1"/>
        <rect x="13.5" y="2.5" width="4" height="4" rx=".5" fill="white"/>
        <rect x="1" y="12" width="7" height="7" rx="1"/>
        <rect x="2.5" y="13.5" width="4" height="4" rx=".5" fill="white"/>
        <rect x="10" y="1" width="1.5" height="1.5"/>
        <rect x="10" y="4" width="1.5" height="1.5"/>
        <rect x="10" y="7" width="1.5" height="1.5"/>
        <rect x="1" y="10" width="1.5" height="1.5"/>
        <rect x="4" y="10" width="1.5" height="1.5"/>
        <rect x="7" y="10" width="1.5" height="1.5"/>
        <rect x="10" y="10" width="1.5" height="1.5"/>
        <rect x="12.5" y="10" width="1.5" height="1.5"/>
        <rect x="15" y="10" width="1.5" height="1.5"/>
        <rect x="17.5" y="10" width="1.5" height="1.5"/>
        <rect x="12.5" y="12.5" width="1.5" height="1.5"/>
        <rect x="15" y="12.5" width="1.5" height="1.5"/>
        <rect x="17.5" y="12.5" width="1.5" height="1.5"/>
        <rect x="12.5" y="15" width="1.5" height="1.5"/>
        <rect x="17.5" y="15" width="1.5" height="1.5"/>
        <rect x="12.5" y="17.5" width="1.5" height="1.5"/>
        <rect x="15" y="17.5" width="1.5" height="1.5"/>
        <rect x="17.5" y="17.5" width="1.5" height="1.5"/>
      </svg> QR-код
    </button>
  </div>
</div>

              </div>


              <div class="col-lg-4 col-md-12 sticky_column">
                <div class="project-detail-containt-2">
                  <div class="bg-white text-black p-a20 shadow">
                    <div class="project-detail-containt-2">
                      <div class="bg-white p-a20 shadow object-sidebar">
                        <!-- TITLE -->
                        <h4
                          class="object-sidebar-title"
                          data-sidebar-title
                        ></h4>

                        <!-- AGENT CARD -->
                        <div class="agent-card">
                          <div class="agent-avatar">
                            <img
                              src="/images/main-slider/2.webp"
                              alt="Ольга Турко"
                              width="320"
                              height="320"
                              loading="lazy"
                              decoding="async"
                            />
                          </div>

                          <h5 class="agent-name">Ольга Турко</h5>
                          <div class="agent-role">Аттестованный риэлтер</div>

                          <p class="agent-desc">
                            Помогаю безопасно купить и продать недвижимость в
                            Лиде и районе. Подбираю объекты под задачу, а не «по
                            списку».
                          </p>

                          <div class="agent-actions">
                            <a
                              href="tel:+375291809516"
                              class="site-button-secondry btn-half agent-action-btn"
                            >
                              <span>Позвонить</span>
                            </a>

                            <a
                              href="/contact"
                              class="site-button-secondry btn-half agent-action-btn agent-action-btn--outline"
                            >
                              <span>Написать</span>
                            </a>
                          </div>
                          <div class="agent-socials">
                            <a
                              href="https://t.me/TurkoOlga"
                              target="_blank"
                              rel="noopener"
                              aria-label="Telegram"
                            >
                              <i class="fa-brands fa-telegram"></i>
                            </a>

                            <a
                              href="https://www.instagram.com/rielter_olga_lida"
                              target="_blank"
                              rel="noopener"
                              aria-label="Instagram"
                            >
                              <i class="fa-brands fa-instagram"></i>
                            </a>

                            <a
                              href="https://www.tiktok.com/@rieltor_olga_lida"
                              target="_blank"
                              rel="noopener"
                              aria-label="TikTok"
                            >
                              <i class="fa-brands fa-tiktok"></i>
                            </a>
                          </div>
                        </div>

                        <div class="mortgage-calculator" data-mortgage-calculator>
                          <div class="mortgage-calculator__head">
                            <div class="mortgage-calculator__bank-brand">
                              <h5 data-mortgage-bank-title>Ипотечный калькулятор — Беларусбанк</h5>
                            </div>
                            <p>
                              Сравните условия ипотечных программ белорусских банков и получите ориентировочный платёж.
                            </p>
                          </div>

                          <div class="mortgage-calculator__field">
                            <label for="bankSelect">Банк</label>
                            <select id="bankSelect" data-mortgage-bank></select>
                          </div>

                          <div class="mortgage-calculator__field">
                            <label for="mortgageProgram">Программа</label>
                            <select id="mortgageProgram" data-mortgage-program></select>
                          </div>

                          <p class="mortgage-calculator__program-description" data-mortgage-description>
                            —
                          </p>

                          <div class="mortgage-calculator__grid">
                            <div class="mortgage-calculator__field">
                              <label for="mortgagePrice">Стоимость жилья, BYN</label>
                              <input
                                id="mortgagePrice"
                                type="number"
                                min="10000"
                                step="1000"
                                data-mortgage-price
                              />
                            </div>

                            <div class="mortgage-calculator__field">
                              <label for="mortgageDownPayment"
                                >Первоначальный взнос, BYN</label
                              >
                              <input
                                id="mortgageDownPayment"
                                type="number"
                                min="0"
                                step="500"
                                data-mortgage-down-payment
                              />
                            </div>
                          </div>

                          <div class="mortgage-calculator__grid">
                            <div class="mortgage-calculator__field">
                              <label for="mortgageTerm">Срок, лет</label>
                              <input
                                id="mortgageTerm"
                                type="number"
                                min="1"
                                max="30"
                                step="1"
                                data-mortgage-term
                              />
                            </div>

                            <div class="mortgage-calculator__field">
                              <label for="mortgageRate">Ставка, % годовых</label>
                              <input
                                id="mortgageRate"
                                type="number"
                                min="1"
                                max="40"
                                step="0.1"
                                data-mortgage-rate
                              />
                            </div>
                          </div>

                          <div class="mortgage-calculator__results" data-mortgage-results>
                            <div>
                              <span>Сумма кредита, BYN</span>
                              <strong data-mortgage-loan>—</strong>
                            </div>
                            <div>
                              <span>Ежемесячный платёж, BYN</span>
                              <strong data-mortgage-payment>—</strong>
                            </div>
                            <div>
                              <span>Переплата за весь срок, BYN</span>
                              <strong data-mortgage-overpay>—</strong>
                            </div>
                            <div>
                              <span>Общая выплата банку, BYN</span>
                              <strong data-mortgage-total>—</strong>
                            </div>
                          </div>

                          <p class="mortgage-calculator__note">
                            * Расчёт носит справочный характер. Перед сделкой
                            уточняйте актуальные условия и доступность программ
                            в выбранном банке.
                          </p>
                        </div>

                        
                        <!-- SIDEBAR SLIDER -->
                        <div class="sidebar-slider">
                          <h5 class="sidebar-slider-title">Похожий объект</h5>

<div class="sidebar-slider-frame">
  <div class="sidebar-slider-track" data-sidebar-track></div>
</div>
                        </div>

                        <!-- FOOTER -->
                        <div class="sidebar-footer" data-sidebar-footer>
                          <p>
                            📍 Агентство недвижимости «ГермесГарант»<br />
                            г. Лида, б-р Князя Гедимина, 12, пом. 9.
                          </p>
                        </div>




                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>




<section class="object-faq" itemscope itemtype="https://schema.org/FAQPage">
  <h4 class="object-faq__title">Частые вопросы по этому объекту</h4>

  <details class="object-faq__item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
    <summary class="object-faq__question" itemprop="name">Возможна ли ипотека на этот объект?</summary>
    <div class="object-faq__answer" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
      <p itemprop="text">Да, объект подходит под ипотечные программы Беларусбанка и Белагропромбанка. Минимальный первоначальный взнос — от 20%. Риэлтер поможет подготовить пакет документов для подачи в банк и сопроводит до момента получения одобрения.</p>
    </div>
  </details>

  <details class="object-faq__item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
    <summary class="object-faq__question" itemprop="name">Можно ли торговаться по цене?</summary>
    <div class="object-faq__answer" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
      <p itemprop="text">Торг уместен. Окончательная цена обсуждается напрямую с собственником после просмотра объекта. Обратитесь к риэлтеру — она поможет аргументированно договориться о скидке, опираясь на актуальный анализ рынка.</p>
    </div>
  </details>

  <details class="object-faq__item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
    <summary class="object-faq__question" itemprop="name">Когда можно посмотреть объект?</summary>
    <div class="object-faq__answer" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
      <p itemprop="text">Просмотры организуются в удобное для вас время — в будни и выходные. Запишитесь через форму бронирования на этой странице или позвоните напрямую риэлтеру Ольге Турко. Как правило, показ назначается в течение 1–2 дней.</p>
    </div>
  </details>

  <details class="object-faq__item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
    <summary class="object-faq__question" itemprop="name">Есть ли задолженности по коммунальным платежам?</summary>
    <div class="object-faq__answer" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
      <p itemprop="text">Перед выходом на сделку риэлтер запрашивает справку об отсутствии задолженностей по ЖКУ и взносам. Передача объекта с долгами исключена — это обязательное условие любой сделки купли-продажи в Беларуси.</p>
    </div>
  </details>

  <details class="object-faq__item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
    <summary class="object-faq__question" itemprop="name">Сколько собственников у объекта?</summary>
    <div class="object-faq__answer" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
      <p itemprop="text">Информация о количестве собственников уточняется при первом обращении. Риэлтер проверяет выписку из ЕГРНИ (реестра прав на недвижимость), чтобы вы знали полный состав правообладателей и убедились в чистоте сделки.</p>
    </div>
  </details>

  <details class="object-faq__item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
    <summary class="object-faq__question" itemprop="name">Можно ли купить с использованием материнского капитала?</summary>
    <div class="object-faq__answer" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
      <p itemprop="text">Да, материнский капитал принимается в качестве части оплаты при соответствии объекта требованиям программы (жилое помещение, соответствующее санитарным нормам). Риэлтер заранее проконсультирует, подходит ли конкретный объект под эти условия.</p>
    </div>
  </details>

  <details class="object-faq__item" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
    <summary class="object-faq__question" itemprop="name">Во сколько обойдётся переоформление?</summary>
    <div class="object-faq__answer" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
      <p itemprop="text">Стандартные расходы покупателя при переоформлении: государственная пошлина за регистрацию права собственности (0,1% от стоимости объекта), нотариальное удостоверение договора (фиксированная ставка согласно тарифам) и услуги риэлтера. Точный расчёт — при обращении.</p>
    </div>
  </details>
</section>

<div data-district-info hidden></div>

<div class="object-map">
  <h4 class="object-map-title">Расположение на карте</h4>
  <div id="objectMap"></div>
</div>

</div>

          </div>
        </div>
        <!-- SECTION CONTENT END  -->
      </div>
      <!-- CONTENT END -->


<div class="booking-modal" data-booking-modal hidden>
  <div class="booking-modal__backdrop" data-close-booking-modal></div>
  <div class="booking-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="booking-title">
    <button type="button" class="booking-modal__close" data-close-booking-modal aria-label="Закрыть">×</button>

    <div class="booking-card booking-card--compact" data-booking-card>
      <header class="booking-card__header">
        <h3 id="booking-title">Записаться на просмотр</h3>
        <p>Выберите удобную дату и время</p>
      </header>

      <form id="viewing-booking-form" class="booking-form" novalidate data-api-endpoint="api/book-viewing.php">
        <input type="hidden" id="booking-object-title" name="objectTitle" />

        <label class="booking-label" for="booking-date-trigger">Дата просмотра</label>
        <div class="booking-date-picker" data-date-picker>
          <input type="hidden" id="booking-date" name="date" required />
          <button type="button" id="booking-date-trigger" class="booking-date-trigger" aria-expanded="false" aria-controls="booking-calendar-popover">
            <span data-date-label>Выберите дату</span>
            <i class="fa-regular fa-calendar"></i>
          </button>
          <div id="booking-calendar-popover" class="booking-calendar" hidden>
            <div class="booking-calendar__header">
              <button type="button" class="booking-calendar__nav" data-cal-prev aria-label="Предыдущий месяц">‹</button>
              <strong data-cal-month></strong>
              <button type="button" class="booking-calendar__nav" data-cal-next aria-label="Следующий месяц">›</button>
            </div>
            <div class="booking-calendar__weekdays">
              <span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span>
            </div>
            <div class="booking-calendar__grid" data-cal-grid></div>
          </div>
        </div>

        <fieldset class="booking-times" aria-label="Выберите время">
          <legend class="booking-label">Удобное время</legend>
          <div class="booking-times__grid" role="radiogroup" aria-label="Доступное время">
            <button type="button" class="booking-time-btn" data-time="10:00">10:00</button>
            <button type="button" class="booking-time-btn" data-time="12:00">12:00</button>
            <button type="button" class="booking-time-btn" data-time="14:00">14:00</button>
            <button type="button" class="booking-time-btn" data-time="17:00">17:00</button>
            <button type="button" class="booking-time-btn" data-time="19:00">19:00</button>
          </div>
        </fieldset>

        <input type="hidden" name="time" id="booking-time" required />

        <label class="booking-label" for="booking-name">Ваше имя</label>
        <input type="text" id="booking-name" name="name" placeholder="Например, Анна" required />

        <label class="booking-label" for="booking-phone">Телефон</label>
        <input type="tel" id="booking-phone" name="phone" placeholder="+375 (__) ___-__-__" required />

        <button type="submit" class="booking-submit-btn">Записаться на просмотр</button>
        <p id="booking-feedback" class="booking-feedback" aria-live="polite"></p>
      </form>
    </div>
  </div>
</div>

      <footer class="site-footer footer-large footer-dark footer-wide">
        <div class="footer-top overlay-wraper">
          <div class="overlay-main"></div>
          <div class="container">
            <div class="row">
              <!-- About -->
              <div class="col-lg-3 col-md-6 col-sm-6">
                <div class="widget widget_about">
                  <div class="logo-footer clearfix p-b15">
                    <a href="/"
                      ><img src="images/logo-text-light.svg" class="site-logo site-logo--light" alt="ГермесГарант — агентство недвижимости в Лиде" width="180" height="48" loading="lazy" decoding="async" />
                    </a>
                  </div>
                  <p>
                    <b>Найти квартиру — легко. Найти свою — искусство.</b>
                    <br />Я подбираю не абстрактные “варианты”, а то самое
                    жильё, где совпадают цена, планировка и ощущение “моё”.
                  </p>
                  <ul class="social-icons sx-social-links">
                    <li>
                      <a
                        href="viber://chat?number=%2B375291809516"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="fa-brands fa-viber"
                        aria-label="Написать в Viber"
                      ></a>
                    </li>
                    <li>
                      <a
                        href="https://www.tiktok.com/@rieltor_olga_lida"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="fab fa-tiktok"
                        aria-label="TikTok"
                      ></a>
                    </li>
                    <li>
                      <a
                        href="https://t.me/TurkoOlga"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="fa-brands fa-telegram"
                        aria-label="Написать в Telegram"
                      ></a>
                    </li>
                    <li>
                      <a
                        href="https://www.instagram.com/rielter_olga_lida"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="fa-brands fa-square-instagram"
                        aria-label="Instagram"
                      ></a>
                    </li>
                  </ul>
                </div>
              </div>
              <!-- Recent Posts -->
              <div class="col-lg-3 col-md-6 col-sm-6">
                <div class="widget recent-posts-entry-date">
                  <h5 class="widget-title">Посты в блоге</h5>

                  <div class="widget-post-bx" id="footer-recent-posts"></div>
                </div>
              </div>
              <!-- Useful Links -->
              <div class="col-lg-3 col-md-6 col-sm-6 footer-col-3">
                <div class="widget widget_services inline-links">
                  <h5 class="widget-title">Полезные ссылки</h5>
                  <ul>
                    <li><a href="/about">О компании</a></li>
                    <li><a href="/nedvizhimost-lida">Объекты</a></li>
                    <li><a href="/analytics">Аналитика</a></li>
                    <li><a href="/blog">Блог</a></li>
                    <li><a href="/contact">Контакты</a></li>
                    <li><a href="/Privacy">Политика конфиденциальности</a></li>
                    <li>
                      <a href="/cookies-policy"
                        >Политика использования cookies</a
                      >
                    </li>
                  </ul>
                </div>
              </div>

              <!-- Contacts -->
              <div class="col-lg-3 col-md-6 col-sm-6">
                <div class="widget widget_address_outer">
                  <h5 class="widget-title">Пора поговорить о вашем доме</h5>
                  <ul class="widget_address">
                    <li>город Лида, бульвар Князя Гедимина, 12</li>
                    <li>
                      <a href="mailto:olgaturko1975@gmail.com"
                        >olgaturko1975@gmail.com</a
                      >
                    </li>
                    <li><a href="tel:+375291809516">(+375) 29 180 95 16</a></li>
                    <li><a href="tel:+375445019090">(+375) 44 501 90 90</a></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

<div class="container">
  <div class="call-to-action-wrap">
    <div class="row">
      <div class="col-lg-7 col-md-6">
        <div class="call-to-action-left">

          <h5 class="text-uppercase m-b10 m-t0">
            Риэлтер Ольга Турко
          </h5>

          <span>
            Практикующий эксперт по эмоциональному позиционированию
            объектов недвижимости
          </span>

          <div class="footer-legal-info">

            <p>
              Свидетельство об аттестации риэлтера № 1931 от 29.02.2024
            </p>

            <p>
              Услуги по сопровождению сделок с недвижимостью оказываются через
              лицензированное агентство недвижимости «ГермесГарант».
            </p>

            <p>
              Лицензия Министерства юстиции Республики Беларусь на осуществление
              риэлтерской деятельности № 02240/487 от 07.08.2024
            </p>

          </div>

        </div>
      </div>
    </div>
  </div>
</div>
        </div>

        <!-- Footer Copyright -->
        <div class="footer-bottom overlay-wraper">
          <div class="overlay-main"></div>
          <div class="container">
            <div class="row">
              <div class="sx-footer-bot-left">
                <span class="copyrights-text"
                  >© 2025 Ольга Турко. Designed By INazarov.</span
                >
                <span
                  >Интернет-ресурс germesgarant.by зарегистрирован в Республике
                  Беларусь. Номер ресурса: 212210 Дата регистрации:
                  12.01.2026</span
                >
              </div>
            </div>
          </div>
        </div>
      </footer>
      <!-- FOOTER END -->
    

    <!-- JAVASCRIPT  FILES ========================================= -->

      <script src="/js/optimize.js" defer></script>
    <script src="/js/live-price.js?v=20260417-2" defer></script>
    <script src="/js/object-detail.js?v=20260424-2" defer></script>
    <script src="/js/district-info.js" defer></script>
    <script src="/js/analytics-consent-loader.js" defer></script>
    <script src="/js/cookie-consent.js" defer></script>
    <script src="/js/footer-post.js" defer></script>

    <!-- QR MODAL -->
    <div class="share-qr-modal" id="share-qr-modal" role="dialog" aria-modal="true" aria-label="QR-код объекта">
      <div class="share-qr-box">
        <button class="share-qr-close" id="share-qr-close" aria-label="Закрыть">×</button>
        <div class="share-qr-box__icon">
          <svg viewBox="0 0 20 20" fill="currentColor" width="28" height="28" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="7" height="7" rx="1"/>
            <rect x="2.5" y="2.5" width="4" height="4" rx=".5" fill="white"/>
            <rect x="12" y="1" width="7" height="7" rx="1"/>
            <rect x="13.5" y="2.5" width="4" height="4" rx=".5" fill="white"/>
            <rect x="1" y="12" width="7" height="7" rx="1"/>
            <rect x="2.5" y="13.5" width="4" height="4" rx=".5" fill="white"/>
            <rect x="10" y="1" width="1.5" height="1.5"/>
            <rect x="10" y="4" width="1.5" height="1.5"/>
            <rect x="10" y="7" width="1.5" height="1.5"/>
            <rect x="1" y="10" width="1.5" height="1.5"/>
            <rect x="4" y="10" width="1.5" height="1.5"/>
            <rect x="7" y="10" width="1.5" height="1.5"/>
            <rect x="10" y="10" width="1.5" height="1.5"/>
            <rect x="12.5" y="10" width="1.5" height="1.5"/>
            <rect x="15" y="10" width="1.5" height="1.5"/>
            <rect x="17.5" y="10" width="1.5" height="1.5"/>
            <rect x="12.5" y="12.5" width="1.5" height="1.5"/>
            <rect x="15" y="12.5" width="1.5" height="1.5"/>
            <rect x="17.5" y="12.5" width="1.5" height="1.5"/>
            <rect x="12.5" y="15" width="1.5" height="1.5"/>
            <rect x="17.5" y="15" width="1.5" height="1.5"/>
            <rect x="12.5" y="17.5" width="1.5" height="1.5"/>
            <rect x="15" y="17.5" width="1.5" height="1.5"/>
            <rect x="17.5" y="17.5" width="1.5" height="1.5"/>
          </svg>
        </div>
        <div class="share-qr-box__title">Сканируйте QR-код</div>
        <div class="share-qr-box__hint">Откроет страницу объекта<br>на любом устройстве</div>
        <div class="share-qr-img-wrap">
          <img id="share-qr-img" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Crect fill='%23f3f3f3' width='180' height='180'/%3E%3C/svg%3E" alt="QR-код объекта" width="180" height="180" loading="lazy" decoding="async" />
        </div>
        <div class="share-qr-box__url" id="share-qr-url"></div>
      </div>
    </div>
    <script src="/js/sw-register.js" defer></script>
    <script src="contact-widget.js" defer></script>
    <!-- Legal & Compliance Components -->
    <script src="/js/agency-legal-block.js" defer></script>
    <script src="/js/consent-checkbox.js" defer></script>
</body>
</html>
