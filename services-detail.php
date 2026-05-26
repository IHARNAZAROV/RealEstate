<?php
$rawSlug = isset($_GET['slug']) ? $_GET['slug'] : '';
$slug = preg_replace('/[^a-zA-Z0-9_\-]/', '', $rawSlug);
$canonicalUrl = $slug !== '' ? "https://turko.by/services/$slug" : "https://turko.by/rieltor-lida";

$breadcrumbLeafName = "Услуга риэлтера";
$serviceMetaTitle = "Услуги риэлтера в Лиде — Ольга Турко";
$serviceMetaDescription = "Услуги риэлтера в Лиде: сопровождение сделок, продажа, покупка и консультации по недвижимости от Ольги Турко.";
$currentService = null;
if ($slug !== '') {
    $servicesFile = __DIR__ . '/data/services.json';
    if (is_file($servicesFile)) {
        $servicesData = json_decode(file_get_contents($servicesFile), true);
        $list = isset($servicesData['services']) && is_array($servicesData['services']) ? $servicesData['services'] : (is_array($servicesData) ? $servicesData : []);
        foreach ($list as $svc) {
            if (isset($svc['slug']) && $svc['slug'] === $slug) {
                $currentService = $svc;
                if (!empty($svc['title'])) {
                    $breadcrumbLeafName = $svc['title'];
                    $serviceMetaTitle = $svc['title'] . ' — услуги риэлтера в Лиде | Ольга Турко';
                }
                if (!empty($svc['description'])) {
                    $serviceMetaDescription = mb_substr(trim(strip_tags((string)$svc['description'])), 0, 280);
                }
                break;
            }
        }
    }
}
$breadcrumbJsonLd = json_encode([
    '@context' => 'https://schema.org',
    '@type' => 'BreadcrumbList',
    'itemListElement' => [
        ['@type' => 'ListItem', 'position' => 1, 'name' => 'Главная', 'item' => 'https://turko.by/'],
        ['@type' => 'ListItem', 'position' => 2, 'name' => 'Услуги риэлтера', 'item' => 'https://turko.by/rieltor-lida'],
        ['@type' => 'ListItem', 'position' => 3, 'name' => $breadcrumbLeafName, 'item' => $canonicalUrl],
    ],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
$serviceJsonLd = null;
if (is_array($currentService)) {
    $serviceDescription = $currentService['description'] ?? ($currentService['meta']['description'] ?? $serviceMetaDescription);
    if ((!is_string($serviceDescription) || trim($serviceDescription) === '') && !empty($currentService['sections']) && is_array($currentService['sections'])) {
        foreach ($currentService['sections'] as $section) {
            if (!empty($section['content']) && is_string($section['content'])) {
                $serviceDescription = $section['content'];
                break;
            }
        }
    }
    $serviceDescription = mb_substr(trim(strip_tags((string)$serviceDescription)), 0, 280);

    $serviceLd = [
        '@context' => 'https://schema.org',
        '@type' => 'Service',
        'name' => $currentService['title'] ?? $breadcrumbLeafName,
        'serviceType' => $currentService['category'] ?? 'Real Estate Service',
        'description' => $serviceDescription,
        'areaServed' => [
            '@type' => 'City',
            'name' => 'Лида',
            'addressCountry' => 'BY',
        ],
        'provider' => [
            '@type' => 'RealEstateAgent',
            'name' => 'Ольга Турко',
            'telephone' => '+375291809516',
            'url' => 'https://turko.by/',
        ],
        'offers' => [
            '@type' => 'Offer',
            'priceCurrency' => 'BYN',
            'price' => $currentService['price'] ?? '0',
            'priceSpecification' => [
                '@type' => 'PriceSpecification',
                'priceCurrency' => 'BYN',
                'price' => $currentService['price'] ?? '0',
            ],
        ],
    ];

    $serviceJsonLd = json_encode($serviceLd, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_LINE_TERMINATORS);
}
?>
<!doctype html>

<html lang="ru">
   <head>
      <base href="/" />
      <!-- =========================================
       1. META DATA & SEO
       ========================================= -->
      <meta charset="utf-8" />
      <meta http-equiv="X-UA-Compatible" content="IE=edge" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title><?php echo htmlspecialchars($serviceMetaTitle, ENT_QUOTES, 'UTF-8'); ?></title>
      <meta name="author" content="Ольга Турко, риэлтер в Лиде, Беларусь" />
      <meta
         name="description"
         content="<?php echo htmlspecialchars($serviceMetaDescription, ENT_QUOTES, 'UTF-8'); ?>"
      />
      <meta name="robots" content="index, follow" />
      <link rel="canonical" href="<?php echo htmlspecialchars($canonicalUrl, ENT_QUOTES); ?>" />
      <meta property="og:type" content="website" />
      <meta property="og:title" content="<?php echo htmlspecialchars($serviceMetaTitle, ENT_QUOTES, 'UTF-8'); ?>" />
      <meta property="og:description" content="<?php echo htmlspecialchars($serviceMetaDescription, ENT_QUOTES, 'UTF-8'); ?>" />
      <meta property="og:url" content="<?php echo htmlspecialchars($canonicalUrl, ENT_QUOTES); ?>" />
      <meta property="og:image" content="https://turko.by/images/main-slider/2.webp" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="<?php echo htmlspecialchars($serviceMetaTitle, ENT_QUOTES, 'UTF-8'); ?>" />
      <meta name="twitter:description" content="<?php echo htmlspecialchars($serviceMetaDescription, ENT_QUOTES, 'UTF-8'); ?>" />
      <meta name="twitter:image" content="https://turko.by/images/main-slider/2.webp" />

      <!-- Breadcrumbs (JSON-LD) -->
      <script type="application/ld+json"><?php echo $breadcrumbJsonLd; ?></script>
      <?php if ($serviceJsonLd !== null): ?>
      <script type="application/ld+json"><?php echo $serviceJsonLd; ?></script>
      <?php endif; ?>

      <!-- =========================================
       3. ICONS & FONTS
       ========================================= -->
      <!-- Favicons -->
      <link rel="icon" href="https://turko.by/favicon.ico" sizes="any" />
      <link
         rel="icon"
         type="image/svg+xml"
         href="https://turko.by/favicon.svg"
      />
      <link rel="manifest" href="https://turko.by/site.webmanifest" />
      <meta name="theme-color" content="#006064" />
      <link
         rel="apple-touch-icon"
         href="https://turko.by/apple-touch-icon.png"
      />
      <link
         rel="icon"
         type="image/png"
         sizes="32x32"
         href="https://turko.by/favicon-32x32.png"
      />
      <link
         rel="icon"
         type="image/png"
         sizes="192x192"
         href="https://turko.by/web-app-manifest-192x192.png"
      />
      <!-- ==============================================
         SITE VERSION (AUTO CACHE BUSTING)
    =============================================== -->
      <script src="/site-version.php"></script>
      <!-- Preload шрифты -->
      <link rel="preload" href="/fonts/inter/Inter-Regular.woff2" as="font" type="font/woff2" crossorigin>
      <link rel="preload" href="/fonts/inter/Inter-Medium.woff2" as="font" type="font/woff2" crossorigin>
      <link rel="preload" href="/fonts/montserrat/Montserrat-Bold.woff2" as="font" type="font/woff2" crossorigin>
      <!-- =========================================
       4. STYLESHEETS (CSS)
       ========================================= -->
      <link rel="stylesheet" type="text/css" href="css/bootstrap.min.css" />
      <link
         rel="stylesheet"
         type="text/css"
         href="css/style.css"
         data-versioned
      />
      <link rel="stylesheet" href="/css/fontawesome/css/fontawesome.min.css" />
      <link rel="stylesheet" href="/css/fontawesome/css/brands.min.css" />
      <link rel="stylesheet" href="/css/fontawesome/css/solid.min.css" />
    <link rel="stylesheet" href="/css/contact-widget.css">
    <!-- Legal & Compliance -->
    <link rel="stylesheet" href="/css/agency-legal.css">
</head>

   <body>
      <div class="page-wraper">
         <!-- =========================================
         HEADER START
         ========================================= -->
         <header class="site-header nav-wide nav-transparent">
            <div
               class="sticky-header is-stuck main-bar-wraper navbar-expand-lg"
            >
               <div class="main-bar">
                  <div class="container clearfix">
                     <!-- Logo -->
                     <div class="logo-header">
                        <div class="logo-header-inner logo-header-one">
                           <a href="/">
                              <img
                                 src="images/logo-light.svg"
                                 class="site-logo site-logo--light"
                                 alt="logo"
                              />
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
                           <li><a href="/rieltor-lida">Обо мне</a></li>
                           <li><a href="/nedvizhimost-lida">Объекты</a></li>
                           <li><a href="/blog">Блог</a></li>
                           <li><a href="/faq">Вопросы</a></li>
                           <li><a href="/contact">Контакты</a></li>
                        </ul>
                     </div>
                  </div>
               </div>
            </div>
         </header>

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
                  <a href="/rieltor-lida" data-path="/rieltor-lida">
                     <i class="fa-solid fa-user"></i>
                     <span>Обо мне</span>
                  </a>
               </li>

               <li>
                  <a href="/nedvizhimost-lida" data-path="/nedvizhimost-lida">
                     <i class="fa-solid fa-building"></i>
                     <span>Объекты</span>
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

            <!-- INNER PAGE BANNER END -->

            <section class="page-intro">
               <!-- overlay -->

               <div class="container">
                  <div class="page-intro-inner" id="page-eyebrow">
                     <span class="page-intro-eyebrow">Обо мне</span>

                     <!-- TITLE + LEAD (из JSON) -->
                     <div class="banner-title-outer">
                        <div class="banner-title-name">
                           <h1 class="page-intro-title" id="service-title"><?php echo htmlspecialchars($breadcrumbLeafName, ENT_QUOTES, 'UTF-8'); ?></h1>

                           <!-- JS пишет сюда -->
                           <p
                              class="page-intro-description"
                              id="service-lead"
                           ></p>
                        </div>
                     </div>

                     <!-- DIVIDER -->
                     <div class="page-intro-divider"></div>

                     <!-- BREADCRUMBS (server-rendered) -->
                     <nav class="page-intro-breadcrumb" aria-label="breadcrumb">
                        <ul
                           class="sx-breadcrumb breadcrumb-style-2"
                           id="service-breadcrumbs"
                        >
                           <li><a href="/">Главная</a></li>
                           <li><a href="/rieltor-lida">Услуги риэлтера</a></li>
                           <li id="service-breadcrumb-title"><?php echo htmlspecialchars($breadcrumbLeafName, ENT_QUOTES); ?></li>
                        </ul>
                     </nav>
                  </div>
               </div>
            </section>

            <!-- SECTION CONTENT START -->
            <div
               class="section-full bg-white bg-gray p-t80 p-b50 mobile-page-padding"
            >
               <div class="container">
                  <!-- GALLERY CONTENT START -->
                  <div class="row">
                     <div class="col-lg-4 col-md-12 sticky_column">
                        <div class="service-sidebar">
                           <div class="about4-section m-b20 bg-gray p-a20">
                              <div class="widget widget_services">
                                 <h4 class="widget-title">Мои услуги</h4>
                                 <ul class="bg-white" id="services-list"></ul>
                              </div>

                              <div class="about4-content m-t30">
                                 <h4>Риэлтер Ольга Турко</h4>
                                 <p>
                                    Практикующий эксперт по эмоциональному
                                    позиционированию объектов недвижимости
                                 </p>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div class="col-lg-8 col-md-12">
                        <div class="section-content">
                           <div
                              class="service-single-block m-b30"
                              id="service-content"
                           ></div>
                        </div>
                     </div>
                  </div>
               </div>
               <!-- GALLERY CONTENT END -->
            </div>
         </div>
         <!-- SECTION CONTENT END  -->

         <!-- CONTENT END -->

         <!-- =========================================
         FOOTER START
         ========================================= -->
         <footer class="site-footer footer-large footer-dark footer-wide">
            <div class="footer-top overlay-wraper">
               <div class="overlay-main"></div>
               <div class="container">
                  <div class="row">
                     <!-- 1. ABOUT & SOCIAL -->
                     <div class="col-lg-3 col-md-6 col-sm-6">
                        <div class="widget widget_about">
                           <div class="logo-footer clearfix p-b15">
                              <a href="/">
                                 <img
                                    src="images/logo-light.svg"
                                    class="site-logo site-logo--light"
                                    alt="logo"
                                 />
                              </a>
                           </div>
                           <p>
                              <b
                                 >Найти квартиру — легко. Найти свою —
                                 искусство.</b
                              >
                              <br />Я подбираю не абстрактные “варианты”, а то
                              самое жильё, где совпадают цена, планировка,
                              настроение и ощущение “вот тут — моё”.
                           </p>
                           <ul class="social-icons sx-social-links">
                              <li>
                                 <a
                                    href="viber://chat?number=%2B375291809516"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="fa-brands fa-viber"
                                 ></a>
                              </li>
                              <li>
                                 <a
                                    href="https://www.tiktok.com/@rieltor_olga_lida"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="fab fa-tiktok"
                                 ></a>
                              </li>
                              <li>
                                 <a
                                    href="https://t.me/TurkoOlga"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="fa-brands fa-telegram"
                                 ></a>
                              </li>
                              <li>
                                 <a
                                    href="https://www.instagram.com/rielter_olga_lida"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="fa-brands fa-square-instagram"
                                 ></a>
                              </li>
                           </ul>
                        </div>
                     </div>
                     <!-- 2. RECENT POSTS (Footer) -->
                     <div class="col-lg-3 col-md-6 col-sm-6">
                        <div class="widget recent-posts-entry-date">
                           <h5 class="widget-title">Посты в блоге</h5>

                           <div
                              class="widget-post-bx"
                              id="footer-recent-posts"
                           ></div>
                        </div>
                     </div>
                     <!-- 3. USEFUL LINKS -->
                     <div class="col-lg-3 col-md-6 col-sm-6 footer-col-3">
                        <div class="widget widget_services inline-links">
                           <h5 class="widget-title">Полезные ссылки</h5>
                           <ul>
                              <li>
                                 <a href="/rieltor-lida">Обо мне</a>
                              </li>
                              <li>
                                 <a href="/nedvizhimost-lida">Объекты</a>
                              </li>
                              <li>
                                 <a href="/blog">Блог</a>
                              </li>
                              <li>
                                 <a href="/contact">Контакты</a>
                              </li>
                              <li>
                                 <a href="/Privacy"
                                    >Политика конфиденциальности</a
                                 >
                              </li>
                              <li>
                                 <a href="/cookies-policy"
                                    >Политика использования cookies</a
                                 >
                              </li>
                           </ul>
                        </div>
                     </div>
                     <!-- 4. CONTACTS -->
                     <div class="col-lg-3 col-md-6 col-sm-6">
                        <div class="widget widget_address_outer">
                           <h5 class="widget-title">
                              Пора поговорить о вашем доме
                           </h5>
                           <ul class="widget_address">
                              <li>город Лида, бульвар Князя Гедимина, 12</li>
                              <li>
                                 <a href="mailto:olgaturko1975@gmail.com"
                                    >olgaturko1975@gmail.com</a
                                 >
                              </li>
                              <li>
                                 <a href="tel:+375291809516"
                                    >(+375) 29 180 95 16</a
                                 >
                              </li>
                              <li>
                                 <a href="tel:+375445019090"
                                    >(+375) 44 501 90 90</a
                                 >
                              </li>
                           </ul>
                        </div>
                     </div>
                  </div>
               </div>
               <!-- Call to Action -->
               <div class="container">
                  <div class="call-to-action-wrap">
                     <div class="row">
                        <div class="col-lg-7 col-md-6">
                           <div class="call-to-action-left">
                              <h5 class="text-uppercase m-b10 m-t0">
                                 Риэлтер Ольга Турко
                              </h5>

                              <span>
                                 Практикующий эксперт по эмоциональному
                                 позиционированию объектов недвижимости
                              </span>

                              <div class="footer-legal-info">
                                 <p>
                                    Свидетельство об аттестации риэлтера № 1931
                                    от 29.02.2024
                                 </p>

                                 <p>
                                    Услуги по сопровождению сделок с
                                    недвижимостью оказываются через
                                    лицензированное агентство недвижимости
                                    «ГермесГарант».
                                 </p>

                                 <p>
                                    Лицензия Министерства юстиции Республики
                                    Беларусь на осуществление риэлтерской
                                    деятельности № 02240/487 от 07.08.2024
                                 </p>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
            <!-- COPYRIGHT -->
            <div class="footer-bottom overlay-wraper">
               <div class="overlay-main"></div>
               <div class="container">
                  <div class="row">
                     <div class="sx-footer-bot-left">
                        <span class="copyrights-text"
                           >© 2025 Ольга Турко. Designed By INazarov.</span
                        >
                        <span
                           >Интернет-ресурс turko.by зарегистрирован в
                           Республике Беларусь. Номер ресурса: 212210 Дата
                           регистрации: 12.01.2026</span
                        >
                     </div>
                  </div>
               </div>
            </div>
         </footer>
         <!-- FOOTER END -->
      </div>

      <!-- =========================================
       JAVASCRIPT FILES
       ========================================= -->
      <!-- 4. Page Specific Init -->
      <script src="/js/optimize.js" defer data-versioned></script>
      <script src="/js/analytics-consent-loader.js" defer></script>
      <script src="/js/cookie-consent.js" defer></script>
      <script src="/js/footer-post.js" defer></script>
      <script src="/js/service-detail.js?v=20260304" defer></script>
      <script type="application/ld+json" id="schema-breadcrumbs"></script>
      <script type="application/ld+json" id="schema-service"></script>
       <!-- Contact widget -->
    <div class="cw" data-cw-root>
      <button
        class="cw__fab"
        type="button"
        aria-label="Открыть способы связи"
        aria-haspopup="dialog"
        aria-controls="cw-modal"
        aria-expanded="false"
        data-cw-open
      >
        <span class="cw__fab-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" role="img" focusable="false" aria-hidden="true">
            <path d="M4 5.5C4 4.12 5.12 3 6.5 3h11C18.88 3 20 4.12 20 5.5v8c0 1.38-1.12 2.5-2.5 2.5H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5v-8Zm2.5-.5a.5.5 0 0 0-.5.5v8c0 .28.22.5.5.5h1.5c.55 0 1 .45 1 1v.56l2.8-2.49A1 1 0 0 1 12.46 13h5.04a.5.5 0 0 0 .5-.5v-8a.5.5 0 0 0-.5-.5h-11Z"/>
          </svg>
        </span>
      </button>

      <div class="cw__overlay" data-cw-overlay hidden>
        <section
          id="cw-modal"
          class="cw__modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cw-title"
          aria-describedby="cw-desc"
          tabindex="-1"
        >
          <button class="cw__close" type="button" aria-label="Закрыть окно" data-cw-close>
            <span aria-hidden="true">×</span>
          </button>

          <h2 id="cw-title" class="cw__title">Я всегда на связи</h2>
          <p id="cw-desc" class="cw__subtitle">
            Напишите мне — подскажу по покупке или продаже и помогу разобраться в вашей ситуации
          </p>

          <div class="cw__content">
            <section class="cw__qr" aria-label="QR для быстрого перехода в Telegram">
              <h3 class="cw__qr-title">Сканируйте QR с телефона</h3>
              <div class="cw__qr-frame">
                <img
                  class="cw__qr-image"
                  src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=https%3A%2F%2Ft.me%2FTurkoOlga"
                  width="240"
                  height="240"
                  loading="lazy"
                  decoding="async"
                  alt="QR-код для быстрого открытия Telegram"
                >
              </div>
            </section>

            <nav class="cw__actions" aria-label="Способы связи">
              <a class="cw__action cw__action--whatsapp" href="https://wa.me/375291809516" target="_blank" rel="noopener noreferrer">
                <span class="cw__action-icon" aria-hidden="true">✆</span>
                <span class="cw__action-label">WhatsApp</span>
              </a>
              <a class="cw__action cw__action--telegram" href="https://t.me/TurkoOlga" target="_blank" rel="noopener noreferrer">
                <span class="cw__action-icon" aria-hidden="true">➤</span>
                <span class="cw__action-label">Telegram</span>
              </a>
              <a class="cw__action cw__action--viber" href="viber://chat?number=%2B375291809516">
                <span class="cw__action-icon" aria-hidden="true">◉</span>
                <span class="cw__action-label">Viber</span>
              </a>
            </nav>
          </div>

          <a class="cw__phone" href="tel:+375291809516">
            <span class="cw__phone-caption">Предпочитаете звонить?</span>
            <span class="cw__phone-number">+375291809516</span>
          </a>
        </section>
      </div>
    </div>
    <script src="/js/sw-register.js" defer></script>
    <script src="contact-widget.js" defer></script>      <!-- Legal & Compliance Components -->
      <script src="/js/agency-legal-block.js" defer></script>
      <script src="/js/consent-checkbox.js" defer></script></body>
</html>
