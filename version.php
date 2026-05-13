<?php
// version.php — единый номер версии сайта

$deployFile = __DIR__ . '/.deploy';

if (file_exists($deployFile)) {
    return (string) filemtime($deployFile);
}

// fallback, если файл случайно удалят
return (string) time();
