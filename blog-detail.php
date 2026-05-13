<?php
$rawSlug = isset($_GET['slug']) ? $_GET['slug'] : '';
$slug = preg_replace('/[^a-zA-Z0-9_\-]/', '', $rawSlug);
$canonicalUrl = $slug !== '' ? "https://turko.by/blog/$slug" : "https://turko.by/blog";

// Resolve OG image, title and description from blog-articles.json by slug
$ogImage = "https://turko.by/images/main-slider/2.webp";
$ogTitle = "Статья о недвижимости в Лиде — Ольга Турко";
$ogDescription = "Читайте разборы и рекомендации по рынку недвижимости Лиды: документы, этапы сделки и важные нюансы.";
$breadcrumbLeafName = "Статья";
$currentArticle = null;
if ($slug !== '') {
    $articlesFile = __DIR__ . '/data/blog-articles.json';
    if (is_file($articlesFile)) {
        $articlesData = json_decode(file_get_contents($articlesFile), true);
        if (is_array($articlesData)) {
            foreach ($articlesData as $art) {
                if (isset($art['slug']) && $art['slug'] === $slug) {
                    $currentArticle = $art;
                    if (!empty($art['image'])) {
                        $imgPath = $art['image'];
                        if (strpos($imgPath, 'http') === 0) {
                            $ogImage = $imgPath;
                        } else {
                            if ($imgPath[0] !== '/') { $imgPath = '/' . $imgPath; }
                            if (is_file(__DIR__ . $imgPath)) {
                                $ogImage = "https://turko.by{$imgPath}";
                            }
                        }
                    }
                    if (!empty($art['title'])) {
                        $ogTitle = $art['title'] . ' — Ольга Турко';
                        $breadcrumbLeafName = $art['title'];
                    }
                    if (!empty($art['metaDescription'])) {
                        $ogDescription = mb_substr(trim($art['metaDescription']), 0, 280);
                    }
                    break;
                }
            }
        }
    }
}
$ogImageEsc = htmlspecialchars($ogImage, ENT_QUOTES);
$ogTitleEsc = htmlspecialchars($ogTitle, ENT_QUOTES);
$ogDescriptionEsc = htmlspecialchars($ogDescription, ENT_QUOTES);
$breadcrumbJsonLd = json_encode([
    '@context' => 'https://schema.org',
    '@type' => 'BreadcrumbList',
    'itemListElement' => [
        ['@type' => 'ListItem', 'position' => 1, 'name' => 'Главная', 'item' => 'https://turko.by/'],
        ['@type' => 'ListItem', 'position' => 2, 'name' => 'Блог', 'item' => 'https://turko.by/blog'],
        ['@type' => 'ListItem', 'position' => 3, 'name' => $breadcrumbLeafName, 'item' => $canonicalUrl],
    ],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
$articleJsonLd = null;
if (is_array($currentArticle)) {
    $articleImage = $currentArticle['image'] ?? '/images/og/blog-default.webp';
    if (!is_string($articleImage) || $articleImage === '') {
        $articleImage = '/images/og/blog-default.webp';
    }
    if (strpos($articleImage, 'http') !== 0) {
        if ($articleImage[0] !== '/') {
            $articleImage = '/' . $articleImage;
        }
        $articleImage = 'https://turko.by' . $articleImage;
    }

    $articleDescription = $currentArticle['excerpt'] ?? ($currentArticle['metaDescription'] ?? '');
    if (!is_string($articleDescription) || trim($articleDescription) === '') {
        $articleDescription = mb_substr(strip_tags((string)($currentArticle['content'] ?? '')), 0, 200);
    }

    $articleLd = [
        '@context' => 'https://schema.org',
        '@type' => 'BlogPosting',
        'headline' => $currentArticle['title'] ?? $breadcrumbLeafName,
        'description' => trim($articleDescription),
        'image' => $articleImage,
        'datePublished' => $currentArticle['publishedAt'] ?? null,
        'dateModified' => $currentArticle['updatedAt'] ?? ($currentArticle['publishedAt'] ?? null),
        'author' => [
            '@type' => 'Person',
            'name' => 'Ольга Турко',
            'url' => 'https://turko.by/rieltor-lida',
        ],
        'publisher' => [
            '@type' => 'Organization',
            'name' => 'Ольга Турко — Риэлтер в Лиде',
            'logo' => [
                '@type' => 'ImageObject',
                'url' => 'https://turko.by/images/logo-dark.webp',
            ],
        ],
        'mainEntityOfPage' => $canonicalUrl,
        'articleSection' => $currentArticle['category'] ?? 'Недвижимость',
        'keywords' => !empty($currentArticle['tags']) && is_array($currentArticle['tags']) ? implode(', ', $currentArticle['tags']) : null,
    ];

    $articleJsonLd = json_encode($articleLd, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_LINE_TERMINATORS);
}

// =========================================================
// Related links (контекстные ссылки на услуги/каталог)
// Гибрид: ручной override через relatedLinks в статье > авто по тегам
// =========================================================
$relatedLinks = [];
$ctaBlock = null;
if ($currentArticle !== null) {
    $relatedMapFile = __DIR__ . '/data/blog-related-map.json';
    $ctaMapFile = __DIR__ . '/data/blog-cta-map.json';
    $relatedMap = is_file($relatedMapFile) ? json_decode(file_get_contents($relatedMapFile), true) : null;
    $ctaMap = is_file($ctaMapFile) ? json_decode(file_get_contents($ctaMapFile), true) : null;

    // Сбор ссылок
    $candidates = [];
    if (!empty($currentArticle['relatedLinks']) && is_array($currentArticle['relatedLinks'])) {
        $candidates = $currentArticle['relatedLinks'];
    } elseif (is_array($relatedMap) && !empty($currentArticle['tags'])) {
        $tagsLower = array_map(function($t) { return mb_strtolower(trim($t)); }, $currentArticle['tags']);
        $tagsMap = $relatedMap['tags'] ?? [];
        $tagsMapLower = [];
        foreach ($tagsMap as $k => $v) { $tagsMapLower[mb_strtolower($k)] = $v; }
        foreach ($tagsLower as $tag) {
            if (isset($tagsMapLower[$tag])) { $candidates[] = $tagsMapLower[$tag]; }
        }
        if (count($candidates) < 2 && !empty($relatedMap['fallback'])) {
            foreach ($relatedMap['fallback'] as $fb) { $candidates[] = $fb; }
        }
    }
    // Dedupe по URL, исключаем ссылку саму на себя
    $selfPath = "/blog/{$currentArticle['slug']}";
    $seen = [];
    foreach ($candidates as $c) {
        if (empty($c['url']) || empty($c['title'])) continue;
        if ($c['url'] === $selfPath) continue;
        if (isset($seen[$c['url']])) continue;
        $seen[$c['url']] = true;
        $relatedLinks[] = $c;
        if (count($relatedLinks) >= 3) break;
    }

    // CTA
    if (is_array($ctaMap)) {
        $cat = $currentArticle['category'] ?? '';
        $ctaBlock = $ctaMap['categories'][$cat] ?? ($ctaMap['default'] ?? null);
    }
}
$ctaJson = $ctaBlock ? json_encode($ctaBlock, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : '';
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
    <title><?php echo $ogTitleEsc; ?></title>
    <meta name="author" content="Ольга Турко, риэлтер в Лиде, Беларусь" />
    <meta
      name="description"
      content="<?php echo $ogDescriptionEsc; ?>"
    />
    <meta name="robots" content="index, follow" />
    <!-- Canonical Link (SEO) -->
    <link rel="canonical" href="<?php echo htmlspecialchars($canonicalUrl, ENT_QUOTES); ?>" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="<?php echo $ogTitleEsc; ?>" />
    <meta property="og:description" content="<?php echo $ogDescriptionEsc; ?>" />
    <meta property="og:url" content="<?php echo htmlspecialchars($canonicalUrl, ENT_QUOTES); ?>" />
    <meta property="og:image" content="<?php echo $ogImageEsc; ?>" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="<?php echo $ogTitleEsc; ?>" />
    <meta name="twitter:description" content="<?php echo $ogDescriptionEsc; ?>" />
    <meta name="twitter:image" content="<?php echo $ogImageEsc; ?>" />
    <!-- Breadcrumbs (JSON-LD) -->
    <script type="application/ld+json"><?php echo $breadcrumbJsonLd; ?></script>
    <?php if ($articleJsonLd !== null): ?>
    <script type="application/ld+json"><?php echo $articleJsonLd; ?></script>
    <?php endif; ?>
    <!-- =========================================
       3. ICONS & FONTS
       ========================================= -->
    <!-- Favicons -->
    <link rel="icon" href="https://turko.by/favicon.ico" sizes="any" />
    <link rel="icon" type="image/svg+xml" href="https://turko.by/favicon.svg" />
    <link rel="manifest" href="https://turko.by/site.webmanifest" />
    <meta name="theme-color" content="#006064" />
    <link rel="apple-touch-icon" href="https://turko.by/apple-touch-icon.png" />
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
    <link rel="preconnect" href="https://api.qrserver.com" crossorigin />
    <link rel="preload" href="/fonts/inter/Inter-Regular.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="/fonts/inter/Inter-Medium.woff2" as="font" type="font/woff2" crossorigin />
    <link rel="preload" href="/fonts/montserrat/Montserrat-Bold.woff2" as="font" type="font/woff2" crossorigin />
    <!-- =========================================
       4. STYLESHEETS (CSS)
       ========================================= -->
    <link rel="stylesheet" type="text/css" href="css/bootstrap.min.css" />
    <link rel="stylesheet" type="text/css" href="css/style.css" data-versioned />
    <link rel="preload" href="/css/fontawesome/css/fontawesome.min.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
    <link rel="preload" href="/css/fontawesome/css/brands.min.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
    <link rel="preload" href="/css/fontawesome/css/solid.min.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
    <link rel="stylesheet" href="/css/blog-tags.css" />
    <link rel="stylesheet" href="/css/blog-views.css" />
    <link rel="stylesheet" href="/css/blog-related.css" />
    <link rel="stylesheet" href="/css/contact-widget.css">
</head>
  <body>


    <div class="page-wraper">
      <!-- HEADER START -->
<header class="site-header nav-wide nav-transparent">
  <div class="sticky-header is-stuck main-bar-wraper navbar-expand-lg">
    <div class="main-bar">
      <div class="container clearfix">

        <!-- Logo -->
        <div class="logo-header">
          <div class="logo-header-inner logo-header-one">
            <a href="/">
              <img src="images/logo-light.svg" class="site-logo site-logo--light" alt="Ольга Турко — риэлтер в Лиде" width="180" height="48" loading="lazy" decoding="async" />
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

<section class="page-intro">
  <div class="container">
    <div class="page-intro-inner">

      <span class="page-intro-eyebrow" id="page-eyebrow">
        Блог
      </span>

      <h1 class="page-intro-title" id="page-title">
      </h1>

      <p class="page-intro-description" id="page-lead">
      </p>

      <div class="page-intro-divider"></div>

      <nav class="page-intro-breadcrumb" aria-label="breadcrumb">
        <ul id="breadcrumb">
          <li><a href="/">Главная</a></li>
          <li><a href="/blog">Блог</a></li>
          <li><?php echo htmlspecialchars($breadcrumbLeafName, ENT_QUOTES); ?></li>
        </ul>
      </nav>

    </div>
  </div>
</section>
    <div class="reading-progress">
  <div class="reading-progress-bar" id="readingProgressBar"></div>
</div>
        <!-- SECTION CONTENT START -->

        <div class="section-full bg-white bg-gray p-t80 p-b50 inner-page-padding">
          <div class="container">
            <div class="row">
              <!-- ЛЕВАЯ КОЛОНКА — СТАТЬЯ -->
              <div class="col-lg-8 col-md-12 col-sm-12">
                <div class="blog-post blog-detail text-black">
                  <div class="sx-post-media"></div>

                  <div class="sx-post-meta m-t20">

                    <ul>
                      <li class="post-date" id="post-date"></li>
                      <li class="post-author">
                        <span id="post-author"></span>
                      </li>
                      <li class="post-category">
                        <span id="post-category"></span>
                      </li>
                      <li class="post-reading">
                         <i class="fa-solid fa-clock"></i>
  <span id="reading-time"></span>
</li>
                    </ul>
                  </div>

                  <div class="sx-post-title">
                    <h2 class="post-title" id="post-title"></h2>
                  </div>

                  <!-- INSTAGRAM CARD -->
                  <div
                    class="instagram-related-post"
                    data-instagram
                    style="display: none"
                  >
                    <i class="fa-brands fa-instagram instagram-icon"></i>

                    <div class="instagram-media">
            <img loading="lazy" decoding="async" width="600" height="600" data-instagram-image alt="Instagram Ольги Турко — риэлтер в Лиде" />
                    </div>

                    <div class="instagram-related-content">
                      <span class="instagram-label"
                        >Источник статьи — Instagram</span
                      >
                      <p data-instagram-text></p>
                      <span class="instagram-date" data-instagram-date></span>
                    </div>
                  </div>

                  <div class="sx-post-text" id="post-content"<?php if ($ctaJson): ?> data-mid-cta='<?php echo htmlspecialchars($ctaJson, ENT_QUOTES); ?>'<?php endif; ?>></div>

                <?php if (!empty($relatedLinks)): ?>
                <aside class="related-links-card" aria-labelledby="related-links-title">
                  <h3 id="related-links-title" class="related-links-card__title">По теме</h3>
                  <ul class="related-links-card__list">
                    <?php foreach ($relatedLinks as $link): ?>
                      <li><a href="<?php echo htmlspecialchars($link['url'], ENT_QUOTES); ?>" title="<?php echo htmlspecialchars($link['title'], ENT_QUOTES); ?>"><?php echo htmlspecialchars($link['title'], ENT_QUOTES); ?></a></li>
                    <?php endforeach; ?>
                  </ul>
                </aside>
                <?php endif; ?>

                <div class="related-posts">
  <h3 class="related-title">Статьи по теме</h3>
  <div class="related-grid" id="relatedPosts"></div>
</div>
                
                </div>
              </div>




              <!-- ПРАВАЯ КОЛОНКА — SIDEBAR -->
              <div class="col-lg-4 col-md-12 col-sm-12 sticky_column">
                <div class="service-sidebar">
                <div class="side-bar p-a30 bg-gray">

<div class="widget widget-tags">
  <h4 class="widget-title">Темы статьи</h4>
<div class="tags-description">
  Быстрый переход по темам
</div>
  <div class="post-tags-sidebar" id="post-tags"></div>
</div>





                  <!-- RECENT POSTS -->
                  <div class="widget recent-posts-entry">
                    <h4 class="widget-title">Из моего блога</h4>
                    <div class="section-content p-a10 bg-white">
                      <div class="widget-post-bx" id="recent-posts"></div>
                    </div>
                  </div>
                  <!-- OUR GALLERY  -->
                  <div class="widget widget_gallery">
                    <h4 class="widget-title">Галерея</h4>
                    <ul class="p-a10 bg-white clearfix">
                      <li>
                        <div class="sx-post-thum">
                        <img src="/images/about-slider/2.webp" alt="Ольга Турко консультирует клиентов по недвижимости в Лиде" width="1200" height="800" loading="lazy" decoding="async" />
                        </div>
                      </li>

                      <li>
                        <div class="sx-post-thum">
                        <img src="/images/about-slider/1.webp" alt="Риэлтер Ольга Турко на показе недвижимости в Лиде" width="1200" height="800" loading="lazy" decoding="async" />
                        </div>
                      </li>

                      <li>
                        <div class="sx-post-thum">
                        <img src="/images/about-slider/3.webp" alt="Сопровождение сделки с недвижимостью в Лиде — Ольга Турко" width="1200" height="800" loading="lazy" decoding="async" />
                        </div>
                      </li>

                      <li>
                        <div class="sx-post-thum">
                        <img src="/images/about-slider/4.webp" alt="Ольга Турко — эксперт по продаже квартир и домов в Лиде" width="1200" height="800" loading="lazy" decoding="async" />
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </div></div>
            </div>
          </div>
        </div>
      
    </div>
    <!-- CONTENT END -->
    <!-- FOOTER START -->
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
                    <img src="images/logo-light.svg" class="site-logo site-logo--light" alt="Ольга Турко — риэлтер в Лиде" width="180" height="48" loading="lazy" decoding="async" />
                  </a>
                </div>
                <p>
                  <b>Найти квартиру — легко. Найти свою — искусство.</b>
                  <br />Я подбираю не абстрактные “варианты”, а то самое жильё,
                  где совпадают цена, планировка, настроение и ощущение “вот тут
                  — моё”.
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
            <!-- 2. RECENT POSTS (Footer) -->
            <div class="col-lg-3 col-md-6 col-sm-6">
              <div class="widget recent-posts-entry-date">
                <h5 class="widget-title">Посты в блоге</h5>

                <div class="widget-post-bx" id="footer-recent-posts"></div>
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
                    <a href="/Privacy">Политика конфиденциальности</a>
                  </li>
                  <li>
                    <a href="/cookies-policy">Политика использования cookies</a>
                  </li>
                </ul>
              </div>
            </div>
            <!-- 4. CONTACTS -->
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
                  <li>
                    <a href="tel:+375291809516">(+375) 29 180 95 16</a>
                  </li>
                  <li>
                    <a href="tel:+375445019090">(+375) 44 501 90 90</a>
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
            Практикующий эксперт по эмоциональному позиционированию
            объектов недвижимости
          </span>

          <div class="footer-legal-info">

            <p>
              Свидетельство об аттестации риэлтера № 1931 от 29.02.2024
            </p>

            <p>
              Услуги по сопровождению сделок с недвижимостью оказываются через
              лицензированное агентство недвижимости «ГермесГрупп».
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
                >Интернет-ресурс turko.by зарегистрирован в Республике Беларусь.
                Номер ресурса: 212210 Дата регистрации: 12.01.2026</span
              >
            </div>
          </div>
        </div>
      </div>
    </footer>
    <!-- FOOTER END -->
    <!-- =========================================
       JAVASCRIPT FILES
       ========================================= -->
    <!-- 4. Page Specific Init -->
    <script src="/js/optimize.js" defer data-versioned></script>
    <script src="/js/blog-tags.js" defer></script>
    <script src="/js/blog-views.js" defer></script>
      <script src="/js/analytics-consent-loader.js" defer></script>
    <script src="/js/cookie-consent.js" defer></script>
    <script src="/js/blog-detail.js" defer data-versioned></script>
    <script src="/js/footer-post.js" defer></script>
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
    <script src="contact-widget.js" defer></script>
</body>
</html>
