<?php
/**
 * BellyBand - User Logout Handler
 */

require_once __DIR__ . '/config/db.php';
startAppSession();

// Unset all session variables
$_SESSION = [];

// Destroy session cookie
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

// Destroy session
session_destroy();

// Redirect back to start
header("Location: index.html?step=1");
exit;
