<?php
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// /raion/{slug} → raion.php
if (preg_match('#^/raion/([a-zA-Z0-9_\-]+)/?$#', $uri, $m)) {
    $_GET['slug'] = $m[1];
    include __DIR__ . '/raion.php';
    return;
}

// /objects/{slug} → object-detail.php
if (preg_match('#^/objects?/([a-zA-Z0-9_\-]+)/?$#', $uri, $m)) {
    $_GET['slug'] = $m[1];
    include __DIR__ . '/object-detail.php';
    return;
}

// /blog/{slug} → blog-detail.php
if (preg_match('#^/blog/([a-zA-Z0-9_\-]+)/?$#', $uri, $m)) {
    $_GET['slug'] = $m[1];
    include __DIR__ . '/blog-detail.php';
    return;
}

// /team/{slug} → team-detail.html (served as static, slug passed via query)
if (preg_match('#^/team/([a-zA-Z0-9_\-]+)/?$#u', $uri, $m)) {
    $_GET['slug'] = $m[1];
    include __DIR__ . '/team-detail.html';
    return;
}

// Clean URL aliases for static HTML pages
$htmlMap = [
    '/team'              => 'team.html',
    '/nedvizhimost-lida' => 'nedvizhimost-lida.html',
    '/rieltor-lida'      => 'rieltor-lida.html',
    '/blog'              => 'blog.html',
    '/contact'           => 'contact.html',
    '/faq'               => 'faq.html',
    '/rynok-nedvizhimosti-lida' => 'real-estate.html',
    '/Privacy'           => 'Privacy.html',
    '/cookies-policy'    => 'cookies-policy.html',
];

$uriClean = rtrim($uri, '/');
if (isset($htmlMap[$uriClean])) {
    include __DIR__ . '/' . $htmlMap[$uriClean];
    return;
}

// Serve everything else normally (static files, index.html, PHP scripts)
return false;
