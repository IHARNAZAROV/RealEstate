<?php
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed'], JSON_UNESCAPED_UNICODE);
    exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

$contact = trim($data['contact'] ?? '');
$filters = trim($data['filters'] ?? '');

if (mb_strlen($contact) < 5) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => 'Validation failed'], JSON_UNESCAPED_UNICODE);
    exit;
}

$botToken = getenv('TELEGRAM_BOT_TOKEN') ?: '8603985787:AAFvGsv7-wlUQBQVXBc3deckmUK1RcT1_UM';
$chatIdsEnv = getenv('TELEGRAM_CHAT_IDS') ?: '281486249,920099484';
$usernamesEnv = getenv('TELEGRAM_USERNAMES') ?: '@y_tery,@TurkoOlga';

if ($botToken === '') {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Telegram token is not configured'], JSON_UNESCAPED_UNICODE);
    exit;
}

$recipients = [];
if ($chatIdsEnv !== '') {
    $recipients = array_map('trim', explode(',', $chatIdsEnv));
} else {
    $recipients = array_map('trim', explode(',', $usernamesEnv));
}

$recipients = array_values(array_filter($recipients, static fn($value) => $value !== ''));

if (empty($recipients)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Telegram recipients are not configured'], JSON_UNESCAPED_UNICODE);
    exit;
}

$filtersLine = $filters !== '' ? $filters : 'не указаны';
$text = "🔔 Новый лид — не нашли подходящий вариант\n"
    . "Контакт: {$contact}\n"
    . "Параметры поиска: {$filtersLine}";

$errors = [];

foreach ($recipients as $chatId) {
    $endpoint = "https://api.telegram.org/bot{$botToken}/sendMessage";
    $payload = http_build_query([
        'chat_id' => $chatId,
        'text'    => $text,
    ]);

    $context = stream_context_create([
        'http' => [
            'method'        => 'POST',
            'header'        => "Content-Type: application/x-www-form-urlencoded\r\n",
            'content'       => $payload,
            'timeout'       => 15,
            'ignore_errors' => true,
        ],
    ]);

    $result = @file_get_contents($endpoint, false, $context);

    if ($result === false) {
        $errors[] = ['recipient' => $chatId, 'reason' => 'network_error'];
        continue;
    }

    $decoded = json_decode($result, true);
    if (!is_array($decoded) || !($decoded['ok'] ?? false)) {
        $errors[] = [
            'recipient' => $chatId,
            'reason'    => $decoded['description'] ?? 'telegram_error',
        ];
    }
}

if (!empty($errors)) {
    http_response_code(502);
    echo json_encode([
        'ok'      => false,
        'error'   => 'Failed to deliver to Telegram recipients',
        'details' => $errors,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
