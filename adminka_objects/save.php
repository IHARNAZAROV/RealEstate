<?php
header('Content-Type: application/json; charset=utf-8');

function respond(int $statusCode, array $payload): void {
  http_response_code($statusCode);
  echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function readBearerToken(): ?string {
  $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['Authorization'] ?? '';
  if (!$header) return null;

  if (preg_match('/^Bearer\s+(.+)$/i', trim($header), $m)) {
    return trim($m[1]);
  }

  return null;
}

function authorizeRequest(): void {
  $authFile = __DIR__ . '/auth.php';

  // 1) Project-specific auth hook (preferred on production)
  if (is_file($authFile)) {
    require_once $authFile;

    if (function_exists('realterAuthorizeSaveRequest')) {
      $ok = (bool) realterAuthorizeSaveRequest();
      if (!$ok) {
        respond(401, ['error' => 'Unauthorized']);
      }
      return;
    }

    // If file exists but no hook function — assume file performs access checks itself.
    return;
  }

  // 2) Token fallback auth if auth.php is absent.
  $expectedToken = getenv('REALTER_ADMIN_TOKEN') ?: '';
  if ($expectedToken === '') {
    respond(500, ['error' => 'Auth is not configured: add adminka_objects/auth.php or REALTER_ADMIN_TOKEN']);
  }

  $providedToken = $_SERVER['HTTP_X_ADMIN_TOKEN'] ?? readBearerToken() ?? '';
  if (!$providedToken || !hash_equals($expectedToken, $providedToken)) {
    respond(401, ['error' => 'Unauthorized']);
  }
}

function requireJsonPost(): void {
  if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    respond(405, ['error' => 'Method Not Allowed']);
  }

  $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
  if (stripos($contentType, 'application/json') !== 0) {
    respond(415, ['error' => 'Content-Type must be application/json']);
  }
}

function validateObjectItem(array $item, int $index): array {
  $errors = [];

  $requiredStringFields = ['id', 'slug', 'title', 'type', 'city', 'address'];
  foreach ($requiredStringFields as $field) {
    if (!array_key_exists($field, $item) || !is_string($item[$field]) || trim($item[$field]) === '') {
      $errors[] = "#$index: field '$field' is required";
    }
  }

  foreach (['priceBYN', 'priceUSD'] as $priceField) {
    if (!array_key_exists($priceField, $item) || !is_numeric($item[$priceField])) {
      $errors[] = "#$index: field '$priceField' must be numeric";
    }
  }

  if (isset($item['features']) && !is_array($item['features'])) {
    $errors[] = "#$index: field 'features' must be an array";
  }

  if (isset($item['status']) && !is_array($item['status'])) {
    $errors[] = "#$index: field 'status' must be an object";
  }

  return $errors;
}

function validatePayload($decoded): array {
  if (!is_array($decoded)) {
    return ['Payload must be an array of objects'];
  }

  $errors = [];
  foreach ($decoded as $i => $item) {
    if (!is_array($item)) {
      $errors[] = "#$i: object expected";
      continue;
    }
    $errors = array_merge($errors, validateObjectItem($item, $i));
  }

  return $errors;
}

function saveWithBackupAndLock(array $decoded): array {
  $dataDir = realpath(__DIR__ . '/../data') ?: (__DIR__ . '/../data');
  $file = $dataDir . '/objects.json';
  $backupDir = $dataDir . '/backups';
  $lockFile = $dataDir . '/objects.json.lock';

  if (!is_dir($backupDir) && !mkdir($backupDir, 0700, true) && !is_dir($backupDir)) {
    respond(500, ['error' => 'Cannot create backup directory']);
  }

  $lockHandle = fopen($lockFile, 'c');
  if (!$lockHandle) {
    respond(500, ['error' => 'Cannot open lock file']);
  }

  if (!flock($lockHandle, LOCK_EX)) {
    fclose($lockHandle);
    respond(500, ['error' => 'Cannot lock storage']);
  }

  $backupFile = null;
  if (is_file($file)) {
    $backupFile = $backupDir . '/objects-' . date('Ymd-His') . '.json';
    if (!copy($file, $backupFile)) {
      flock($lockHandle, LOCK_UN);
      fclose($lockHandle);
      respond(500, ['error' => 'Cannot create backup']);
    }
  }

  $prettyJson = json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  if ($prettyJson === false) {
    flock($lockHandle, LOCK_UN);
    fclose($lockHandle);
    respond(500, ['error' => 'Cannot encode JSON']);
  }

  $tmpFile = $file . '.tmp.' . getmypid();
  if (file_put_contents($tmpFile, $prettyJson . PHP_EOL, LOCK_EX) === false) {
    flock($lockHandle, LOCK_UN);
    fclose($lockHandle);
    @unlink($tmpFile);
    respond(500, ['error' => 'Cannot write temp file']);
  }

  if (!rename($tmpFile, $file)) {
    flock($lockHandle, LOCK_UN);
    fclose($lockHandle);
    @unlink($tmpFile);
    respond(500, ['error' => 'Cannot replace storage file']);
  }

  flock($lockHandle, LOCK_UN);
  fclose($lockHandle);

  return [
    'status' => 'ok',
    'savedAt' => date(DATE_ATOM),
    'count' => count($decoded),
    'backup' => $backupFile ? basename($backupFile) : null
  ];
}

requireJsonPost();
authorizeRequest();

$rawData = file_get_contents('php://input');
if ($rawData === false || trim($rawData) === '') {
  respond(400, ['error' => 'Empty payload']);
}

$decoded = json_decode($rawData, true);
if (json_last_error() !== JSON_ERROR_NONE) {
  respond(400, ['error' => 'Invalid JSON: ' . json_last_error_msg()]);
}

$errors = validatePayload($decoded);
if ($errors) {
  respond(422, ['error' => 'Validation failed', 'details' => $errors]);
}

$result = saveWithBackupAndLock($decoded);
respond(200, $result);
