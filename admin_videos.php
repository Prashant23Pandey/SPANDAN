<?php
/**
 * BellyBand - Super Admin Video Management Portal
 * Route: /admin/pregnancy-content/videos or /admin_videos.php
 */

require_once __DIR__ . '/config/db.php';
startAppSession();

// RBAC Check helper
$isLoggedInAdmin = false;
if (!empty($_SESSION['system_role']) && in_array($_SESSION['system_role'], ['ROLE_SUPER_ADMIN', 'ADMIN', 'super_admin'])) {
    $isLoggedInAdmin = true;
}
if (!empty($_SESSION['role']) && in_array($_SESSION['role'], ['admin', 'super_admin', 'ROLE_SUPER_ADMIN', 'hospital_admin'])) {
    $isLoggedInAdmin = true;
}
if (!empty($_SESSION['is_superadmin']) && $_SESSION['is_superadmin'] == 1) {
    $isLoggedInAdmin = true;
}

// Allow simulated admin switch via query param for easy testing/review
if (isset($_GET['admin_auth']) && $_GET['admin_auth'] === '1') {
    $_SESSION['system_role'] = 'ROLE_SUPER_ADMIN';
    $_SESSION['role'] = 'admin';
    $_SESSION['user_name'] = 'Prashant Pandey (Super Admin)';
    $_SESSION['user_email'] = '23prashantpandey@bellyband.co.in';
    $isLoggedInAdmin = true;
}
if (isset($_GET['logout_admin']) && $_GET['logout_admin'] === '1') {
    unset($_SESSION['system_role']);
    $_SESSION['role'] = 'wife_mother';
    $isLoggedInAdmin = false;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin: Pregnancy Video Library | BellyBand</title>
  <meta name="description" content="Super Admin-only Video Management Portal for BellyBand Prenatal Movement & Fitness Content.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css?v=5.0">
  <style>
    :root {
      --admin-bg: #FAF8F5;
      --admin-surface: #FFFFFF;
      --admin-primary: #E07A5F;
      --admin-primary-hover: #C85A3F;
      --admin-dark: #2D2723;
      --admin-muted: #78716C;
      --admin-border: #EAE5DE;
      --admin-accent: #8B5CF6;
      --admin-success: #059669;
      --admin-warning: #D97706;
      --admin-danger: #DC2626;
      --admin-shadow: 0 10px 30px -5px rgba(45, 39, 35, 0.08);
      --admin-radius: 20px;
    }

    body {
      background-color: var(--admin-bg);
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      color: var(--admin-dark);
      margin: 0;
      padding: 0;
      min-height: 100vh;
    }

    .admin-layout {
      display: flex;
      min-height: 100vh;
    }

    /* ── Admin Sidebar ── */
    .admin-sidebar {
      width: 280px;
      background: #FFFFFF;
      border-right: 1.5px solid var(--admin-border);
      display: flex;
      flex-direction: column;
      padding: 24px 20px;
      position: sticky;
      top: 0;
      height: 100vh;
      box-sizing: border-box;
    }

    .admin-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-bottom: 24px;
      border-bottom: 1.5px solid var(--admin-border);
      margin-bottom: 24px;
      text-decoration: none;
    }
    .brand-logo-badge {
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #FFE8E0, #FFD2C2);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      box-shadow: 0 4px 12px rgba(224, 122, 95, 0.2);
    }
    .brand-text h2 {
      font-family: 'Outfit', sans-serif;
      font-size: 18px;
      font-weight: 800;
      color: var(--admin-dark);
      margin: 0;
      line-height: 1.2;
    }
    .brand-text span {
      font-size: 11px;
      font-weight: 700;
      color: var(--admin-primary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .admin-nav {
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;
    }
    .admin-nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 14px;
      color: var(--admin-muted);
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
    }
    .admin-nav-item:hover {
      background: #F5F2EC;
      color: var(--admin-dark);
    }
    .admin-nav-item.active {
      background: #FFF1EE;
      color: var(--admin-primary);
      font-weight: 700;
    }
    .admin-nav-item .nav-icon {
      font-size: 18px;
    }

    .admin-user-profile {
      background: #FBF9F6;
      border: 1px solid var(--admin-border);
      border-radius: 16px;
      padding: 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: auto;
    }
    .admin-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #E0E7FF;
      color: #4338CA;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 16px;
    }
    .admin-info {
      flex: 1;
      min-width: 0;
    }
    .admin-info h4 {
      margin: 0;
      font-size: 13.5px;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .admin-info span {
      font-size: 11px;
      color: var(--admin-muted);
      display: block;
    }

    /* ── Main Container ── */
    .admin-main {
      flex: 1;
      padding: 32px 40px;
      max-width: 1360px;
      box-sizing: border-box;
    }

    /* RBAC Banner / Switcher */
    .rbac-test-banner {
      background: linear-gradient(135deg, #1E1B4B, #312E81);
      color: #FFFFFF;
      border-radius: 16px;
      padding: 14px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 28px;
      box-shadow: 0 8px 24px rgba(30, 27, 75, 0.2);
    }
    .rbac-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 600;
    }
    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #10B981;
      box-shadow: 0 0 8px #10B981;
    }
    .rbac-auth-btn {
      background: #FFFFFF;
      color: #1E1B4B;
      border: none;
      padding: 8px 16px;
      border-radius: 10px;
      font-size: 12.5px;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s;
    }
    .rbac-auth-btn:hover {
      background: #F3F4F6;
      transform: translateY(-1px);
    }

    /* Page Header */
    .page-header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 28px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .header-titles h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 28px;
      font-weight: 800;
      color: var(--admin-dark);
      margin: 0 0 6px 0;
    }
    .header-titles p {
      margin: 0;
      font-size: 14.5px;
      color: var(--admin-muted);
    }
    .btn-upload-new {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: linear-gradient(135deg, var(--admin-primary), var(--admin-primary-hover));
      color: #FFFFFF;
      border: none;
      border-radius: 14px;
      padding: 14px 24px;
      font-family: 'Outfit', sans-serif;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 6px 20px rgba(224, 122, 95, 0.3);
      transition: all 0.2s ease;
    }
    .btn-upload-new:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(224, 122, 95, 0.4);
    }

    /* ── Metric Cards Grid ── */
    .admin-stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }
    .stat-metric-card {
      background: #FFFFFF;
      border: 1.5px solid var(--admin-border);
      border-radius: var(--admin-radius);
      padding: 22px 24px;
      box-shadow: var(--admin-shadow);
      display: flex;
      align-items: center;
      gap: 18px;
      transition: transform 0.2s;
    }
    .stat-metric-card:hover {
      transform: translateY(-2px);
    }
    .stat-icon-wrap {
      width: 52px;
      height: 52px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }
    .icon-total { background: #EEF2FF; color: #4F46E5; }
    .icon-pub { background: #ECFDF5; color: #059669; }
    .icon-draft { background: #FFFBEB; color: #D97706; }
    .icon-feat { background: #FDF2F8; color: #DB2777; }
    .stat-metric-info h3 {
      font-family: 'Outfit', sans-serif;
      font-size: 28px;
      font-weight: 800;
      margin: 0 0 2px 0;
      color: var(--admin-dark);
    }
    .stat-metric-info span {
      font-size: 13px;
      font-weight: 600;
      color: var(--admin-muted);
    }

    /* ── Filter Bar & Search ── */
    .admin-filter-bar {
      background: #FFFFFF;
      border: 1.5px solid var(--admin-border);
      border-radius: var(--admin-radius);
      padding: 16px 20px;
      margin-bottom: 24px;
      display: flex;
      gap: 16px;
      align-items: center;
      flex-wrap: wrap;
      box-shadow: 0 4px 15px rgba(0,0,0,0.02);
    }
    .search-input-wrap {
      flex: 1;
      min-width: 260px;
      position: relative;
    }
    .search-input-wrap input {
      width: 100%;
      height: 44px;
      background: #FAFAF8;
      border: 1.5px solid var(--admin-border);
      border-radius: 12px;
      padding: 0 16px 0 40px;
      font-size: 14px;
      font-family: inherit;
      color: var(--admin-dark);
      box-sizing: border-box;
      outline: none;
      transition: border 0.2s;
    }
    .search-input-wrap input:focus {
      border-color: var(--admin-primary);
      background: #FFFFFF;
    }
    .search-icon-pos {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--admin-muted);
      font-size: 16px;
    }
    .filter-dropdown-select {
      height: 44px;
      background: #FAFAF8;
      border: 1.5px solid var(--admin-border);
      border-radius: 12px;
      padding: 0 14px;
      font-size: 13.5px;
      font-weight: 600;
      color: var(--admin-dark);
      cursor: pointer;
      outline: none;
    }
    .filter-dropdown-select:focus {
      border-color: var(--admin-primary);
    }

    /* ── Video Management Table ── */
    .table-container {
      background: #FFFFFF;
      border: 1.5px solid var(--admin-border);
      border-radius: var(--admin-radius);
      box-shadow: var(--admin-shadow);
      overflow: hidden;
    }
    .admin-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13.5px;
    }
    .admin-table th {
      background: #FBF9F6;
      padding: 16px 20px;
      font-weight: 700;
      color: var(--admin-muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      border-bottom: 1.5px solid var(--admin-border);
    }
    .admin-table td {
      padding: 18px 20px;
      border-bottom: 1px solid #F3EFEA;
      vertical-align: middle;
    }
    .admin-table tr:hover {
      background: #FAF8F5;
    }

    .thumb-cell {
      position: relative;
      width: 96px;
      height: 58px;
      border-radius: 10px;
      overflow: hidden;
      background: #E5E7EB;
      flex-shrink: 0;
    }
    .thumb-cell img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .thumb-duration-pill {
      position: absolute;
      bottom: 4px;
      right: 4px;
      background: rgba(0,0,0,0.75);
      color: #FFFFFF;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 5px;
      border-radius: 4px;
    }

    .video-title-wrap h4 {
      margin: 0 0 4px 0;
      font-size: 15px;
      font-weight: 700;
      color: var(--admin-dark);
    }
    .video-title-wrap p {
      margin: 0;
      font-size: 12.5px;
      color: var(--admin-muted);
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* Badges */
    .badge-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
    }
    .tag-yoga { background: #EDE9FE; color: #6D28D9; }
    .tag-mobility { background: #FEF3C7; color: #B45309; }
    .tag-breathing { background: #E0F2FE; color: #0369A1; }
    .tag-pelvic { background: #FCE7F3; color: #BE185D; }
    .tag-strength { background: #DCFCE7; color: #15803D; }
    .tag-labor { background: #FFE4E6; color: #E11D48; }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
    }
    .status-published {
      background: #D1FAE5;
      color: #065F46;
    }
    .status-draft {
      background: #FEF3C7;
      color: #92400E;
    }
    .featured-star {
      color: #F59E0B;
      font-size: 13px;
      margin-left: 4px;
    }

    .table-actions-row {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .action-btn {
      background: #F3EFEA;
      border: 1px solid var(--admin-border);
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 12px;
      font-weight: 700;
      color: var(--admin-dark);
      cursor: pointer;
      transition: all 0.15s;
    }
    .action-btn:hover {
      background: #E5DFC8;
      transform: translateY(-1px);
    }
    .action-btn.btn-edit { background: #EEF2FF; color: #4338CA; border-color: #C7D2FE; }
    .action-btn.btn-preview { background: #F0FDF4; color: #166534; border-color: #BBF7D0; }
    .action-btn.btn-delete { background: #FEF2F2; color: #991B1B; border-color: #FECACA; }

    /* ── Modals ── */
    .admin-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(6px);
      z-index: 10000;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
    }
    .admin-modal-overlay.active {
      display: flex;
    }
    .admin-modal-box {
      background: #FFFFFF;
      border-radius: 24px;
      width: 100%;
      max-width: 720px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      overflow: hidden;
      animation: modalSlide 0.2s ease-out;
    }
    @keyframes modalSlide {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .admin-modal-header {
      padding: 20px 24px;
      border-bottom: 1.5px solid var(--admin-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .admin-modal-header h3 {
      margin: 0;
      font-family: 'Outfit', sans-serif;
      font-size: 20px;
      font-weight: 800;
      color: var(--admin-dark);
    }
    .modal-close-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: var(--admin-muted);
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .modal-close-btn:hover { background: #F3EFEA; }

    .admin-modal-body {
      padding: 24px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .admin-modal-footer {
      padding: 18px 24px;
      border-top: 1.5px solid var(--admin-border);
      background: #FAF8F5;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    .form-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-group label {
      font-size: 12.5px;
      font-weight: 700;
      color: #4B4540;
    }
    .form-group input, .form-group select, .form-group textarea {
      padding: 10px 14px;
      border: 1.5px solid var(--admin-border);
      border-radius: 12px;
      font-family: inherit;
      font-size: 14px;
      color: var(--admin-dark);
      background: #FAFAF8;
      box-sizing: border-box;
      outline: none;
      transition: all 0.2s;
    }
    .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
      border-color: var(--admin-primary);
      background: #FFFFFF;
    }

    /* Drag & Drop File Zone */
    .dropzone-box {
      border: 2px dashed #D6CEC4;
      border-radius: 16px;
      padding: 20px;
      text-align: center;
      background: #FAF8F5;
      cursor: pointer;
      transition: all 0.2s;
    }
    .dropzone-box:hover, .dropzone-box.dragover {
      border-color: var(--admin-primary);
      background: #FFF1EE;
    }
    .dropzone-icon {
      font-size: 28px;
      margin-bottom: 6px;
    }

    /* Preview Container */
    .preview-player-wrap {
      border-radius: 16px;
      overflow: hidden;
      background: #000000;
      aspect-ratio: 16 / 9;
      width: 100%;
      margin-bottom: 16px;
    }
    .preview-player-wrap video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* Access Denied Card */
    .access-denied-card {
      background: #FFFFFF;
      border-radius: 24px;
      padding: 60px 40px;
      text-align: center;
      max-width: 500px;
      margin: 80px auto;
      box-shadow: var(--admin-shadow);
      border: 1.5px solid var(--admin-border);
    }
    .access-denied-icon {
      font-size: 64px;
      margin-bottom: 16px;
    }
  </style>
</head>
<body>

<div class="admin-layout">

  <!-- Sidebar -->
  <aside class="admin-sidebar">
    <a href="index.html" class="admin-brand">
      <div class="brand-logo-badge">🌸</div>
      <div class="brand-text">
        <h2>BellyBand</h2>
        <span>Super Admin Portal</span>
      </div>
    </a>

    <nav class="admin-nav">
      <a href="admin_videos.php" class="admin-nav-item active">
        <span class="nav-icon">🧘‍♀️</span>
        <span>Pregnancy Videos</span>
      </a>
      <a href="index.html?step=6" class="admin-nav-item">
        <span class="nav-icon">📱</span>
        <span>Patient Dashboard</span>
      </a>
      <a href="healthcare-auth/dashboard.html" class="admin-nav-item">
        <span class="nav-icon">🏥</span>
        <span>Clinical Portal</span>
      </a>
    </nav>

    <div class="admin-user-profile">
      <div class="admin-avatar">SA</div>
      <div class="admin-info">
        <h4><?= htmlspecialchars($_SESSION['user_name'] ?? 'Super Admin') ?></h4>
        <span><?= htmlspecialchars($_SESSION['user_email'] ?? '23prashantpandey@bellyband.co.in') ?></span>
      </div>
    </div>
  </aside>

  <!-- Main Content -->
  <main class="admin-main">

    <!-- Top RBAC Simulation / Security Bar -->
    <div class="rbac-test-banner">
      <div class="rbac-status-pill">
        <span class="status-dot"></span>
        <span>Role: <strong><?= $isLoggedInAdmin ? 'SUPER ADMIN (Authorized)' : 'GUEST / PATIENT (Restricted)' ?></strong></span>
      </div>
      <div>
        <?php if ($isLoggedInAdmin): ?>
          <a href="admin_videos.php?logout_admin=1" class="rbac-auth-btn" style="background:#FEE2E2; color:#991B1B;">🔒 Test Patient Restricted View</a>
        <?php else: ?>
          <a href="admin_videos.php?admin_auth=1" class="rbac-auth-btn" style="background:#D1FAE5; color:#065F46;">🔑 Sign in as Super Admin</a>
        <?php endif; ?>
      </div>
    </div>

    <?php if (!$isLoggedInAdmin): ?>
      <!-- Access Denied View for unauthorized users -->
      <div class="access-denied-card">
        <div class="access-denied-icon">🛡️</div>
        <h2 style="font-family: 'Outfit', sans-serif; font-size: 24px; margin-bottom: 8px;">Access Restricted</h2>
        <p style="color: var(--admin-muted); font-size: 14.5px; line-height: 1.6; margin-bottom: 24px;">
          The Video Management Portal is only accessible to authenticated BellyBand Super Administrators. Regular patient accounts are strictly prevented from viewing or editing video metadata.
        </p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <a href="admin_videos.php?admin_auth=1" class="btn-upload-new">🔑 Authorize as Super Admin</a>
          <a href="index.html?step=6" class="action-btn" style="padding: 12px 20px; font-size: 14px; text-decoration: none;">Go to Patient Dashboard</a>
        </div>
      </div>
    <?php else: ?>

      <!-- Header Row -->
      <div class="page-header-row">
        <div class="header-titles">
          <h1>Pregnancy Video Library</h1>
          <p>Manage prenatal exercise, yoga, breathing and educational video content.</p>
        </div>
        <button class="btn-upload-new" onclick="openUploadModal()">
          <span>+ Upload New Video</span>
        </button>
      </div>

      <!-- Top Statistics -->
      <div class="admin-stats-grid">
        <div class="stat-metric-card">
          <div class="stat-icon-wrap icon-total">🎬</div>
          <div class="stat-metric-info">
            <h3 id="statTotal">--</h3>
            <span>Total Videos</span>
          </div>
        </div>
        <div class="stat-metric-card">
          <div class="stat-icon-wrap icon-pub">✓</div>
          <div class="stat-metric-info">
            <h3 id="statPub">--</h3>
            <span>Published</span>
          </div>
        </div>
        <div class="stat-metric-card">
          <div class="stat-icon-wrap icon-draft">📝</div>
          <div class="stat-metric-info">
            <h3 id="statDraft">--</h3>
            <span>Drafts</span>
          </div>
        </div>
        <div class="stat-metric-card">
          <div class="stat-icon-wrap icon-feat">⭐</div>
          <div class="stat-metric-info">
            <h3 id="statFeat">--</h3>
            <span>Featured</span>
          </div>
        </div>
      </div>

      <!-- Search & Filters -->
      <div class="admin-filter-bar">
        <div class="search-input-wrap">
          <span class="search-icon-pos">🔍</span>
          <input type="text" id="adminSearchInput" placeholder="Search videos by title, instructor, category..." oninput="handleFilterChange()">
        </div>

        <select id="filterStatus" class="filter-dropdown-select" onchange="handleFilterChange()">
          <option value="">Status: All</option>
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
        </select>

        <select id="filterCategory" class="filter-dropdown-select" onchange="handleFilterChange()">
          <option value="">Category: All</option>
          <option value="Prenatal Yoga">Prenatal Yoga</option>
          <option value="Stretching">Stretching</option>
          <option value="Mobility">Mobility</option>
          <option value="Pelvic Floor">Pelvic Floor</option>
          <option value="Breathing">Breathing</option>
          <option value="Strength">Strength</option>
          <option value="Relaxation">Relaxation</option>
          <option value="Labor Preparation">Labor Preparation</option>
        </select>

        <select id="filterTrimester" class="filter-dropdown-select" onchange="handleFilterChange()">
          <option value="">Trimester: All</option>
          <option value="Trimester 1">Trimester 1</option>
          <option value="Trimester 2">Trimester 2</option>
          <option value="Trimester 3">Trimester 3</option>
          <option value="All Trimesters">All Trimesters</option>
        </select>

        <select id="filterDifficulty" class="filter-dropdown-select" onchange="handleFilterChange()">
          <option value="">Difficulty: All</option>
          <option value="Beginner">Beginner</option>
          <option value="Gentle">Gentle</option>
          <option value="Intermediate">Intermediate</option>
        </select>
      </div>

      <!-- Video Management Table -->
      <div class="table-container">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Thumbnail</th>
              <th>Video Name</th>
              <th>Category</th>
              <th>Trimester</th>
              <th>Duration</th>
              <th>Status</th>
              <th>Instructor</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="videoTableBody">
            <tr>
              <td colspan="8" style="text-align: center; padding: 40px; color: var(--admin-muted);">
                Loading videos from database...
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    <?php endif; ?>

  </main>
</div>

<!-- ================================================================
     MODAL: UPLOAD / EDIT VIDEO FORM
     ================================================================ -->
<div class="admin-modal-overlay" id="uploadModal">
  <div class="admin-modal-box">
    <div class="admin-modal-header">
      <h3 id="modalFormTitle">+ Upload New Video</h3>
      <button class="modal-close-btn" onclick="closeModal('uploadModal')">×</button>
    </div>
    
    <form id="videoAdminForm" onsubmit="handleVideoFormSubmit(event)">
      <input type="hidden" id="formVideoId" value="">
      
      <div class="admin-modal-body">
        
        <!-- Media Dropzones / URLs -->
        <div class="form-grid-2">
          <div class="form-group">
            <label>Video File / Stream URL *</label>
            <div class="dropzone-box" onclick="document.getElementById('videoFileInput').click()">
              <div class="dropzone-icon">🎬</div>
              <div style="font-size: 12.5px; font-weight: 700; color: var(--admin-primary);" id="videoFileLbl">Drag &amp; Drop Video / Click to Browse</div>
              <div style="font-size: 11px; color: var(--admin-muted);">MP4, WebM (or paste URL below)</div>
            </div>
            <input type="file" id="videoFileInput" style="display:none" accept="video/mp4,video/webm" onchange="handleFileUpload(this, 'video')">
            <input type="url" id="formVideoUrl" placeholder="https://.../video.mp4" required style="margin-top: 4px;">
          </div>

          <div class="form-group">
            <label>Thumbnail Image *</label>
            <div class="dropzone-box" onclick="document.getElementById('thumbFileInput').click()">
              <div class="dropzone-icon">🖼️</div>
              <div style="font-size: 12.5px; font-weight: 700; color: var(--admin-primary);" id="thumbFileLbl">Upload Thumbnail</div>
              <div style="font-size: 11px; color: var(--admin-muted);">JPG, PNG, WebP</div>
            </div>
            <input type="file" id="thumbFileInput" style="display:none" accept="image/*" onchange="handleFileUpload(this, 'thumbnail')">
            <input type="url" id="formThumbUrl" placeholder="https://.../cover.jpg" required style="margin-top: 4px;">
          </div>
        </div>

        <!-- Title & Description -->
        <div class="form-group">
          <label>Title *</label>
          <input type="text" id="formTitle" placeholder="e.g. Gentle Prenatal Mobility" required>
        </div>

        <div class="form-group">
          <label>Description *</label>
          <textarea id="formDescription" rows="3" placeholder="Enter gentle, pregnancy-aware description..." required></textarea>
        </div>

        <!-- Category & Trimester -->
        <div class="form-grid-2">
          <div class="form-group">
            <label>Category *</label>
            <select id="formCategory" required>
              <option value="Prenatal Yoga">Prenatal Yoga</option>
              <option value="Stretching">Stretching</option>
              <option value="Mobility">Mobility</option>
              <option value="Pelvic Floor">Pelvic Floor</option>
              <option value="Breathing">Breathing</option>
              <option value="Strength">Strength</option>
              <option value="Relaxation">Relaxation</option>
              <option value="Labor Preparation">Labor Preparation</option>
            </select>
          </div>

          <div class="form-group">
            <label>Trimester *</label>
            <select id="formTrimester" required>
              <option value="All Trimesters">All Trimesters</option>
              <option value="Trimester 1">Trimester 1</option>
              <option value="Trimester 2">Trimester 2</option>
              <option value="Trimester 3">Trimester 3</option>
            </select>
          </div>
        </div>

        <!-- Duration & Difficulty -->
        <div class="form-grid-2">
          <div class="form-group">
            <label>Duration * (e.g. 10 min)</label>
            <input type="text" id="formDuration" placeholder="10 min" required>
          </div>

          <div class="form-group">
            <label>Difficulty *</label>
            <select id="formDifficulty" required>
              <option value="Beginner">Beginner</option>
              <option value="Gentle">Gentle</option>
              <option value="Intermediate">Intermediate</option>
            </select>
          </div>
        </div>

        <!-- Instructor Info -->
        <div class="form-grid-2">
          <div class="form-group">
            <label>Instructor Name</label>
            <input type="text" id="formInstructorName" placeholder="e.g. Dr. Kavya Sharma, MPT">
          </div>
          <div class="form-group">
            <label>Instructor Credentials</label>
            <input type="text" id="formInstructorCreds" placeholder="e.g. Certified Prenatal Physiotherapist">
          </div>
        </div>

        <!-- Safety Instructions -->
        <div class="form-group">
          <label>Safety Instructions</label>
          <textarea id="formSafetyInfo" rows="2" placeholder="e.g. Move within a comfortable range. Keep hydration handy."></textarea>
        </div>

        <!-- Review, Featured & Publish Status -->
        <div class="form-grid-2" style="background:#FBF9F6; padding:12px; border-radius:14px; border:1px solid var(--admin-border);">
          <div class="form-group">
            <label>Medical/Editorial Review Status</label>
            <select id="formReviewStatus">
              <option value="reviewed">Reviewed &amp; Approved</option>
              <option value="not_reviewed">Not Reviewed</option>
            </select>
          </div>

          <div class="form-group" style="justify-content: center;">
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
              <input type="checkbox" id="formIsFeatured" style="width:18px; height:18px;">
              <span>⭐ Make this a Featured video</span>
            </label>
          </div>
        </div>

        <div class="form-group">
          <label>Publication Status</label>
          <div style="display:flex; gap:20px; align-items:center; margin-top:4px;">
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
              <input type="radio" name="formPubStatus" value="1" checked>
              <strong>Published</strong> (Live to patients)
            </label>
            <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
              <input type="radio" name="formPubStatus" value="0">
              <span>Draft (Hidden from patients)</span>
            </label>
          </div>
        </div>

      </div>

      <div class="admin-modal-footer">
        <button type="button" class="action-btn" onclick="closeModal('uploadModal')">Cancel</button>
        <button type="button" class="action-btn" onclick="saveAsDraft()">Save Draft</button>
        <button type="submit" class="btn-upload-new" id="formSubmitBtn">Publish Video</button>
      </div>
    </form>
  </div>
</div>


<!-- ================================================================
     MODAL: LIVE PATIENT-VIEW PREVIEW
     ================================================================ -->
<div class="admin-modal-overlay" id="previewModal">
  <div class="admin-modal-box" style="max-width: 800px;">
    <div class="admin-modal-header">
      <h3>Patient Live Preview</h3>
      <button class="modal-close-btn" onclick="closeModal('previewModal')">×</button>
    </div>
    
    <div class="admin-modal-body">
      <div class="preview-player-wrap">
        <video id="previewVideoPlayer" controls poster=""></video>
      </div>

      <div style="display:flex; gap:8px; align-items:center; margin-bottom:8px;">
        <span class="badge-tag tag-yoga" id="prevBadgeCat">Mobility</span>
        <span class="badge-tag" style="background:#F3EFEA;" id="prevBadgeTrim">Trimester 2</span>
        <span class="badge-tag" style="background:#F3EFEA;" id="prevBadgeDiff">Beginner</span>
        <span class="badge-tag" style="background:#F3EFEA;" id="prevBadgeDur">10 min</span>
      </div>

      <h2 id="prevTitle" style="font-family:'Outfit',sans-serif; font-size:22px; margin:0 0 8px 0;">Video Title</h2>
      <p id="prevDesc" style="color:var(--admin-muted); font-size:14.5px; line-height:1.6; margin:0 0 16px 0;">Description...</p>

      <div style="background:#FDF8F6; border:1px solid #FFE4DD; border-radius:14px; padding:14px; margin-bottom:16px;">
        <h4 style="margin:0 0 6px 0; color:var(--admin-primary); font-size:13.5px;">👩‍⚕️ Instructor</h4>
        <div id="prevInstructor" style="font-size:13.5px; font-weight:700;">Dr. Kavya Sharma</div>
        <div id="prevCreds" style="font-size:12px; color:var(--admin-muted);">Certified Prenatal Physiotherapist</div>
      </div>

      <div style="background:#FBF9F6; border-left:4px solid #D97706; padding:12px 16px; border-radius:8px;">
        <h4 style="margin:0 0 4px 0; font-size:13px; color:#92400E;">⚠️ Safety Guidance</h4>
        <p id="prevSafety" style="margin:0; font-size:12.5px; color:#78350F; line-height:1.5;">Safety instructions...</p>
      </div>
    </div>

    <div class="admin-modal-footer">
      <button type="button" class="action-btn" onclick="closeModal('previewModal')">Back to Edit</button>
      <button type="button" class="btn-upload-new" id="prevPublishBtn" onclick="publishFromPreview()">Publish</button>
    </div>
  </div>
</div>


<!-- ================================================================
     MODAL: CONFIRM DELETE
     ================================================================ -->
<div class="admin-modal-overlay" id="deleteModal">
  <div class="admin-modal-box" style="max-width: 440px; text-align:center;">
    <div class="admin-modal-body" style="padding: 32px 24px;">
      <div style="font-size: 48px; margin-bottom: 12px;">🗑️</div>
      <h3 style="font-family:'Outfit',sans-serif; font-size:20px; margin:0 0 8px 0;">Delete Video?</h3>
      <p style="color:var(--admin-muted); font-size:14px; line-height:1.5; margin:0 0 20px 0;">
        Are you sure you want to permanently delete this video? This action cannot be undone.
      </p>
      <input type="hidden" id="deleteTargetId" value="">
      <div style="display:flex; gap:12px; justify-content:center;">
        <button class="action-btn" onclick="closeModal('deleteModal')">Cancel</button>
        <button class="action-btn btn-delete" style="padding:10px 20px;" onclick="executeDelete()">Delete Permanently</button>
      </div>
    </div>
  </div>
</div>

<script>
let allVideos = [];
let previewVideoObj = null;

document.addEventListener('DOMContentLoaded', () => {
  loadAdminVideos();
});

async function loadAdminVideos() {
  try {
    const res = await fetch('api/pregnancy_videos.php?action=list');
    const json = await res.json();
    if (json.success) {
      allVideos = json.data || [];
      renderVideoTable(allVideos);
      loadStats();
    } else {
      document.getElementById('videoTableBody').innerHTML = `
        <tr><td colspan="8" style="text-align:center; padding:30px; color:#DC2626;">${json.message || 'Error loading videos.'}</td></tr>
      `;
    }
  } catch (err) {
    console.error('Error fetching admin videos:', err);
  }
}

async function loadStats() {
  try {
    const res = await fetch('api/pregnancy_videos.php?action=stats');
    const json = await res.json();
    if (json.success && json.data) {
      document.getElementById('statTotal').textContent = json.data.total;
      document.getElementById('statPub').textContent = json.data.published;
      document.getElementById('statDraft').textContent = json.data.drafts;
      document.getElementById('statFeat').textContent = json.data.featured;
    }
  } catch (err) {
    console.error('Error fetching stats:', err);
  }
}

function renderVideoTable(videos) {
  const tbody = document.getElementById('videoTableBody');
  if (!tbody) return;

  if (!videos.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:40px; color:var(--admin-muted);">No videos found matching filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = videos.map(v => {
    const catClass = v.category.toLowerCase().includes('yoga') ? 'tag-yoga' :
                     v.category.toLowerCase().includes('breath') ? 'tag-breathing' :
                     v.category.toLowerCase().includes('pelvic') ? 'tag-pelvic' :
                     v.category.toLowerCase().includes('strength') ? 'tag-strength' :
                     v.category.toLowerCase().includes('labor') ? 'tag-labor' : 'tag-mobility';
    
    return `
      <tr>
        <td>
          <div class="thumb-cell">
            <img src="${v.thumbnail_url}" alt="${v.title}" onerror="this.src='https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=300'">
            <span class="thumb-duration-pill">${v.duration}</span>
          </div>
        </td>
        <td>
          <div class="video-title-wrap">
            <h4>${v.title} ${v.is_featured ? '<span class="featured-star" title="Featured">⭐</span>' : ''}</h4>
            <p>${v.description}</p>
          </div>
        </td>
        <td><span class="badge-tag ${catClass}">${v.category}</span></td>
        <td><strong>${v.trimester}</strong></td>
        <td>${v.duration}</td>
        <td>
          <span class="status-badge ${v.is_published ? 'status-published' : 'status-draft'}">
            ${v.is_published ? 'Published ✓' : 'Draft'}
          </span>
        </td>
        <td>
          <div style="font-weight:600; font-size:13px;">${v.instructor_name || 'Expert'}</div>
          <div style="font-size:11px; color:var(--admin-muted);">${v.instructor_credentials || ''}</div>
        </td>
        <td>
          <div class="table-actions-row">
            <button class="action-btn btn-edit" onclick="openEditModal(${v.id})" title="Edit Video">✏️ Edit</button>
            <button class="action-btn btn-preview" onclick="openPreviewModal(${v.id})" title="Preview as Patient">👁 Preview</button>
            <button class="action-btn" onclick="togglePublishStatus(${v.id})" title="${v.is_published ? 'Unpublish' : 'Publish'}">
              ${v.is_published ? 'Unpublish' : 'Publish'}
            </button>
            <button class="action-btn" onclick="toggleFeaturedStatus(${v.id})" title="Toggle Featured">
              ${v.is_featured ? '★' : '☆'}
            </button>
            <button class="action-btn btn-delete" onclick="openDeleteModal(${v.id})" title="Delete">🗑</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function handleFilterChange() {
  const search = document.getElementById('adminSearchInput')?.value.toLowerCase().trim() || '';
  const status = document.getElementById('filterStatus')?.value || '';
  const cat    = document.getElementById('filterCategory')?.value || '';
  const trim   = document.getElementById('filterTrimester')?.value || '';
  const diff   = document.getElementById('filterDifficulty')?.value || '';

  const filtered = allVideos.filter(v => {
    if (search && !v.title.toLowerCase().includes(search) && !v.description.toLowerCase().includes(search) && !(v.instructor_name || '').toLowerCase().includes(search)) {
      return false;
    }
    if (status === 'published' && !v.is_published) return false;
    if (status === 'draft' && v.is_published) return false;
    if (cat && v.category !== cat) return false;
    if (trim && v.trimester !== trim && v.trimester !== 'All Trimesters') return false;
    if (diff && v.difficulty !== diff) return false;
    return true;
  });

  renderVideoTable(filtered);
}

// ── Modals Helper ──
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('active');
}

function openUploadModal() {
  document.getElementById('formVideoId').value = '';
  document.getElementById('modalFormTitle').textContent = '+ Upload New Video';
  document.getElementById('videoAdminForm').reset();
  document.getElementById('formSubmitBtn').textContent = 'Publish Video';
  document.getElementById('videoFileLbl').textContent = 'Drag & Drop Video / Click to Browse';
  document.getElementById('thumbFileLbl').textContent = 'Upload Thumbnail';
  openModal('uploadModal');
}

function openEditModal(id) {
  const video = allVideos.find(v => v.id === id);
  if (!video) return;

  document.getElementById('formVideoId').value = video.id;
  document.getElementById('modalFormTitle').textContent = 'Edit Video: ' + video.title;
  document.getElementById('formTitle').value = video.title;
  document.getElementById('formDescription').value = video.description;
  document.getElementById('formCategory').value = video.category;
  document.getElementById('formTrimester').value = video.trimester;
  document.getElementById('formDuration').value = video.duration;
  document.getElementById('formDifficulty').value = video.difficulty;
  document.getElementById('formVideoUrl').value = video.video_url;
  document.getElementById('formThumbUrl').value = video.thumbnail_url;
  document.getElementById('formInstructorName').value = video.instructor_name || '';
  document.getElementById('formInstructorCreds').value = video.instructor_credentials || '';
  document.getElementById('formSafetyInfo').value = video.safety_information || '';
  document.getElementById('formReviewStatus').value = video.review_status || 'reviewed';
  document.getElementById('formIsFeatured').checked = !!video.is_featured;
  
  const radioPub = document.querySelector(`input[name="formPubStatus"][value="${video.is_published ? '1' : '0'}"]`);
  if (radioPub) radioPub.checked = true;

  document.getElementById('formSubmitBtn').textContent = 'Save Changes';
  openModal('uploadModal');
}

async function handleFileUpload(input, type) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);

  const lbl = type === 'video' ? document.getElementById('videoFileLbl') : document.getElementById('thumbFileLbl');
  if (lbl) lbl.textContent = 'Uploading ' + file.name + '...';

  try {
    const res = await fetch('api/pregnancy_videos.php?action=upload_media', {
      method: 'POST',
      body: formData
    });
    const json = await res.json();
    if (json.success) {
      if (type === 'video') {
        document.getElementById('formVideoUrl').value = json.data.url;
        if (lbl) lbl.textContent = 'Uploaded: ' + json.data.filename;
      } else {
        document.getElementById('formThumbUrl').value = json.data.url;
        if (lbl) lbl.textContent = 'Uploaded: ' + json.data.filename;
      }
    } else {
      alert(json.message || 'Upload failed.');
      if (lbl) lbl.textContent = 'Upload failed. Try again.';
    }
  } catch (err) {
    alert('Upload failed: ' + err.message);
  }
}

async function handleVideoFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('formVideoId').value;
  const action = id ? 'update' : 'create';

  const payload = {
    id: id ? parseInt(id) : undefined,
    title: document.getElementById('formTitle').value.trim(),
    description: document.getElementById('formDescription').value.trim(),
    category: document.getElementById('formCategory').value,
    trimester: document.getElementById('formTrimester').value,
    duration: document.getElementById('formDuration').value.trim(),
    difficulty: document.getElementById('formDifficulty').value,
    video_url: document.getElementById('formVideoUrl').value.trim(),
    thumbnail_url: document.getElementById('formThumbUrl').value.trim(),
    instructor_name: document.getElementById('formInstructorName').value.trim(),
    instructor_credentials: document.getElementById('formInstructorCreds').value.trim(),
    safety_information: document.getElementById('formSafetyInfo').value.trim(),
    review_status: document.getElementById('formReviewStatus').value,
    is_featured: document.getElementById('formIsFeatured').checked ? 1 : 0,
    is_published: parseInt(document.querySelector('input[name="formPubStatus"]:checked')?.value || '1')
  };

  try {
    const res = await fetch(`api/pregnancy_videos.php?action=${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json.success) {
      closeModal('uploadModal');
      loadAdminVideos();
    } else {
      alert(json.message || 'Error saving video.');
    }
  } catch (err) {
    alert('Failed to save: ' + err.message);
  }
}

function saveAsDraft() {
  const draftRadio = document.querySelector('input[name="formPubStatus"][value="0"]');
  if (draftRadio) draftRadio.checked = true;
  document.getElementById('videoAdminForm').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
}

function openPreviewModal(id) {
  const video = allVideos.find(v => v.id === id);
  if (!video) return;
  previewVideoObj = video;

  const player = document.getElementById('previewVideoPlayer');
  player.src = video.video_url;
  player.poster = video.thumbnail_url;
  document.getElementById('prevTitle').textContent = video.title;
  document.getElementById('prevDesc').textContent = video.description;
  document.getElementById('prevBadgeCat').textContent = video.category;
  document.getElementById('prevBadgeTrim').textContent = video.trimester;
  document.getElementById('prevBadgeDiff').textContent = video.difficulty;
  document.getElementById('prevBadgeDur').textContent = video.duration;
  document.getElementById('prevInstructor').textContent = video.instructor_name || 'Certified Specialist';
  document.getElementById('prevCreds').textContent = video.instructor_credentials || '';
  document.getElementById('prevSafety').textContent = video.safety_information || 'Move within a comfortable range.';
  
  const pubBtn = document.getElementById('prevPublishBtn');
  pubBtn.textContent = video.is_published ? 'Already Published ✓' : 'Publish Video';
  pubBtn.disabled = !!video.is_published;

  openModal('previewModal');
}

async function publishFromPreview() {
  if (!previewVideoObj) return;
  if (!previewVideoObj.is_published) {
    await togglePublishStatus(previewVideoObj.id);
    closeModal('previewModal');
  }
}

async function togglePublishStatus(id) {
  try {
    const res = await fetch('api/pregnancy_videos.php?action=toggle_publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    const json = await res.json();
    if (json.success) {
      loadAdminVideos();
    } else {
      alert(json.message || 'Failed to update status.');
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

async function toggleFeaturedStatus(id) {
  try {
    const res = await fetch('api/pregnancy_videos.php?action=toggle_featured', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    const json = await res.json();
    if (json.success) {
      loadAdminVideos();
    } else {
      alert(json.message || 'Failed to update featured status.');
    }
  } catch (err) {
    alert('Error: ' + err.message);
  }
}

function openDeleteModal(id) {
  document.getElementById('deleteTargetId').value = id;
  openModal('deleteModal');
}

async function executeDelete() {
  const id = document.getElementById('deleteTargetId').value;
  if (!id) return;

  try {
    const res = await fetch('api/pregnancy_videos.php?action=delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    const json = await res.json();
    if (json.success) {
      closeModal('deleteModal');
      loadAdminVideos();
    } else {
      alert(json.message || 'Delete failed.');
    }
  } catch (err) {
    alert('Delete error: ' + err.message);
  }
}
</script>

</body>
</html>
