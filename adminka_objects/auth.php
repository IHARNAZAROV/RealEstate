<?php
/**
 * Local auth hook for adminka_objects/save.php
 *
 * Variant B: keep auth logic in this file.
 * save.php will call realterAuthorizeSaveRequest() if it exists.
 *
 * Configure ONE of the options below:
 * 1) Static token in this file (REALTER_ADMIN_SAVE_TOKEN)
 * 2) Environment token (REALTER_ADMIN_TOKEN)
 * 3) Existing PHP session flag ($_SESSION['is_admin'] === true)
 */

// 1) File-based token (change this value on production).
const REALTER_ADMIN_SAVE_TOKEN = 'aygUcRRst1iJcXr1zHBQ4F5orgVZMgiR5XUJ1Ua0B46p9ctvyeu6BjkaAYFR26jk';

function realterReadBearerToken(): ?string {
  $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['Authorization'] ?? '';
  if (!$header) {
    return null;
  }

  if (preg_match('/^Bearer\s+(.+)$/i', trim($header), $m)) {
    return trim($m[1]);
  }

  return null;
}

function realterAuthorizeSaveRequest(): bool {
  // 3) Optional session-based allow.
  if (session_status() !== PHP_SESSION_ACTIVE) {
    @session_start();
  }
  if (!empty($_SESSION['is_admin']) && $_SESSION['is_admin'] === true) {
    return true;
  }

  // 1/2) Token-based allow.
  $expected = trim((string) (getenv('REALTER_ADMIN_TOKEN') ?: REALTER_ADMIN_SAVE_TOKEN));
  if ($expected === '') {
    return false;
  }

  $provided = trim((string) ($_SERVER['HTTP_X_ADMIN_TOKEN'] ?? realterReadBearerToken() ?? ''));
  if (!$provided) {
    return false;
  }

  return hash_equals($expected, $provided);
}
