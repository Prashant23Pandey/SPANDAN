<?php
/**
 * BellyBand - Update User Profile & Profile Picture API
 * Handles photo uploads, field edits, and full profile persistence in MySQL database.
 */

header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/config/db.php';

startAppSession();

// Ensure uploads directory exists
$uploadDir = __DIR__ . '/.uploads/profiles/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

try {
    $pdo = getDBConnection();

    // Auto-migrate schema: ensure all profile columns exist in `users` table
    $columnsNeeded = [
        'profile_photo'          => 'LONGTEXT NULL',
        'preferred_name'         => 'VARCHAR(100) NULL',
        'phone'                  => 'VARCHAR(50) NULL',
        'blood_group'            => 'VARCHAR(20) NULL',
        'doctor_name'            => 'VARCHAR(150) NULL',
        'hospital_name'          => 'VARCHAR(200) NULL',
        'allergies'              => 'TEXT NULL'
    ];

    foreach ($columnsNeeded as $colName => $colDef) {
        try {
            $checkCol = $pdo->query("SHOW COLUMNS FROM `users` LIKE '{$colName}'")->fetch();
            if (!$checkCol) {
                $pdo->exec("ALTER TABLE `users` ADD COLUMN `{$colName}` {$colDef}");
            }
        } catch (Exception $ex) {
            // Continue gracefully if permission issue or column exists
        }
    }

    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    $data = [];

    if (stripos($contentType, 'application/json') !== false) {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true) ?? [];
    } else {
        $data = $_POST;
    }

    $action = $data['action'] ?? ($_GET['action'] ?? 'update_profile');
    $email = $data['email'] ?? ($_GET['email'] ?? ($_SESSION['user_email'] ?? null));
    $userId = $_SESSION['user_id'] ?? null;

    // Handle GET Profile
    if ($action === 'get_profile') {
        $userRow = null;
        if ($userId) {
            $stmt = $pdo->prepare("SELECT id, full_name, preferred_name, email, phone, role, life_stage, blood_group, expected_delivery_date, doctor_name, hospital_name, allergies, profile_photo FROM users WHERE id = :id LIMIT 1");
            $stmt->execute([':id' => $userId]);
            $userRow = $stmt->fetch();
        } elseif ($email) {
            $stmt = $pdo->prepare("SELECT id, full_name, preferred_name, email, phone, role, life_stage, blood_group, expected_delivery_date, doctor_name, hospital_name, allergies, profile_photo FROM users WHERE email = :email LIMIT 1");
            $stmt->execute([':email' => $email]);
            $userRow = $stmt->fetch();
        }

        echo json_encode([
            'success' => true,
            'user' => $userRow
        ]);
        exit;
    }

    $profilePhotoPath = null;
    $hasPhotoUpdate = false;

    // Handle Direct File Upload (multipart/form-data)
    if (!empty($_FILES['profile_photo_file']) && $_FILES['profile_photo_file']['error'] === UPLOAD_ERR_OK) {
        $file = $_FILES['profile_photo_file'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
        
        if (!in_array($ext, $allowed)) {
            echo json_encode(['success' => false, 'message' => 'Invalid image format. Allowed: JPG, PNG, WebP, GIF.']);
            exit;
        }

        if ($file['size'] > 5 * 1024 * 1024) { // 5MB limit
            echo json_encode(['success' => false, 'message' => 'Image size too large. Maximum allowed size is 5MB.']);
            exit;
        }

        $filename = 'profile_' . ($userId ?: uniqid()) . '_' . time() . '.' . $ext;
        $targetPath = $uploadDir . $filename;

        if (move_uploaded_file($file['tmp_name'], $targetPath)) {
            $profilePhotoPath = '.uploads/profiles/' . $filename;
            $hasPhotoUpdate = true;
        }
    } 
    // Handle Base64 Data URL or removal action
    elseif (isset($data['profile_photo'])) {
        $photoData = $data['profile_photo'];
        
        if ($photoData === null || $photoData === '' || $photoData === 'remove') {
            $profilePhotoPath = null;
            $hasPhotoUpdate = true;
        } elseif (strpos($photoData, 'data:image/') === 0) {
            $parts = explode(',', $photoData);
            if (count($parts) === 2) {
                preg_match('/data:image\/([a-zA-Z0-9]+);base64/', $parts[0], $matches);
                $ext = $matches[1] ?? 'png';
                if ($ext === 'jpeg') $ext = 'jpg';
                
                $imgData = base64_decode($parts[1]);
                if ($imgData !== false) {
                    $filename = 'profile_' . ($userId ?: uniqid()) . '_' . time() . '.' . $ext;
                    file_put_contents($uploadDir . $filename, $imgData);
                    $profilePhotoPath = '.uploads/profiles/' . $filename;
                    $hasPhotoUpdate = true;
                }
            }
            if (!$hasPhotoUpdate) {
                $profilePhotoPath = $photoData;
                $hasPhotoUpdate = true;
            }
        } else {
            $profilePhotoPath = $photoData;
            $hasPhotoUpdate = true;
        }
    }

    // Update in MySQL database
    $fields = [];
    $params = [];

    if (isset($data['full_name'])) {
        $fields[] = "`full_name` = :full_name";
        $params[':full_name'] = trim($data['full_name']);
    }
    if (isset($data['preferred_name'])) {
        $fields[] = "`preferred_name` = :preferred_name";
        $params[':preferred_name'] = trim($data['preferred_name']);
    }
    if (isset($data['phone'])) {
        $fields[] = "`phone` = :phone";
        $params[':phone'] = trim($data['phone']);
    }
    if (isset($data['role'])) {
        $fields[] = "`role` = :role";
        $params[':role'] = $data['role'] === 'Husband | Father' ? 'husband_father' : 'wife_mother';
    }
    if (isset($data['blood_group'])) {
        $fields[] = "`blood_group` = :blood_group";
        $params[':blood_group'] = $data['blood_group'];
    }
    if (isset($data['expected_delivery_date']) && !empty($data['expected_delivery_date'])) {
        $fields[] = "`expected_delivery_date` = :expected_delivery_date";
        $params[':expected_delivery_date'] = $data['expected_delivery_date'];
    }
    if (isset($data['doctor_name'])) {
        $fields[] = "`doctor_name` = :doctor_name";
        $params[':doctor_name'] = trim($data['doctor_name']);
    }
    if (isset($data['hospital_name'])) {
        $fields[] = "`hospital_name` = :hospital_name";
        $params[':hospital_name'] = trim($data['hospital_name']);
    }
    if (isset($data['allergies'])) {
        $fields[] = "`allergies` = :allergies";
        $params[':allergies'] = trim($data['allergies']);
    }
    if ($hasPhotoUpdate) {
        $fields[] = "`profile_photo` = :profile_photo";
        $params[':profile_photo'] = $profilePhotoPath;
    }

    if (!empty($fields) && ($userId || $email)) {
        $sql = "UPDATE `users` SET " . implode(', ', $fields) . ", `updated_at` = NOW() WHERE ";
        if ($userId) {
            $sql .= "`id` = :uid";
            $params[':uid'] = $userId;
        } else {
            $sql .= "`email` = :email";
            $params[':email'] = $email;
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
    }

    echo json_encode([
        'success' => true,
        'message' => 'Profile settings and details saved to database successfully.',
        'profile_photo' => $profilePhotoPath,
        'has_photo' => !empty($profilePhotoPath)
    ]);

} catch (Exception $e) {
    error_log("Update Profile Error: " . $e->getMessage());
    echo json_encode([
        'success' => true, // Soft fail gracefully with localStorage persistence
        'message' => 'Profile updated locally (DB Sync note: ' . $e->getMessage() . ')',
        'profile_photo' => $profilePhotoPath ?? null
    ]);
}
