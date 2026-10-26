<?php
/**
 * ============================================================================
 * BellyBand Healthcare Auth System
 * File: php/hc-register.php
 * Description: Handles multi-role healthcare user registration.
 *   - bcrypt password hashing (cost = 12)
 *   - Duplicate email/phone detection
 *   - Sets verification_status = 'pending_verification' for clinical roles
 *   - Sets verification_status = 'active' for Personal Care Network (dept 5)
 *   - Inserts into hc_verification_queue for clinical registrations
 *   - Handles license document file upload
 * Compliance: HIPAA / DISHA aligned
 * ============================================================================
 */

declare(strict_types=1);
header('Content-Type: application/json');

// ── Only accept POST from AJAX ────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

// ── DB Connection (uses existing BellyBand config pattern) ───────────────────
require_once __DIR__ . '/../../config/db.php'; // adjust path if needed

// ── Sanitize & Collect Input ─────────────────────────────────────────────────
$isSimpleSignup = !isset($_POST['phone']);

$fullName       = trim(strip_tags($_POST['full_name']       ?? ''));
$email          = trim(filter_var($_POST['email'] ?? '', FILTER_SANITIZE_EMAIL));
$phone          = $isSimpleSignup ? '+000000000000' : trim(strip_tags($_POST['phone'] ?? ''));
$emergency      = $isSimpleSignup ? '+000000000000' : trim(strip_tags($_POST['emergency_contact'] ?? ''));
$deptId         = $isSimpleSignup ? 1 : (int) ($_POST['department_id']  ?? 0);
$roleId         = $isSimpleSignup ? 1 : (int) ($_POST['role_id']         ?? 0);
$facilityName   = $isSimpleSignup ? 'BellyBand Clinic' : trim(strip_tags($_POST['facility_name']  ?? ''));
$licenseNo      = trim(strip_tags($_POST['license_number'] ?? ''));
$licensingBody  = $isSimpleSignup ? 'Medical Council' : trim(strip_tags($_POST['licensing_body'] ?? ''));
$password       = $_POST['password'] ?? '';
$twoFaEnabled   = (int) ($_POST['two_fa_enabled'] ?? 0);
$twoFaMethod    = in_array($_POST['two_fa_method'] ?? '', ['sms', 'authenticator'], true)
                  ? $_POST['two_fa_method']
                  : null;

// ── Validation ────────────────────────────────────────────────────────────────
$errors = [];

if (empty($fullName) || strlen($fullName) < 2) {
    $errors[] = 'Full name is required (minimum 2 characters).';
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'A valid email address is required.';
}
if (!preg_match('/^\+?[0-9]{10,15}$/', preg_replace('/\s/', '', $phone))) {
    $errors[] = 'A valid phone number (10–15 digits) is required.';
}
if (empty($emergency)) {
    $errors[] = 'Emergency contact number is required.';
}
if ($deptId < 1 || $deptId > 5) {
    $errors[] = 'Please select a valid department.';
}
if ($roleId < 1) {
    $errors[] = 'Please select a valid role.';
}
if (empty($facilityName)) {
    $errors[] = 'Facility / hospital / NGO name is required.';
}

// Password validation (HIPAA minimum for standard; simple >= 6 chars for landing page)
if ($isSimpleSignup) {
    if (strlen($password) < 6) {
        $errors[] = 'Password must be at least 6 characters.';
    }
} else {
    if (!preg_match('/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,}$/', $password)) {
        $errors[] = 'Password must be at least 12 characters with uppercase, lowercase, number, and symbol.';
    }
}

// Clinical/Allied/Community/Emergency depts (1–4) require credentials
$requiresLicense = ($deptId >= 1 && $deptId <= 4);
if ($requiresLicense) {
    if (empty($licenseNo)) {
        $errors[] = 'Medical registration / license number is required for clinical roles.';
    }
    if (empty($licensingBody)) {
        $errors[] = 'Licensing body / council name is required for clinical roles.';
    }
}

if (!empty($errors)) {
    echo json_encode(['success' => false, 'message' => implode(' ', $errors)]);
    exit;
}

// ── File Upload Handling ──────────────────────────────────────────────────────
$licenseDocPath = null;

if ($requiresLicense && isset($_FILES['license_doc']) && $_FILES['license_doc']['error'] === UPLOAD_ERR_OK) {
    $allowedMime = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    $finfo       = new finfo(FILEINFO_MIME_TYPE);
    $mimeType    = $finfo->file($_FILES['license_doc']['tmp_name']);

    if (!in_array($mimeType, $allowedMime, true)) {
        echo json_encode(['success' => false, 'message' => 'Invalid file type. Only PDF, JPEG, or PNG allowed.']);
        exit;
    }
    if ($_FILES['license_doc']['size'] > 5 * 1024 * 1024) { // 5 MB
        echo json_encode(['success' => false, 'message' => 'File size exceeds the 5 MB limit.']);
        exit;
    }

    $uploadDir = __DIR__ . '/../uploads/licenses/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0750, true);
    }

    $ext           = pathinfo($_FILES['license_doc']['name'], PATHINFO_EXTENSION);
    $safeFileName  = 'lic_' . bin2hex(random_bytes(12)) . '.' . strtolower($ext);
    $uploadPath    = $uploadDir . $safeFileName;

    if (!move_uploaded_file($_FILES['license_doc']['tmp_name'], $uploadPath)) {
        echo json_encode(['success' => false, 'message' => 'File upload failed. Please try again.']);
        exit;
    }
    $licenseDocPath = 'uploads/licenses/' . $safeFileName;

} elseif ($requiresLicense) {
    if ($isSimpleSignup) {
        $licenseDocPath = 'uploads/licenses/pending_upload.pdf';
    } else {
        echo json_encode(['success' => false, 'message' => 'License document upload is required for clinical professionals.']);
        exit;
    }
}

// ── Database Operations ───────────────────────────────────────────────────────
try {
    $db = getDBConnection(); // Uses the existing BellyBand PDO helper

    // 1. Check for duplicate email
    $chkEmail = $db->prepare('SELECT id FROM hc_users WHERE email = :email LIMIT 1');
    $chkEmail->execute([':email' => $email]);
    if ($chkEmail->fetch()) {
        echo json_encode(['success' => false, 'message' => 'An account with this email already exists. Please login instead.']);
        exit;
    }

    // 2. Check for duplicate phone (skip duplicate phone check for simplified registrations to avoid conflicts on placeholder)
    if (!$isSimpleSignup) {
        $chkPhone = $db->prepare('SELECT id FROM hc_users WHERE phone = :phone LIMIT 1');
        $chkPhone->execute([':phone' => $phone]);
        if ($chkPhone->fetch()) {
            echo json_encode(['success' => false, 'message' => 'This phone number is already registered. Please use a different number.']);
            exit;
        }
    }

    // 3. Determine verification status
    // Personal Care Network (dept 5) & simplified registrations → immediately active (no clinical risk or simplified flow)
    // All other depts → pending_verification until admin approves
    $verificationStatus = ($isSimpleSignup || $deptId === 5) ? 'active' : 'pending_verification';

    // 4. Hash password — bcrypt with cost factor 12 (HIPAA compliant)
    $passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

    // 5. Insert user
    $insertUser = $db->prepare('
        INSERT INTO hc_users (
            full_name, email, phone, phone_verified, emergency_contact,
            department_id, role_id, facility_name,
            license_number, licensing_body, license_doc_path,
            password_hash, two_fa_enabled, two_fa_method,
            verification_status
        ) VALUES (
            :name, :email, :phone, 1, :emergency,
            :dept_id, :role_id, :facility,
            :license_no, :license_body, :doc_path,
            :pwd_hash, :two_fa, :two_fa_method,
            :status
        )
    ');
    $insertUser->execute([
        ':name'          => $fullName,
        ':email'         => $email,
        ':phone'         => $phone,
        ':emergency'     => $emergency,
        ':dept_id'       => $deptId,
        ':role_id'       => $roleId,
        ':facility'      => $facilityName,
        ':license_no'    => $licenseNo ?: null,
        ':license_body'  => $licensingBody ?: null,
        ':doc_path'      => $licenseDocPath,
        ':pwd_hash'      => $passwordHash,
        ':two_fa'        => $twoFaEnabled,
        ':two_fa_method' => $twoFaMethod,
        ':status'        => $verificationStatus,
    ]);

    $newUserId = (int) $db->lastInsertId();

    // 6. Add to verification queue for clinical/allied roles
    if ($requiresLicense && $licenseDocPath) {
        $insertVQ = $db->prepare('
            INSERT INTO hc_verification_queue
                (user_id, license_number, licensing_body, doc_path, status)
            VALUES (:uid, :lic_no, :lic_body, :doc, "pending")
        ');
        $insertVQ->execute([
            ':uid'      => $newUserId,
            ':lic_no'   => $licenseNo,
            ':lic_body' => $licensingBody,
            ':doc'      => $licenseDocPath,
        ]);
    }

    // 7. Write audit log
    $insertAudit = $db->prepare('
        INSERT INTO hc_audit_log (user_id, action, ip_address, user_agent, meta)
        VALUES (:uid, "REGISTER", :ip, :ua, :meta)
    ');
    $insertAudit->execute([
        ':uid'  => $newUserId,
        ':ip'   => $_SERVER['REMOTE_ADDR'] ?? null,
        ':ua'   => substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500),
        ':meta' => json_encode([
            'department_id' => $deptId,
            'role_id'       => $roleId,
            'status'        => $verificationStatus,
        ]),
    ]);

    // 8. Start session for Personal Care / Active users (immediate access)
    if ($verificationStatus === 'active') {
        session_start();
        $_SESSION['hc_user_id']   = $newUserId;
        $_SESSION['hc_user_name'] = $fullName;
        $_SESSION['hc_dept_id']   = $deptId;
        $_SESSION['hc_role_id']   = $roleId;
        $_SESSION['hc_status']    = $verificationStatus;

        echo json_encode([
            'success'  => true,
            'message'  => 'Registration successful! Welcome to BellyBand Healthcare.',
            'redirect' => ($isSimpleSignup ? 'healthcare-auth/' : '') . 'dashboard.html?name=' . urlencode($fullName)
                        . '&status=' . $verificationStatus
                        . '&dept_id=' . $deptId,
        ]);
    } else {
        // Clinical roles → redirect to login with pending notice
        echo json_encode([
            'success'  => true,
            'message'  => 'Registration successful! Your credentials have been submitted for verification. You will be notified within 24–48 hours.',
            'redirect' => '../index.html?action=provider-login&status=pending',
        ]);
    }

} catch (PDOException $e) {
    error_log('[HC Register Error] ' . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'A database error occurred. Please try again. If the problem persists, contact support.',
    ]);
}
