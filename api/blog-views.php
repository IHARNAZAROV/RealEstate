<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

$dataDir  = __DIR__ . '/../data';
$dataFile = $dataDir . '/blog-views.json';

if (!is_dir($dataDir)) {
    @mkdir($dataDir, 0775, true);
}

function read_views($file) {
    if (!file_exists($file)) return [];
    $raw = @file_get_contents($file);
    if ($raw === false || $raw === '') return [];
    $parsed = json_decode($raw, true);
    return (is_array($parsed)) ? $parsed : [];
}

function write_views_atomic($file, $data) {
    $tmp = $file . '.tmp';
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if ($json === false) return false;
    if (@file_put_contents($tmp, $json, LOCK_EX) === false) return false;
    return @rename($tmp, $file);
}

function sanitize_id($id) {
    $id = trim((string)$id);
    if ($id === '' || mb_strlen($id) > 200) return '';
    if (!preg_match('/^[A-Za-z0-9_\-\.\:]+$/', $id)) return '';
    return $id;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $views = read_views($dataFile);
    $idsParam = isset($_GET['ids']) ? trim($_GET['ids']) : '';
    if ($idsParam !== '') {
        $ids = array_filter(array_map('sanitize_id', explode(',', $idsParam)));
        $out = [];
        foreach ($ids as $id) {
            $out[$id] = isset($views[$id]) ? (int)$views[$id] : 0;
        }
        echo json_encode(['ok' => true, 'views' => $out], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $idParam = isset($_GET['id']) ? sanitize_id($_GET['id']) : '';
    if ($idParam !== '') {
        $count = isset($views[$idParam]) ? (int)$views[$idParam] : 0;
        echo json_encode(['ok' => true, 'id' => $idParam, 'count' => $count], JSON_UNESCAPED_UNICODE);
        exit;
    }
    echo json_encode(['ok' => true, 'views' => $views], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($method === 'POST') {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!is_array($data)) $data = [];
    $id = sanitize_id($data['id'] ?? '');
    if ($id === '') {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Invalid id'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $fp = @fopen($dataFile, 'c+');
    if (!$fp) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Storage unavailable'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if (!flock($fp, LOCK_EX)) {
        fclose($fp);
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Lock failed'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $contents = stream_get_contents($fp);
    $views = ($contents === '' || $contents === false) ? [] : (json_decode($contents, true) ?: []);
    $current = isset($views[$id]) ? (int)$views[$id] : 0;
    $next = $current + 1;
    $views[$id] = $next;

    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($views, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);

    echo json_encode(['ok' => true, 'id' => $id, 'count' => $next], JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
