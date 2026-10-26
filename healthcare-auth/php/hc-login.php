<?php
/**
 * ============================================================================
 * BellyBand Healthcare Auth System — Single Unified Gateway
 * File: php/hc-login.php
 * Description: Unified authentication controller for ALL roles:
 *   - Super Admin Hardcoded Override:
 *       Email:    23prashantpandey@bellyband.co.in
 *       Password: ANURAGp23@
 *       -> user_role: "ROLE_SUPER_ADMIN"
 *   - Standard Roles (Hospital Admin, Doctor, Allied, Field, Emergency)
 *   - Issues signed JWT token with user_role payload claim
 *   - Returns dynamic role-based redirect URL
 * ============================================================================
 */

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed. Use POST.']);
    exit;
}

// Support both form-urlencoded and JSON body payloads
$rawInput = file_get_contents('php://input');
$jsonData = json_decode($rawInput, true);

$email = trim(filter_var($jsonData['email'] ?? ($_POST['email'] ?? ''), FILTER_SANITIZE_EMAIL));
$password = (string)($jsonData['password'] ?? ($_POST['password'] ?? ''));

// ── Basic Input Validation ────────────────────────────────────────────────────
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Please enter a valid email address.']);
    exit;
}
if (empty($password)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Password is required.']);
    exit;
}

// ── JWT Helper ────────────────────────────────────────────────────────────────
$JWT_SECRET = getenv('JWT_SECRET') ?: 'BELLYBAND_HEALTHCARE_SUPER_ADMIN_JWT_SECRET_2026_DISHA';

function createJwtToken(array $payload, string $secret): string {
    $header = ['alg' => 'HS256', 'typ' => 'JWT'];
    $b64Header = rtrim(strtr(base64_encode(json_encode($header)), '+/', '-_'), '=');
    $b64Payload = rtrim(strtr(base64_encode(json_encode($payload)), '+/', '-_'), '=');
    $signature = hash_hmac('sha256', "$b64Header.$b64Payload", $secret, true);
    $b64Sig = rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');
    return "$b64Header.$b64Payload.$b64Sig";
}

// ── Role Redirect Map ─────────────────────────────────────────────────────────
$roleDashboardMap = [
    'ROLE_SUPER_ADMIN'    => 'healthcare-auth/dashboards/index.html#super-admin',
    'ROLE_HOSPITAL_ADMIN' => 'healthcare-auth/dashboards/index.html#hospital-admin',
    'ROLE_DOCTOR'         => 'healthcare-auth/dashboards/index.html#clinical',
    'ROLE_ALLIED_HEALTH'  => 'healthcare-auth/dashboards/index.html#allied',
    'ROLE_ASHA_NGO'       => 'healthcare-auth/dashboards/index.html#field',
    'ROLE_EMERGENCY'      => 'healthcare-auth/dashboards/index.html#emergency',
];

// ── 1. SUPER ADMIN HARDCODED OVERRIDE ─────────────────────────────────────────
if (strtolower($email) === '23prashantpandey@bellyband.co.in' && $password === 'ANURAGp23@') {
    session_start();
    session_regenerate_id(true);
    $_SESSION['hc_user_id']     = 1;
    $_SESSION['hc_user_name']   = 'Prashant Pandey';
    $_SESSION['hc_name']        = 'Prashant Pandey';
    $_SESSION['hc_email']       = '23prashantpandey@bellyband.co.in';
    $_SESSION['hc_dept_id']     = 1;
    $_SESSION['hc_role_id']     = 1;
    $_SESSION['hc_dept_name']   = 'Platform Engineering & Governance';
    $_SESSION['hc_role_name']   = 'Platform Owner & Super Admin';
    $_SESSION['hc_status']      = 'verified';
    $_SESSION['hc_system_role'] = 'ROLE_SUPER_ADMIN';

    $now = time();
    $jwtPayload = [
        'sub'       => 1,
        'name'      => 'Prashant Pandey',
        'email'     => '23prashantpandey@bellyband.co.in',
        'user_role' => 'ROLE_SUPER_ADMIN',
        'userRole'  => 'ROLE_SUPER_ADMIN',
        'status'    => 'verified',
        'iat'       => $now,
        'exp'       => $now + (24 * 60 * 60) // 24 hours
    ];

    $accessToken = createJwtToken($jwtPayload, $JWT_SECRET);
    $redirectUrl = $roleDashboardMap['ROLE_SUPER_ADMIN'];

    echo json_encode([
        'success'     => true,
        'message'     => 'Super Admin login authorized. Bypassing hospital queue...',
        'user_role'   => 'ROLE_SUPER_ADMIN',
        'accessToken' => $accessToken,
        'redirect'    => $redirectUrl,
        'user' => [
            'id'          => 1,
            'name'        => 'Prashant Pandey',
            'email'       => '23prashantpandey@bellyband.co.in',
            'dept'        => 'Platform Engineering & Governance',
            'role'        => 'Platform Owner & Super Admin',
            'system_role' => 'ROLE_SUPER_ADMIN',
            'status'      => 'verified',
            'avatar'      => '👑'
        ]
    ]);
    exit;
}

// ── 2. DATABASE AUTHENTICATION ────────────────────────────────────────────────
require_once __DIR__ . '/../../config/db.php';

function writeAuditLog(PDO $db, ?int $userId, string $action, array $meta = []): void {
    try {
        $stmt = $db->prepare('
            INSERT INTO hc_audit_log (user_id, action, ip_address, user_agent, meta)
            VALUES (:uid, :action, :ip, :ua, :meta)
        ');
        $stmt->execute([
            ':uid'    => $userId,
            ':action' => $action,
            ':ip'     => $_SERVER['REMOTE_ADDR'] ?? null,
            ':ua'     => substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500),
            ':meta'   => json_encode($meta),
        ]);
    } catch (Throwable $e) {}
}

try {
    $db = getDBConnection();

    // Check optional system_role column
    $hasSystemRole = false;
    try {
        $col = $db->query("SHOW COLUMNS FROM hc_users LIKE 'system_role'")->fetch(PDO::FETCH_ASSOC);
        $hasSystemRole = !empty($col);
    } catch (Throwable $e) {
        $hasSystemRole = false;
    }

    $sql = '
        SELECT
            u.id, u.full_name, u.password_hash, u.verification_status,
            u.login_attempt_count, u.locked_until,
            u.department_id, u.role_id, u.two_fa_enabled, u.two_fa_method, ' .
            ($hasSystemRole ? 'u.system_role, ' : '') . '
            d.dept_name, r.role_name
        FROM hc_users u
        JOIN hc_departments d ON d.id = u.department_id
        JOIN hc_roles r       ON r.id = u.role_id
        WHERE u.email = :email
        LIMIT 1
    ';

    $stmt = $db->prepare($sql);
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // User not found
    if (!$user) {
        writeAuditLog($db, null, 'LOGIN_FAIL', ['reason' => 'user_not_found', 'email' => $email]);
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Invalid email or password. Please try again.']);
        exit;
    }

    $userId = (int) $user['id'];

    // Lockout check
    if ($user['locked_until'] && new DateTime() < new DateTime($user['locked_until'])) {
        $until = (new DateTime($user['locked_until']))->format('H:i');
        writeAuditLog($db, $userId, 'LOGIN_BLOCKED', ['reason' => 'account_locked', 'locked_until' => $user['locked_until']]);
        http_response_code(429);
        echo json_encode([
            'success' => false,
            'message' => "Account temporarily locked due to failed attempts. Try again after {$until}.",
        ]);
        exit;
    }

    // Password verification
    if (!password_verify($password, $user['password_hash'])) {
        $newAttempts = (int) $user['login_attempt_count'] + 1;
        $lockUntil = null;
        if ($newAttempts >= 5) {
            $lockUntil = (new DateTime())->modify('+15 minutes')->format('Y-m-d H:i:s');
            $newAttempts = 0;
        }

        $db->prepare('UPDATE hc_users SET login_attempt_count = :attempts, locked_until = :locked WHERE id = :id')
           ->execute([':attempts' => $newAttempts, ':locked' => $lockUntil, ':id' => $userId]);

        writeAuditLog($db, $userId, 'LOGIN_FAIL', ['reason' => 'wrong_password', 'attempts' => $newAttempts]);

        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Invalid email or password.']);
        exit;
    }

    // Determine system role
    $deptId = (int)$user['department_id'];
    $roleId = (int)$user['role_id'];
    $deptRoleMap = [
        1 => 'ROLE_DOCTOR',
        2 => 'ROLE_ALLIED_HEALTH',
        3 => 'ROLE_ASHA_NGO',
        4 => 'ROLE_EMERGENCY',
        5 => 'ROLE_USER_PATIENT',
    ];
    $systemRole = $hasSystemRole ? ($user['system_role'] ?? null) : null;
    if (empty($systemRole)) {
        $systemRole = $deptRoleMap[$deptId] ?? 'ROLE_DOCTOR';
    }

    // Reset attempts
    $db->prepare('UPDATE hc_users SET login_attempt_count = 0, locked_until = NULL, last_login_at = NOW() WHERE id = :id')
       ->execute([':id' => $userId]);

    session_start();
    session_regenerate_id(true);
    $_SESSION['hc_user_id']     = $userId;
    $_SESSION['hc_user_name']   = $user['full_name'];
    $_SESSION['hc_email']       = $email;
    $_SESSION['hc_dept_id']     = $deptId;
    $_SESSION['hc_role_id']     = $roleId;
    $_SESSION['hc_dept_name']   = $user['dept_name'];
    $_SESSION['hc_role_name']   = $user['role_name'];
    $_SESSION['hc_status']      = $user['verification_status'];
    $_SESSION['hc_system_role'] = $systemRole;

    $now = time();
    $jwtPayload = [
        'sub'       => $userId,
        'name'      => $user['full_name'],
        'email'     => $email,
        'user_role' => $systemRole,
        'userRole'  => $systemRole,
        'deptId'    => $deptId,
        'roleId'    => $roleId,
        'status'    => $user['verification_status'],
        'iat'       => $now,
        'exp'       => $now + (24 * 60 * 60)
    ];

    $accessToken = createJwtToken($jwtPayload, $JWT_SECRET);
    $redirectUrl = $roleDashboardMap[$systemRole] ?? 'healthcare-auth/dashboards/index.html#clinical';

    writeAuditLog($db, $userId, 'LOGIN_SUCCESS', ['role' => $systemRole]);

    echo json_encode([
        'success'     => true,
        'message'     => 'Login successful! Welcome back, ' . $user['full_name'] . '.',
        'user_role'   => $systemRole,
        'accessToken' => $accessToken,
        'redirect'    => $redirectUrl,
        'user' => [
            'id'          => $userId,
            'name'        => $user['full_name'],
            'email'       => $email,
            'dept'        => $user['dept_name'],
            'role'        => $user['role_name'],
            'system_role' => $systemRole,
            'status'      => $user['verification_status']
        ]
    ]);

} catch (PDOException $e) {
    error_log('[HC Login DB Error] ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error occurred during login.']);
}
