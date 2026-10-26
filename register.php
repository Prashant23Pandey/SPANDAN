<?php
/**
 * BellyBand - User Registration Handler (PHP + MySQL)
 */

require_once __DIR__ . '/config/db.php';
startAppSession();

// Check if POST request
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $fullName     = trim($_POST['full_name'] ?? '');
    $email        = trim(filter_var($_POST['email'] ?? '', FILTER_SANITIZE_EMAIL));
    $password     = $_POST['password'] ?? '';
    $passConfirm  = $_POST['password_confirm'] ?? '';
    
    // Onboarding choices passed from Step 1-4
    $language     = trim($_POST['language'] ?? 'en');
    $role         = trim($_POST['role'] ?? 'wife_mother');
    $stage        = trim($_POST['stage'] ?? 'pregnant');
    $expectedDate = !empty($_POST['expected_date']) ? trim($_POST['expected_date']) : null;
    $expectedWeek = !empty($_POST['expected_week']) ? (int)$_POST['expected_week'] : null;

    $errors = [];

    // Validation
    if (empty($fullName)) {
        $errors[] = 'Full name is required.';
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Please enter a valid email address.';
    }
    if (strlen($password) < 8) {
        $errors[] = 'Password must be at least 8 characters long.';
    }
    if ($password !== $passConfirm) {
        $errors[] = 'Passwords do not match.';
    }

    if (!empty($errors)) {
        if (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest') {
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => implode(' ', $errors)]);
            exit;
        } else {
            $_SESSION['auth_error'] = implode(' ', $errors);
            header('Location: index.html');
            exit;
        }
    }

    $db = getDBConnection();

    try {
        // Check if email already exists
        $checkStmt = $db->prepare("SELECT id FROM users WHERE email = :email LIMIT 1");
        $checkStmt->execute([':email' => $email]);
        if ($checkStmt->fetch()) {
            $msg = 'An account with this email address already exists. Please log in.';
            if (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest') {
                header('Content-Type: application/json');
                echo json_encode(['success' => false, 'message' => $msg]);
                exit;
            }
            $_SESSION['auth_error'] = $msg;
            header('Location: index.html');
            exit;
        }

        // Hash password securely with Bcrypt
        $passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        $avatarEmoji  = ($role === 'husband_father') ? '👨‍🍼' : '🌸';

        // Insert new user
        $insertSql = "INSERT INTO users (
            full_name, email, password_hash, language, role, life_stage,
            expected_delivery_date, pregnancy_week, avatar_emoji, status
        ) VALUES (
            :name, :email, :hash, :lang, :role, :stage,
            :delivery_date, :week, :avatar, 'active'
        )";

        $insertStmt = $db->prepare($insertSql);
        $insertStmt->execute([
            ':name'          => $fullName,
            ':email'         => $email,
            ':hash'          => $passwordHash,
            ':lang'          => $language,
            ':role'          => $role,
            ':stage'         => $stage,
            ':delivery_date' => $expectedDate,
            ':week'          => $expectedWeek,
            ':avatar'        => $avatarEmoji
        ]);

        $newUserId = $db->lastInsertId();

        // Seed initial default logs for the user
        $seedKick = $db->prepare("INSERT INTO kick_logs (user_id, log_date, kick_count, notes) VALUES (:uid, CURDATE(), 0, 'Welcome to BellyBand')");
        $seedKick->execute([':uid' => $newUserId]);

        $seedWater = $db->prepare("INSERT INTO water_logs (user_id, log_date, glasses_logged, target_glasses) VALUES (:uid, CURDATE(), 0, 8)");
        $seedWater->execute([':uid' => $newUserId]);

        // Establish session
        $_SESSION['user_id']   = $newUserId;
        $_SESSION['user_name'] = $fullName;
        $_SESSION['user_email']= $email;
        $_SESSION['role']      = $role;
        $_SESSION['stage']     = $stage;
        $_SESSION['language']  = $language;

        if (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest') {
            header('Content-Type: application/json');
            echo json_encode([
                'success'  => true,
                'message'  => 'Registration successful!',
                'redirect' => 'index.html?step=6'
            ]);
            exit;
        }

        header('Location: index.html?step=6');
        exit;

    } catch (PDOException $e) {
        error_log("Registration Error: " . $e->getMessage());
        $msg = 'A database error occurred during registration. Please try again.';
        if (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest') {
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => $msg]);
            exit;
        }
        $_SESSION['auth_error'] = $msg;
        header('Location: index.html');
        exit;
    }
}
