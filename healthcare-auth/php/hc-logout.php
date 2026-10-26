<?php
/**
 * BellyBand Healthcare — Session Logout
 * Destroys the HC session and redirects to login page.
 */

session_start();

// Clear all HC-specific session keys
$hcKeys = ['hc_user_id','hc_user_name','hc_name','hc_email','hc_dept_id','hc_role_id',
           'hc_dept_name','hc_role_name','hc_status','hc_2fa','hc_system_role'];
foreach ($hcKeys as $key) {
    unset($_SESSION[$key]);
}

// If no other session data remains, destroy the entire session
if (empty($_SESSION)) {
    session_destroy();
}

header('Location: ../../index.html?action=provider-login');
exit;
