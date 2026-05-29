<?php
// version.php — единый номер версии сайта
// Uses the latest modification time of key asset files for automatic cache busting.
// When style.css or other tracked files change, the version updates automatically.

$trackedFiles = [
    __DIR__ . '/css/style.css',
    __DIR__ . '/css/contact-widget.css',
    __DIR__ . '/.deploy',
];

$times = [];
foreach ($trackedFiles as $file) {
    if (file_exists($file)) {
        $times[] = filemtime($file);
    }
}

return $times ? (string) max($times) : (string) time();
