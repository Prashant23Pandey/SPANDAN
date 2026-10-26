<?php
// ============================================================================
// File: healthcare-auth/php/api/jwt.php
// Purpose: Mint a short-lived JWT access token for Node.js APIs using the
//          current PHP session (bridges PHP-session mode to Node JWT mode).
// ============================================================================

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Access-Control-Allow-Origin: http://localhost');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

session_start();

if (empty($_SESSION['hc_user_id']) || empty($_SESSION['hc_email'])) {
  http_response_code(401);
  echo json_encode(['success' => false, 'message' => 'Not authenticated.']);
  exit;
}

// Keep this secret aligned with Node's JWT_SECRET (healthcare-auth/server/.env).
// In production, do NOT use the default.
$JWT_SECRET = getenv('JWT_SECRET') ?: 'CHANGE_ME_IN_PRODUCTION_MIN_64_CHARS';

$userId  = (int)($_SESSION['hc_user_id']);
$email   = (string)($_SESSION['hc_email']);
$deptId  = (int)($_SESSION['hc_dept_id'] ?? 0);
$roleId  = (int)($_SESSION['hc_role_id'] ?? 0);
$status  = (string)($_SESSION['hc_status'] ?? 'pending_verification');

// Map department_id → system role (same logic as me.php)
$deptRoleMap = [
  1 => 'ROLE_DOCTOR',
  2 => 'ROLE_ALLIED_HEALTH',
  3 => 'ROLE_ASHA_NGO',
  4 => 'ROLE_EMERGENCY',
  5 => 'ROLE_USER_PATIENT',
];

$systemRole = $_SESSION['hc_system_role'] ?? ($deptRoleMap[$deptId] ?? 'ROLE_USER_PATIENT');

// Personal care network: distinguish patient vs partner/caregiver by role_id
if ($deptId === 5 && in_array($roleId, [16, 17], true)) {
  $systemRole = 'ROLE_USER_PARTNER';
}

// JWT payload aligned with server/src/models/user.model.ts + userRole extra field
$now = time();
$payload = [
  'sub'      => $userId,
  'email'    => strtolower($email),
  'deptId'   => $deptId,
  'roleId'   => $roleId,
  'status'   => $status,
  'userRole' => $systemRole,
  'iat'      => $now,
  'exp'      => $now + (15 * 60), // 15 minutes
];

function base64url_encode(string $data): string {
  return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

$header = ['alg' => 'HS256', 'typ' => 'JWT'];
$segments = [];
$segments[] = base64url_encode(json_encode($header));
$segments[] = base64url_encode(json_encode($payload));
$signingInput = implode('.', $segments);
$signature = hash_hmac('sha256', $signingInput, $JWT_SECRET, true);
$segments[] = base64url_encode($signature);

$jwt = implode('.', $segments);

echo json_encode([
  'success' => true,
  'accessToken' => $jwt,
  'expiresInSeconds' => 15 * 60,
]);

