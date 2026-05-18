<?php
$rawSlug = isset($_GET['slug']) ? $_GET['slug'] : '';
$slug = preg_replace('/[^a-zA-Z0-9_\-]/', '', $rawSlug);

$districtsFile = __DIR__ . '/data/districts.json';
$district = null;
$all = [];

if ($slug !== '' && file_exists($districtsFile)) {
    $all = json_decode(file_get_contents($districtsFile), true);
    if (is_array($all)) {
        foreach ($all as $d) {
            if (isset($d['slug']) && $d['slug'] === $slug) {
                $district = $d;
                break;
            }
        }
    }
}

if ($district === null) {
    http_response_code(404);
    include __DIR__ . '/404.html';
    exit;
}

$name        = $district['name'] ?? '';
$nameFull    = $district['nameFull'] ?? $name;
$city        = $district['city'] ?? 'Лида';
$metaTitle   = $district['metaTitle'] ?? ($nameFull . ', ' . $city . ' — недвижимость');
$metaDesc    = $district['metaDescription'] ?? '';
$h1          = $district['h1'] ?? ('Недвижимость в ' . $nameFull . ', ' . $city);
$shortDesc   = $district['shortDescription'] ?? '';
$seoText     = $district['seoText'] ?? [];
$advantages  = $district['advantages'] ?? [];
$stats       = $district['stats'] ?? [];
$lat         = $district['coordinates']['lat'] ?? 53.8985;
$lng         = $district['coordinates']['lng'] ?? 25.2975;
$canonicalUrl = 'https://turko.by/raion/' . $slug;

function districtStatIsZero($value) {
    if ($value === null || $value === '') {
        return false;
    }
    if (is_numeric($value) && (float)$value === 0.0) {
        return true;
    }
    return false;
}

function russianPlural($number, $forms) {
    if (!is_array($forms) || count($forms) < 3) {
        return '';
    }

    $n = abs((int)$number);
    $mod100 = $n % 100;
    if ($mod100 >= 11 && $mod100 <= 14) {
        return $forms[2];
    }

    $mod10 = $n % 10;
    if ($mod10 === 1) {
        return $forms[0];
    }

    if ($mod10 >= 2 && $mod10 <= 4) {
        return $forms[1];
    }

    return $forms[2];
}

function getShortDistrictLabel($name) {
    $label = trim((string)$name);
    if ($label === '') {
        return '';
    }

    $label = preg_replace('/\b(микрорайон|квартал)\b/iu', '', $label);
    $label = preg_replace('/\s{2,}/u', ' ', trim($label));

    return $label;
}

function getDistrictInPrepositionalCase($district) {
    if (!empty($district['nameInPrepositional'])) {
        return (string)$district['nameInPrepositional'];
    }

    $nameFull = (string)($district['nameFull'] ?? $district['name'] ?? '');
    if ($nameFull === '') return '';

    if (preg_match('/^(.+)\s+микрорайон$/u', $nameFull, $m)) {
        $base = trim($m[1]);
        if (preg_match('/(ий|ый)$/u', $base)) {
            return preg_replace('/(ий|ый)$/u', 'ом', $base) . ' районе';
        }
        return $base . ' районе';
    }

    return $nameFull;
}

function normalizeDistrictValue($value) {
    $stringValue = (string)$value;
    $stringValue = trim($stringValue);
    $stringValue = mb_strtolower($stringValue, 'UTF-8');
    $stringValue = str_replace('ё', 'е', $stringValue);
    $stringValue = str_replace(['_', ' '], '-', $stringValue);
    $stringValue = preg_replace('/[^a-zа-я0-9\-]+/u', '', $stringValue);
    $stringValue = preg_replace('/-+/', '-', $stringValue);
    return trim((string)$stringValue, '-');
}

function normalizeStreetValue($value) {
    $stringValue = (string)$value;
    $stringValue = trim($stringValue);
    $stringValue = mb_strtolower($stringValue, 'UTF-8');
    $stringValue = str_replace('ё', 'е', $stringValue);
    $stringValue = preg_replace('/[^a-zа-я0-9]+/u', ' ', $stringValue);
    $stringValue = preg_replace('/\s+/u', ' ', $stringValue);
    return trim($stringValue);
}

function objectMatchesDistrictByStreet($objectAddress, $districtStreets) {
    if (!is_string($objectAddress) || trim($objectAddress) === '' || !is_array($districtStreets)) {
        return false;
    }

    $normalizedAddress = normalizeStreetValue($objectAddress);
    if ($normalizedAddress === '') {
        return false;
    }

    foreach ($districtStreets as $street) {
        $normalizedStreet = normalizeStreetValue($street);
        if ($normalizedStreet === '') {
            continue;
        }

        if (mb_strpos($normalizedAddress, $normalizedStreet) !== false) {
            return true;
        }
    }

    return false;
}

$matchedObjects = [];
$objectsFile = __DIR__ . '/data/objects.json';
if (file_exists($objectsFile)) {
    $objects = json_decode(file_get_contents($objectsFile), true);
    if (is_array($objects)) {
        $normalizedCurrentSlug = normalizeDistrictValue($slug);
        $districtStreets = $district['streets'] ?? [];
        foreach ($objects as $obj) {
            $objectDistrict = $obj['district'] ?? '';
            $normalizedObjectDistrict = normalizeDistrictValue($objectDistrict);
            if ($normalizedObjectDistrict !== '' && $normalizedObjectDistrict === $normalizedCurrentSlug) {
                $matchedObjects[] = $obj;
                continue;
            }

            $objectAddress = $obj['address'] ?? '';
            if (objectMatchesDistrictByStreet($objectAddress, $districtStreets)) {
                $matchedObjects[] = $obj;
            }
        }
    }
}

$schemaPlace = json_encode([
    '@context' => 'https://schema.org',
    '@type'    => 'Place',
    'name'     => $nameFull . ', ' . $city,
    'address'  => ['@type' => 'PostalAddress', 'addressLocality' => $city, 'addressCountry' => 'BY'],
    'geo'      => ['@type' => 'GeoCoordinates', 'latitude' => $lat, 'longitude' => $lng],
    'url'      => $canonicalUrl,
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

$breadcrumbLd = json_encode([
    '@context' => 'https://schema.org',
    '@type'    => 'BreadcrumbList',
    'itemListElement' => [
        ['@type' => 'ListItem', 'position' => 1, 'name' => 'Главная',              'item' => 'https://turko.by/'],
        ['@type' => 'ListItem', 'position' => 2, 'name' => 'Недвижимость в Лиде', 'item' => 'https://turko.by/nedvizhimost-lida'],
        ['@type' => 'ListItem', 'position' => 3, 'name' => $nameFull,              'item' => $canonicalUrl],
    ],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

$metaTitleEsc = htmlspecialchars($metaTitle, ENT_QUOTES, 'UTF-8');
$metaDescEsc  = htmlspecialchars($metaDesc,  ENT_QUOTES, 'UTF-8');
$canonicalEsc = htmlspecialchars($canonicalUrl, ENT_QUOTES, 'UTF-8');
?>
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title><?= $metaTitleEsc ?></title>
  <meta name="author"      content="Ольга Турко, риэлтер в Лиде, Беларусь" />
  <meta name="robots"      content="index, follow" />
  <meta name="description" content="<?= $metaDescEsc ?>" />
  <link rel="canonical"    href="<?= $canonicalEsc ?>" />

  <meta property="og:type"        content="website" />
  <meta property="og:title"       content="<?= $metaTitleEsc ?>" />
  <meta property="og:description" content="<?= $metaDescEsc ?>" />
  <meta property="og:url"         content="<?= $canonicalEsc ?>" />
  <meta property="og:image"       content="https://turko.by/images/main-slider/2.webp" />

  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="<?= $metaTitleEsc ?>" />
  <meta name="twitter:description" content="<?= $metaDescEsc ?>" />
  <meta name="twitter:image"       content="https://turko.by/images/main-slider/2.webp" />

  <script type="application/ld+json"><?= $schemaPlace ?></script>
  <script type="application/ld+json"><?= $breadcrumbLd ?></script>

  <link rel="icon" href="https://turko.by/favicon.ico" sizes="any" />
  <link rel="icon" type="image/svg+xml" href="https://turko.by/favicon.svg" />
  <link rel="manifest" href="https://turko.by/site.webmanifest" />
  <meta name="theme-color" content="#006064" />
  <link rel="apple-touch-icon" href="https://turko.by/apple-touch-icon.png" />

  <script src="/site-version.php"></script>

  <link rel="preload" href="/fonts/inter/Inter-Regular.woff2"       as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/inter/Inter-Medium.woff2"        as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/montserrat/Montserrat-Bold.woff2" as="font" type="font/woff2" crossorigin>

  <link rel="stylesheet" type="text/css" href="/css/bootstrap.min.css" />
  <link rel="preload" href="/css/fontawesome/css/fontawesome.min.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
  <link rel="preload" href="/css/fontawesome/css/brands.min.css"      as="style" onload="this.onload=null;this.rel='stylesheet'">
  <link rel="preload" href="/css/fontawesome/css/regular.min.css"     as="style" onload="this.onload=null;this.rel='stylesheet'">
  <link rel="preload" href="/css/fontawesome/css/solid.min.css"       as="style" onload="this.onload=null;this.rel='stylesheet'">
  <link rel="stylesheet" type="text/css" href="/css/style.css" data-versioned />
  <link rel="stylesheet" href="/css/flaticon.min.css" data-versioned />
  <link rel="stylesheet" href="/css/district-info.css" data-versioned />
  <link rel="stylesheet" href="/css/contact-widget.css" data-versioned />
</head>
<body id="bg">
<div class="page-wraper">

<!-- HEADER -->
<header class="site-header nav-wide nav-transparent">
  <div class="sticky-header is-stuck main-bar-wraper navbar-expand-lg">
    <div class="main-bar">
      <div class="container clearfix">
        <div class="logo-header">
          <div class="logo-header-inner logo-header-one">
            <a href="/"><img src="/images/logo-light.svg" class="site-logo site-logo--light" alt="Ольга Турко — риэлтер в Лиде" width="180" height="48" loading="lazy" decoding="async" /></a>
          </div>
        </div>
        <button id="mobile-side-drawer" type="button" class="navbar-toggler" aria-label="Открыть меню">
          <span class="sr-only">Toggle navigation</span>
          <span class="icon-bar icon-bar-first"></span>
          <span class="icon-bar icon-bar-two"></span>
          <span class="icon-bar icon-bar-three"></span>
        </button>
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

<!-- MOBILE MENU -->
<div class="mnav-overlay" id="mnavOverlay"></div>
<nav class="mnav" id="mnav">
  <div class="mnav-header">
    <div class="mnav-name">Ольга Турко · Риэлтер · Лида</div>
  </div>
  <ul class="mnav-list">
    <li><a href="/"                   data-path="/"><i class="fa-solid fa-house"></i><span>Главная</span></a></li>
    <li><a href="/rieltor-lida"       data-path="/rieltor-lida"><i class="fa-solid fa-user"></i><span>Обо мне</span></a></li>
    <li><a href="/nedvizhimost-lida"  data-path="/nedvizhimost-lida"><i class="fa-solid fa-building"></i><span>Объекты</span></a></li>
    <li><a href="/blog"               data-path="/blog"><i class="fa-solid fa-pen-nib"></i><span>Блог</span></a></li>
    <li><a href="/faq"                data-path="/faq"><i class="fa-solid fa-circle-question"></i><span>Вопросы</span></a></li>
    <li><a href="/contact"            data-path="/contact"><i class="fa-solid fa-phone"></i><span>Контакты</span></a></li>
  </ul>
  <div class="mnav-cta">
    <a href="tel:+375291809516" class="mnav-cta-btn"><i class="fa-solid fa-phone"></i> Позвонить мне</a>
  </div>
</nav>

<!-- CONTENT -->
<div class="page-content">

  <!-- PAGE INTRO -->
  <section class="page-intro">
    <div class="container">
      <div class="page-intro-inner">
        <span class="page-intro-eyebrow">Район Лиды</span>
        <h1 class="page-intro-title"><?= htmlspecialchars($h1, ENT_QUOTES, 'UTF-8') ?></h1>
        <?php if ($shortDesc): ?>
        <p class="page-intro-description"><?= htmlspecialchars($shortDesc, ENT_QUOTES, 'UTF-8') ?></p>
        <?php endif; ?>
        <nav class="page-intro-breadcrumb" aria-label="breadcrumb">
          <ol class="sx-breadcrumb breadcrumb-style-2" itemscope itemtype="https://schema.org/BreadcrumbList">
            <li class="breadcrumb-item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
              <a href="/" itemprop="item"><span itemprop="name">Главная</span></a>
              <meta itemprop="position" content="1" />
            </li>
            <li class="breadcrumb-item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
              <a href="/nedvizhimost-lida" itemprop="item"><span itemprop="name">Недвижимость в Лиде</span></a>
              <meta itemprop="position" content="2" />
            </li>
            <li class="breadcrumb-item active" aria-current="page" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
              <span itemprop="name"><?= htmlspecialchars($nameFull, ENT_QUOTES, 'UTF-8') ?></span>
              <meta itemprop="position" content="3" />
            </li>
          </ol>
        </nav>
      </div>
    </div>
  </section>

  <!-- MAIN CONTENT -->
  <div class="section-full p-tb80 inner-page-padding bg-white">
    <div class="container">

      <!-- STATS -->
      <div class="district-page-stats">
        <?php
        $districtNamePrepositional = getDistrictInPrepositionalCase($district);
        $statMap = [
          'toCenter' => ['defaultLabel' => 'До центра'],
          'schools' => ['forms' => ['школа', 'школы', 'школ']],
          'kindergartens' => ['forms' => ['детский сад', 'детских сада', 'детских садов']],
          'clinics' => ['forms' => ['поликлиника', 'поликлиники', 'поликлиник']],
          'shops' => ['forms' => ['магазин', 'магазина', 'магазинов']],
        ];
        foreach ($statMap as $key => $config):
          if (!isset($stats[$key])) continue;
          $value = $stats[$key];
          if (districtStatIsZero($value)) {
            continue;
          }
          $label = $config['defaultLabel'] ?? '';
          if (isset($config['forms']) && is_numeric($value)) {
            $label = russianPlural((int)$value, $config['forms']);
          } elseif (isset($config['forms'])) {
            $label = $config['forms'][2];
          }
        ?>
        <div class="district-page-stat">
          <span class="district-page-stat__value"><?= htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8') ?></span>
          <span class="district-page-stat__label"><?= htmlspecialchars($label, ENT_QUOTES, 'UTF-8') ?></span>
        </div>
        <?php endforeach; ?>
      </div>

      <div class="row">
        <div class="col-lg-8 col-md-12">

          <!-- SEO TEXT -->
          <?php if (!empty($seoText)): ?>
          <div class="district-seo-text m-b50">
            <?php foreach ($seoText as $para): ?>
            <p><?= htmlspecialchars($para, ENT_QUOTES, 'UTF-8') ?></p>
            <?php endforeach; ?>
          </div>
          <?php endif; ?>

          <!-- ADVANTAGES -->
          <?php if (!empty($advantages)): ?>
          <header class="section-head section-head--bracket m-b20">
            <h2 class="section-title" style="font-size:20px;">Преимущества района</h2>
          </header>
          <div class="district-advantages m-b50">
            <?php foreach ($advantages as $adv): ?>
            <div class="district-advantage">
              <div class="district-advantage__icon">
                <i class="<?= htmlspecialchars($adv['icon'] ?? 'fa-solid fa-star', ENT_QUOTES, 'UTF-8') ?>"></i>
              </div>
              <div>
                <div class="district-advantage__title"><?= htmlspecialchars($adv['title'] ?? '', ENT_QUOTES, 'UTF-8') ?></div>
                <p class="district-advantage__text"><?= htmlspecialchars($adv['text'] ?? '', ENT_QUOTES, 'UTF-8') ?></p>
              </div>
            </div>
            <?php endforeach; ?>
          </div>
          <?php endif; ?>

          <!-- OBJECTS LIST -->
          <header class="section-head section-head--bracket m-b20">
            <h2 class="section-title" style="font-size:20px;">
              Объекты в <?= htmlspecialchars($districtNamePrepositional !== '' ? $districtNamePrepositional : $nameFull, ENT_QUOTES, 'UTF-8') ?>
              <?php if (!empty($matchedObjects)): ?>
              <span style="font-size:14px;font-weight:400;color:#787878;margin-left:8px;">(<?= count($matchedObjects) ?>)</span>
              <?php endif; ?>
            </h2>
          </header>

          <?php if (!empty($matchedObjects)): ?>
          <div class="district-objects-grid">
            <?php foreach ($matchedObjects as $obj):
              $oSlug  = htmlspecialchars($obj['slug'] ?? '', ENT_QUOTES, 'UTF-8');
              $oTitle = htmlspecialchars($obj['title'] ?? '', ENT_QUOTES, 'UTF-8');
              $oAddr  = htmlspecialchars($obj['address'] ?? '', ENT_QUOTES, 'UTF-8');
              $oType  = htmlspecialchars($obj['type'] ?? '', ENT_QUOTES, 'UTF-8');
              $oPriceBYN = isset($obj['priceBYN']) ? number_format((float)$obj['priceBYN'], 0, ',', ' ') : null;
              $oPriceUSD = isset($obj['priceUSD']) ? number_format((float)$obj['priceUSD'], 0, ',', ' ') : null;
              $imgSrc = '/images/background/bg-12.webp';
              if (!empty($obj['images'][0])) {
                  $imgSrc = $obj['images'][0];
              } elseif (isset($obj['id']) && preg_match('/(\d+)/', (string)$obj['id'], $m)) {
                  $imgSrc = '/images/objects/pic' . $m[1] . '.webp';
              }
              $imgSrcEsc = htmlspecialchars($imgSrc, ENT_QUOTES, 'UTF-8');
            ?>
            <a class="district-object-card" href="/objects/<?= $oSlug ?>">
              <img class="district-object-card__img"
                   src="<?= $imgSrcEsc ?>"
                   alt="<?= $oTitle ?>"
                   loading="lazy"
                   onerror="this.src='/images/background/bg-12.webp'" />
              <div class="district-object-card__body">
                <div class="district-object-card__type"><?= $oType ?></div>
                <div class="district-object-card__title"><?= $oTitle ?></div>
                <?php if ($oAddr): ?>
                <div class="district-object-card__address">
                  <i class="fa-solid fa-location-dot" style="margin-right:4px;"></i><?= $oAddr ?>
                </div>
                <?php endif; ?>
                <?php if ($oPriceBYN): ?>
                <div class="district-object-card__price">
                  <?= $oPriceBYN ?> BYN
                  <?php if ($oPriceUSD): ?>
                  <span style="font-size:13px;font-weight:400;color:#787878;margin-left:6px;">(~$<?= $oPriceUSD ?>)</span>
                  <?php endif; ?>
                </div>
                <?php endif; ?>
              </div>
            </a>
            <?php endforeach; ?>
          </div>

          <?php else: ?>
          <div class="district-no-objects">
            <i class="fa-solid fa-house" style="font-size:32px;margin-bottom:10px;display:block;opacity:0.3;"></i>
            Сейчас нет актуальных объектов в этом районе.<br>
            <a href="/nedvizhimost-lida" style="color:var(--color-primary);">Смотреть все объекты в Лиде</a>
          </div>
          <?php endif; ?>

          <!-- INTERNAL LINKS -->
          <div class="district-internal-links">
            <div class="district-internal-links__title">Смотрите также</div>
            <ul class="district-internal-links__list">
              <li><a href="/nedvizhimost-lida">Вся недвижимость в Лиде</a></li>
              <li><a href="/rieltor-lida">Риэлтер в Лиде</a></li>
              <li><a href="/contact">Связаться с риэлтером</a></li>
              <li><a href="/#services">Услуги</a></li>
              <li><a href="/faq">Частые вопросы</a></li>
              <li><a href="/blog">Блог о недвижимости</a></li>
            </ul>
          </div>

        </div>

        <!-- SIDEBAR -->
        <div class="col-lg-4 col-md-12">
          <div class="bg-white p-a20 shadow district-sidebar-shell" style="border-radius:12px;position:sticky;top:100px;">
            <div class="agent-card" style="display:block;visibility:visible;opacity:1;">
              <div class="agent-avatar" style="margin-bottom:12px;">
                <img src="/images/about-slider/1-ab.webp"
                     onerror="this.style.display='none'"
                     alt="Ольга Турко — риэлтер в Лиде"
                     width="80" height="80"
                     style="border-radius:50%;width:80px;height:80px;object-fit:cover;"
                     loading="lazy" />
              </div>
              <div class="agent-name" style="font-size:17px;font-weight:700;margin-bottom:2px;">Ольга Турко</div>
              <div class="agent-role" style="font-size:13px;color:#787878;margin-bottom:10px;">Риэлтер в Лиде</div>
              <p style="font-size:13px;color:#555;line-height:1.6;margin-bottom:16px;">
                Помогу подобрать квартиру в <?= htmlspecialchars($nameFull, ENT_QUOTES, 'UTF-8') ?> по вашему бюджету и запросу. Более 10 лет опыта в недвижимости Лиды.
              </p>
              <a href="tel:+375291809516" class="site-button" style="display:block;text-align:center;margin-bottom:10px;">
                <i class="fa-solid fa-phone" style="margin-right:6px;"></i> Позвонить
              </a>
              <a href="/contact" class="site-button-secondry" style="display:block;text-align:center;">
                Написать риэлтеру
              </a>
              <hr style="margin:20px 0;border-color:#eee;" />
              <div style="font-size:13px;color:#555;line-height:1.7;">
                <strong style="display:block;margin-bottom:8px;">Купить квартиру в <?= htmlspecialchars($nameFull, ENT_QUOTES, 'UTF-8') ?>:</strong>
                <ul style="padding-left:16px;margin:0;">
                  <li>Подбор по параметрам и бюджету</li>
                  <li>Проверка юридической чистоты</li>
                  <li>Полное сопровождение сделки</li>
                  <li>Помощь с ипотекой и документами</li>
                </ul>
              </div>
              <hr class="district-sidebar__divider" style="margin:20px 0;border-color:#eee;" />
              <div class="district-sidebar__section">
                <div class="district-sidebar__title">Другие районы</div>
                <ul class="district-sidebar__list" style="list-style:none;margin:0;padding:0;">
                <?php foreach ($all as $otherDistrict):
                  if (!is_array($otherDistrict) || empty($otherDistrict['slug']) || empty($otherDistrict['nameFull'])) continue;
                  if ($otherDistrict['slug'] === $slug) continue;
                ?>
                <li>
                  <a href="/raion/<?= htmlspecialchars($otherDistrict['slug'], ENT_QUOTES, 'UTF-8') ?>">
                    <?= htmlspecialchars(getShortDistrictLabel($otherDistrict['nameFull']), ENT_QUOTES, 'UTF-8') ?>
                  </a>
                </li>
                <?php endforeach; ?>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>

  <!-- FOOTER -->
  <footer class="site-footer footer-large footer-dark footer-wide">
    <div class="footer-top overlay-wraper">
      <div class="overlay-main"></div>
      <div class="container">
        <div class="row">
          <div class="col-lg-3 col-md-6 col-sm-6">
            <div class="widget widget_about">
              <div class="logo-footer clearfix p-b15">
                <a href="/"><img src="/images/logo-light.svg" class="site-logo site-logo--light" alt="Ольга Турко — риэлтер в Лиде" width="180" height="48" loading="lazy" decoding="async" /></a>
              </div>
              <p><b>Найти квартиру — легко. Найти свою — искусство.</b><br>Я подбираю не абстрактные "варианты", а то самое жильё, где совпадают цена, планировка и ощущение "моё".</p>
              <ul class="social-icons sx-social-links">
                <li><a href="viber://chat?number=%2B375291809516" target="_blank" rel="noopener noreferrer" class="fa-brands fa-viber" aria-label="Написать в Viber"></a></li>
                <li><a href="https://www.tiktok.com/@rieltor_olga_lida" target="_blank" rel="noopener noreferrer" class="fab fa-tiktok" aria-label="TikTok"></a></li>
                <li><a href="https://t.me/TurkoOlga" target="_blank" rel="noopener noreferrer" class="fa-brands fa-telegram" aria-label="Написать в Telegram"></a></li>
                <li><a href="https://www.instagram.com/rielter_olga_lida" target="_blank" rel="noopener noreferrer" class="fa-brands fa-square-instagram" aria-label="Instagram"></a></li>
              </ul>
              <span>Практикующий эксперт по эмоциональному позиционированию объектов недвижимости</span>
              <div class="footer-legal-info">
                <p>Свидетельство об аттестации риэлтера № 1931 от 29.02.2024</p>
                <p>Услуги по сопровождению сделок с недвижимостью оказываются через лицензированное агентство недвижимости «ГермесГрупп».</p>
                <p>Лицензия Министерства юстиции Республики Беларусь на осуществление риэлтерской деятельности № 02240/487 от 07.08.2024</p>
              </div>
            </div>
          </div>
          <div class="col-lg-3 col-md-6 col-sm-6">
            <div class="widget recent-posts-entry-date">
              <h5 class="widget-title">Посты в блоге</h5>
              <div class="widget-post-bx" id="footer-recent-posts"></div>
            </div>
          </div>
          <div class="col-lg-3 col-md-6 col-sm-6 footer-col-3">
            <div class="widget widget_services inline-links">
              <h5 class="widget-title">Полезные ссылки</h5>
              <ul>
                <li><a href="/rieltor-lida">Обо мне</a></li>
                <li><a href="/nedvizhimost-lida">Объекты</a></li>
                <li><a href="/blog">Блог</a></li>
                <li><a href="/contact">Контакты</a></li>
                <li><a href="/Privacy">Политика конфиденциальности</a></li>
                <li><a href="/cookies-policy">Политика использования cookies</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div class="col-lg-3 col-md-6 col-sm-6">
            <div class="widget widget_address_outer">
              <h5 class="widget-title">Пора поговорить о вашем доме</h5>
              <ul class="widget_address">
                <li>город Лида, бульвар Князя Гедимина, 12</li>
                <li><a href="mailto:olgaturko1975@gmail.com">olgaturko1975@gmail.com</a></li>
                <li><a href="tel:+375291809516">(+375) 29 180 95 16</a></li>
                <li><a href="tel:+375445019090">(+375) 44 501 90 90</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="footer-bottom overlay-wraper">
      <div class="overlay-main"></div>
      <div class="container">
        <div class="row">
          <div class="sx-footer-bot-left">
            <span class="copyrights-text">© 2025 Ольга Турко. Designed By INazarov.</span>
            <span>Интернет-ресурс turko.by зарегистрирован в Республике Беларусь. Номер ресурса: 212210 Дата регистрации: 12.01.2026</span>
          </div>
        </div>
      </div>
    </div>
  </footer>

</div><!-- page-content -->
</div><!-- page-wraper -->

<!-- Contact widget -->
<div class="cw" data-cw-root>
  <button class="cw__fab" type="button" aria-label="Открыть способы связи" aria-haspopup="dialog" aria-controls="cw-modal" aria-expanded="false" data-cw-open>
    <span class="cw__fab-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" role="img" focusable="false" aria-hidden="true">
        <path d="M4 5.5C4 4.12 5.12 3 6.5 3h11C18.88 3 20 4.12 20 5.5v8c0 1.38-1.12 2.5-2.5 2.5H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5v-8Zm2.5-.5a.5.5 0 0 0-.5.5v8c0 .28.22.5.5.5h1.5c.55 0 1 .45 1 1v.56l2.8-2.49A1 1 0 0 1 12.46 13h5.04a.5.5 0 0 0 .5-.5v-8a.5.5 0 0 0-.5-.5h-11Z"/>
      </svg>
    </span>
  </button>
  <div class="cw__overlay" data-cw-overlay hidden>
    <section id="cw-modal" class="cw__modal" role="dialog" aria-modal="true" aria-labelledby="cw-title" aria-describedby="cw-desc" tabindex="-1">
      <button class="cw__close" type="button" aria-label="Закрыть окно" data-cw-close><span aria-hidden="true">×</span></button>
      <h2 id="cw-title" class="cw__title">Я всегда на связи</h2>
      <p id="cw-desc" class="cw__subtitle">Напишите мне — подскажу по покупке или продаже и помогу разобраться в вашей ситуации</p>
      <div class="cw__content">
        <section class="cw__qr" aria-label="QR для быстрого перехода в Telegram">
          <h3 class="cw__qr-title">Сканируйте QR с телефона</h3>
          <div class="cw__qr-frame">
            <img class="cw__qr-image" src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=https%3A%2F%2Ft.me%2FTurkoOlga" width="240" height="240" loading="lazy" decoding="async" alt="QR-код для быстрого открытия Telegram">
          </div>
        </section>
        <nav class="cw__actions" aria-label="Способы связи">
          <a class="cw__action cw__action--whatsapp" href="https://wa.me/375291809516" target="_blank" rel="noopener noreferrer"><span class="cw__action-icon" aria-hidden="true">✆</span><span class="cw__action-label">WhatsApp</span></a>
          <a class="cw__action cw__action--telegram" href="https://t.me/TurkoOlga" target="_blank" rel="noopener noreferrer"><span class="cw__action-icon" aria-hidden="true">➤</span><span class="cw__action-label">Telegram</span></a>
          <a class="cw__action cw__action--viber" href="viber://chat?number=%2B375291809516"><span class="cw__action-icon" aria-hidden="true">◉</span><span class="cw__action-label">Viber</span></a>
        </nav>
      </div>
      <a class="cw__phone" href="tel:+375291809516">
        <span class="cw__phone-caption">Предпочитаете звонить?</span>
        <span class="cw__phone-number">+375291809516</span>
      </a>
    </section>
  </div>
</div>

<script src="/js/optimize.js" defer data-versioned></script>
<script src="/js/analytics-consent-loader.js" defer></script>
<script src="/js/cookie-consent.js" defer></script>
<script src="/js/footer-post.js" defer></script>
<script src="/js/sw-register.js" defer></script>
<script src="/js/contact-widget.js" defer></script>
<script>
window.addEventListener('unhandledrejection', function (event) {
  if (!event || !event.reason) return;
  if (event.reason.name !== 'AbortError') return;
  var message = String(event.reason.message || '');
  if (message.indexOf('Transition was skipped') !== -1) {
    event.preventDefault();
  }
});
</script>
</body>
</html>
