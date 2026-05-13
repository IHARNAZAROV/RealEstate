<?php
header('Content-Type: application/javascript; charset=UTF-8');
$versionFile = __DIR__ . '/version.php';
$version = file_exists($versionFile) ? trim((string) include $versionFile) : '1';
echo 'window.SITE_VERSION = "' . addslashes($version) . '";';
