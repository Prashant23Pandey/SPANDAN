<?php
// ============================================================================
// File: healthcare-auth/php/api/me.php
// MaaCare RBAC — PHP Session → Role Bridge Endpoint
// Returns current authenticated user's role, permissions, and dashboard path
// Used by the client-side RBAC router (Option A: PHP session mode)
// ============================================================================

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

// ── Role → Dashboard Path Map ────────────────────────────────────────────────
const ROLE_DASHBOARD_MAP = [
  'ROLE_SUPER_ADMIN'    => '/BELLYBAND/healthcare-auth/dashboards/index.html#super-admin',
  'ROLE_HOSPITAL_ADMIN' => '/BELLYBAND/healthcare-auth/dashboards/index.html#hospital-admin',
  'ROLE_DOCTOR'         => '/BELLYBAND/healthcare-auth/dashboards/index.html#clinical',
  'ROLE_ALLIED_HEALTH'  => '/BELLYBAND/healthcare-auth/dashboards/index.html#allied',
  'ROLE_ASHA_NGO'       => '/BELLYBAND/healthcare-auth/dashboards/index.html#field',
  'ROLE_EMERGENCY'      => '/BELLYBAND/healthcare-auth/dashboards/index.html#emergency',
  'ROLE_USER_PATIENT'   => '/BELLYBAND/healthcare-auth/dashboards/index.html#clinical',
  'ROLE_USER_PARTNER'   => '/BELLYBAND/healthcare-auth/dashboards/index.html#clinical',
];

// ── Role → Permissions Map ────────────────────────────────────────────────────
const ROLE_PERMISSIONS_MAP = [
  'ROLE_SUPER_ADMIN' => [
    'manage:system','view:audit_log','manage:users_global','verify:hospitals','view:system_metrics',
    'manage:staff','manage:assignments','view:bed_capacity','view:facility_analytics',
    'access:teleconsult','view:patient_queue','view:vitals_live','read:ehr','write:prescription',
    'write:diet_plan','write:mental_health','access:patient_chat','manage:webinars',
    'access:field_registry','log:home_visit','view:welfare_schemes','dispatch:referral',
    'view:sos_feed','dispatch:ambulance','read:rapid_card',
    'log:symptoms','view:partner_guide','view:appointments','access:care_chat',
  ],
  'ROLE_HOSPITAL_ADMIN' => [
    'manage:staff','manage:assignments','view:bed_capacity',
    'view:facility_analytics','view:audit_log','view:system_metrics',
  ],
  'ROLE_DOCTOR' => [
    'access:teleconsult','view:patient_queue','view:vitals_live',
    'read:ehr','write:prescription',
  ],
  'ROLE_ALLIED_HEALTH' => [
    'write:diet_plan','write:mental_health','access:patient_chat','manage:webinars',
  ],
  'ROLE_ASHA_NGO' => [
    'access:field_registry','log:home_visit','view:welfare_schemes','dispatch:referral',
  ],
  'ROLE_EMERGENCY' => [
    'view:sos_feed','dispatch:ambulance','read:rapid_card',
  ],
  'ROLE_USER_PATIENT' => [
    'log:symptoms','view:partner_guide','view:appointments','access:care_chat',
  ],
  'ROLE_USER_PARTNER' => [
    'view:partner_guide','view:appointments','access:care_chat',
  ],
];

// ── Role Meta (UI Display) ────────────────────────────────────────────────────
const ROLE_META_MAP = [
  'ROLE_SUPER_ADMIN'    => ['label' => 'Super Admin',            'color' => '#7C3AED', 'icon' => '🔐'],
  'ROLE_HOSPITAL_ADMIN' => ['label' => 'Hospital Admin',         'color' => '#1D4ED8', 'icon' => '🏥'],
  'ROLE_DOCTOR'         => ['label' => 'Clinical Practitioner',  'color' => '#0891B2', 'icon' => '🩺'],
  'ROLE_ALLIED_HEALTH'  => ['label' => 'Allied Health',          'color' => '#059669', 'icon' => '🧘'],
  'ROLE_ASHA_NGO'       => ['label' => 'Field Worker',           'color' => '#D97706', 'icon' => '🌾'],
  'ROLE_EMERGENCY'      => ['label' => 'Emergency Response',     'color' => '#DC2626', 'icon' => '🚨'],
  'ROLE_USER_PATIENT'   => ['label' => 'Patient',                'color' => '#E07A5F', 'icon' => '💖'],
  'ROLE_USER_PARTNER'   => ['label' => 'Partner / Family',       'color' => '#E07A5F', 'icon' => '👨‍👩‍👧'],
];

// ── Auth Check ────────────────────────────────────────────────────────────────
if (empty($_SESSION['hc_user_id'])) {
  http_response_code(401);
  echo json_encode(['success' => false, 'message' => 'Not authenticated.', 'redirect' => '/BELLYBAND/index.html?action=provider-login']);
  exit;
}

// ── Determine System Role from Department ID ──────────────────────────────────
$deptId   = (int)($_SESSION['hc_dept_id'] ?? 0);
$roleId   = (int)($_SESSION['hc_role_id'] ?? 0);
$status   = $_SESSION['hc_status'] ?? 'pending_verification';
$name     = $_SESSION['hc_user_name'] ?? ($_SESSION['hc_name'] ?? '');

// Map department_id → system role (matches our hc_departments seeded data)
$deptRoleMap = [
  1 => 'ROLE_DOCTOR',          // Primary Clinical Team
  2 => 'ROLE_ALLIED_HEALTH',   // Allied Health & Wellness Specialists
  3 => 'ROLE_ASHA_NGO',        // Community & Field Healthcare Workers
  4 => 'ROLE_EMERGENCY',       // Emergency & Logistics Services
  5 => 'ROLE_USER_PATIENT',    // Personal Care Network (patient/partner decided by role_id)
];

// Check if user is stored with explicit system_role in session
$systemRole = $_SESSION['hc_system_role'] ?? ($deptRoleMap[$deptId] ?? 'ROLE_USER_PATIENT');

// Personal care network: distinguish patient vs partner/caregiver by role_id
if ($deptId === 5 && in_array($roleId, [16, 17], true)) {
  $systemRole = 'ROLE_USER_PARTNER';
}

// ── Verification Gate for Doctors ─────────────────────────────────────────────
if ($systemRole === 'ROLE_DOCTOR' && in_array($status, ['pending_verification', 'rejected', 'suspended'])) {
  echo json_encode([
    'success'        => true,
    'authenticated'  => true,
    'verificationRequired' => true,
    'userRole'       => $systemRole,
    'status'         => $status,
    'dashboardPath'  => '/BELLYBAND/healthcare-auth/rbac/rbac-dashboard.html#pending-verification',
    'roleMeta'       => ROLE_META_MAP[$systemRole] ?? null,
    'permissions'    => [],
    'name'           => $name ?: 'Doctor',
    'facilityId'     => $_SESSION['hc_facility'] ?? null,
  ]);
  exit;
}

// ── Build Response ────────────────────────────────────────────────────────────
$permissions  = ROLE_PERMISSIONS_MAP[$systemRole] ?? [];
$dashPath     = ROLE_DASHBOARD_MAP[$systemRole] ?? '/BELLYBAND/healthcare-auth/rbac/rbac-dashboard.html#patient';
$meta         = ROLE_META_MAP[$systemRole] ?? ['label' => 'User', 'color' => '#6B7280', 'icon' => '👤'];

echo json_encode([
  'success'       => true,
  'authenticated' => true,
  'userId'        => (int)$_SESSION['hc_user_id'],
  'name'          => $name,
  'email'         => $_SESSION['hc_email'] ?? '',
  'userRole'      => $systemRole,
  'status'        => $status,
  'dashboardPath' => $dashPath,
  'facilityId'    => $_SESSION['hc_facility'] ?? null,
  'permissions'   => $permissions,
  'roleMeta'      => $meta,
]);
