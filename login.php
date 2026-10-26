<?php
/**
 * BellyBand - User Login Handler (PHP + MySQL)
 */

require_once __DIR__ . '/config/db.php';
startAppSession();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email    = trim(filter_var($_POST['email'] ?? '', FILTER_SANITIZE_EMAIL));
    $password = $_POST['password'] ?? '';

    $errors = [];
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Please enter a valid email address.';
    }
    if (empty($password)) {
        $errors[] = 'Password cannot be empty.';
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
        $stmt = $db->prepare("SELECT id, full_name, email, password_hash, language, role, life_stage, avatar_emoji, status FROM users WHERE email = :email LIMIT 1");
        $stmt->execute([':email' => $email]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password_hash'])) {
            if ($user['status'] !== 'active') {
                $msg = 'Your account has been deactivated. Please contact support.';
                if (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest') {
                    header('Content-Type: application/json');
                    echo json_encode(['success' => false, 'message' => $msg]);
                    exit;
                }
                $_SESSION['auth_error'] = $msg;
                header('Location: index.html');
                exit;
            }

            // Update last login timestamp
            $updateLogin = $db->prepare("UPDATE users SET last_login_at = NOW() WHERE id = :id");
            $updateLogin->execute([':id' => $user['id']]);

            // Set session
            $_SESSION['user_id']   = $user['id'];
            $_SESSION['user_name'] = $user['full_name'];
            $_SESSION['user_email']= $user['email'];
            $_SESSION['role']      = $user['role'];
            $_SESSION['stage']     = $user['life_stage'];
            $_SESSION['language']  = $user['language'];
            $_SESSION['avatar']    = $user['avatar_emoji'];

            if (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest') {
                header('Content-Type: application/json');
                echo json_encode([
                    'success'  => true,
                    'message'  => 'Login successful!',
                    'redirect' => 'index.html?step=6',
                    'user'     => [
                        'name'     => $user['full_name'],
                        'email'    => $user['email'],
                        'role'     => $user['role'],
                        'stage'    => $user['life_stage'],
                        'language' => $user['language']
                    ]
                ]);
                exit;
            }

            header('Location: index.html?step=6');
            exit;

        } else {
            $msg = 'Invalid email or password. Please try again.';
            if (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest') {
                header('Content-Type: application/json');
                echo json_encode(['success' => false, 'message' => $msg]);
                exit;
            }
            $_SESSION['auth_error'] = $msg;
            header('Location: index.html');
            exit;
        }

    } catch (PDOException $e) {
        error_log("Login Error: " . $e->getMessage());
        $msg = 'A database error occurred during login. Please try again.';
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
