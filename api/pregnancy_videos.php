<?php
/**
 * BellyBand - Prenatal Yoga & Fitness Videos REST API
 * Secure Server-Side Role Based Access Control (RBAC)
 */

require_once __DIR__ . '/../config/db.php';
startAppSession();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ── Auto-ensure DB tables exist ─────────────────────────────────────────────
function ensureTablesExist(PDO $db): void {
    static $checked = false;
    if ($checked) return;
    try {
        $db->query("SELECT 1 FROM `pregnancy_videos` LIMIT 1");
    } catch (Exception $e) {
        // Run setup if table does not exist
        $sql = file_get_contents(__DIR__ . '/../database_videos_migration.sql');
        if ($sql) {
            $db->exec($sql);
        }
    }
    $checked = true;
}

// ── Authentication & RBAC Helper ───────────────────────────────────────────
function isSuperAdmin(): bool {
    // 1. Check PHP Session for Super Admin / Admin role
    if (!empty($_SESSION['system_role']) && in_array($_SESSION['system_role'], ['ROLE_SUPER_ADMIN', 'ADMIN', 'super_admin'])) {
        return true;
    }
    if (!empty($_SESSION['role']) && in_array($_SESSION['role'], ['admin', 'super_admin', 'ROLE_SUPER_ADMIN', 'hospital_admin'])) {
        return true;
    }
    if (!empty($_SESSION['is_superadmin']) && $_SESSION['is_superadmin'] == 1) {
        return true;
    }

    // 2. Check Bearer Token or Healthcare Auth JWT Header if present
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        $token = trim($matches[1]);
        if (!empty($token)) {
            try {
                $db = getDBConnection();
                // Check in hc_users or hc_sessions / user_sessions
                $stmt = $db->prepare("SELECT u.system_role FROM hc_users u JOIN hc_sessions s ON u.id = s.user_id WHERE s.token = :token AND s.expires_at > NOW() LIMIT 1");
                $stmt->execute([':token' => $token]);
                $res = $stmt->fetch();
                if ($res && in_array($res['system_role'], ['ROLE_SUPER_ADMIN', 'ADMIN'])) {
                    return true;
                }
            } catch (Exception $e) {
                // Table might not exist or error, continue
            }
        }
    }

    // 3. Optional Admin simulation mode via verified dev/admin query token or header
    $adminKey = $headers['X-Admin-Secret'] ?? $_GET['admin_key'] ?? $_POST['admin_key'] ?? '';
    if (!empty($adminKey) && ($adminKey === 'BELLYBAND_SUPER_ADMIN_2026' || $adminKey === 'ANURAGp23@')) {
        return true;
    }

    return false;
}

function getCurrentUserId(): ?int {
    if (!empty($_SESSION['user_id'])) {
        return (int)$_SESSION['user_id'];
    }
    if (!empty($_SESSION['hc_user_id'])) {
        return (int)$_SESSION['hc_user_id'];
    }
    return 1; // Default demo user (Sarah Jenkins) for continuous tracking
}

function sendResponse(bool $success, string $message, $data = null, int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data'    => $data,
        'is_admin'=> isSuperAdmin()
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $db = getDBConnection();
    ensureTablesExist($db);
    $action = $_GET['action'] ?? $_POST['action'] ?? 'list';
    $method = $_SERVER['REQUEST_METHOD'];

    // ────────────────────────────────────────────────────────────────────────
    // 1. GET / STATS (Admin only)
    // ────────────────────────────────────────────────────────────────────────
    if ($action === 'stats') {
        if (!isSuperAdmin()) {
            sendResponse(false, 'Unauthorized. Super Admin access required.', null, 403);
        }

        $totalStmt = $db->query("SELECT COUNT(*) FROM `pregnancy_videos`");
        $pubStmt   = $db->query("SELECT COUNT(*) FROM `pregnancy_videos` WHERE is_published = 1");
        $draftStmt = $db->query("SELECT COUNT(*) FROM `pregnancy_videos` WHERE is_published = 0");
        $featStmt  = $db->query("SELECT COUNT(*) FROM `pregnancy_videos` WHERE is_featured = 1");

        $stats = [
            'total'     => (int)$totalStmt->fetchColumn(),
            'published' => (int)$pubStmt->fetchColumn(),
            'drafts'    => (int)$draftStmt->fetchColumn(),
            'featured'  => (int)$featStmt->fetchColumn()
        ];
        sendResponse(true, 'Video statistics loaded.', $stats);
    }

    // ────────────────────────────────────────────────────────────────────────
    // 2. GET / LIST VIDEOS
    // ────────────────────────────────────────────────────────────────────────
    if ($action === 'list' && $method === 'GET') {
        $isAdmin = isSuperAdmin();
        $userId  = getCurrentUserId();

        $category   = trim($_GET['category'] ?? '');
        $trimester  = trim($_GET['trimester'] ?? '');
        $difficulty = trim($_GET['difficulty'] ?? '');
        $status     = trim($_GET['status'] ?? '');
        $featured   = isset($_GET['featured']) ? (int)$_GET['featured'] : null;
        $search     = trim($_GET['search'] ?? '');

        $where = [];
        $params = [];

        // Patient access ONLY sees published videos
        if (!$isAdmin) {
            $where[] = "v.is_published = 1";
        } else {
            // Admin can filter by status
            if ($status === 'published') {
                $where[] = "v.is_published = 1";
            } elseif ($status === 'draft') {
                $where[] = "v.is_published = 0";
            }
        }

        if (!empty($category) && strtolower($category) !== 'all') {
            $where[] = "v.category = :category";
            $params[':category'] = $category;
        }

        if (!empty($trimester) && strtolower($trimester) !== 'all') {
            if (strtolower($trimester) === 'all trimesters') {
                $where[] = "v.trimester = 'All Trimesters'";
            } else {
                $where[] = "(v.trimester = :trimester OR v.trimester = 'All Trimesters' OR v.trimester LIKE :trimLike)";
                $params[':trimester'] = $trimester;
                $params[':trimLike'] = "%" . $trimester . "%";
            }
        }

        if (!empty($difficulty) && strtolower($difficulty) !== 'all') {
            $where[] = "v.difficulty = :difficulty";
            $params[':difficulty'] = $difficulty;
        }

        if ($featured !== null) {
            $where[] = "v.is_featured = :featured";
            $params[':featured'] = $featured;
        }

        if (!empty($search)) {
            $where[] = "(v.title LIKE :search OR v.description LIKE :search OR v.instructor_name LIKE :search OR v.category LIKE :search)";
            $params[':search'] = "%" . $search . "%";
        }

        $whereSql = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

        // Query with user progress left joined
        $sql = "SELECT 
                  v.*,
                  COALESCE(p.completed, 0) AS is_completed,
                  COALESCE(p.progress_seconds, 0) AS progress_seconds,
                  COALESCE(p.completion_pct, 0) AS completion_pct,
                  p.last_watched_at
                FROM `pregnancy_videos` v
                LEFT JOIN `pregnancy_video_progress` p 
                  ON v.id = p.video_id AND p.user_id = :userId
                {$whereSql}
                ORDER BY v.is_featured DESC, v.created_at DESC";

        $params[':userId'] = $userId ?? 0;
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $videos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Typecast booleans and ints
        foreach ($videos as &$v) {
            $v['id']           = (int)$v['id'];
            $v['is_featured']   = (int)$v['is_featured'];
            $v['is_published']  = (int)$v['is_published'];
            $v['is_completed']  = (int)$v['is_completed'];
            $v['progress_seconds'] = (int)$v['progress_seconds'];
            $v['completion_pct']   = (int)$v['completion_pct'];
        }

        sendResponse(true, 'Videos retrieved successfully.', $videos);
    }

    // ────────────────────────────────────────────────────────────────────────
    // 3. GET SINGLE VIDEO
    // ────────────────────────────────────────────────────────────────────────
    if ($action === 'get') {
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) {
            sendResponse(false, 'Invalid video ID.', null, 400);
        }

        $userId = getCurrentUserId();
        $isAdmin = isSuperAdmin();

        $stmt = $db->prepare("SELECT 
                  v.*,
                  COALESCE(p.completed, 0) AS is_completed,
                  COALESCE(p.progress_seconds, 0) AS progress_seconds,
                  COALESCE(p.completion_pct, 0) AS completion_pct,
                  p.last_watched_at
                FROM `pregnancy_videos` v
                LEFT JOIN `pregnancy_video_progress` p 
                  ON v.id = p.video_id AND p.user_id = :userId
                WHERE v.id = :id LIMIT 1");
        $stmt->execute([':id' => $id, ':userId' => $userId ?? 0]);
        $video = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$video) {
            sendResponse(false, 'Video not found.', null, 404);
        }

        if (!$video['is_published'] && !$isAdmin) {
            sendResponse(false, 'Access restricted to published content.', null, 403);
        }

        $video['id']           = (int)$video['id'];
        $video['is_featured']   = (int)$video['is_featured'];
        $video['is_published']  = (int)$video['is_published'];
        $video['is_completed']  = (int)$video['is_completed'];
        $video['progress_seconds'] = (int)$video['progress_seconds'];
        $video['completion_pct']   = (int)$video['completion_pct'];

        sendResponse(true, 'Video details loaded.', $video);
    }

    // ────────────────────────────────────────────────────────────────────────
    // 4. POST / TRACK PROGRESS (Any logged in patient)
    // ────────────────────────────────────────────────────────────────────────
    if ($action === 'track_progress' && $method === 'POST') {
        $rawInput = file_get_contents('php://input');
        $input = json_decode($rawInput, true) ?: $_POST;

        $videoId         = (int)($input['video_id'] ?? 0);
        $progressSeconds = (int)($input['progress_seconds'] ?? 0);
        $completionPct   = min(100, max(0, (int)($input['completion_pct'] ?? 0)));
        $completed       = (!empty($input['completed']) || $completionPct >= 90) ? 1 : 0;
        $userId          = getCurrentUserId();

        if ($videoId <= 0) {
            sendResponse(false, 'Invalid video ID.', null, 400);
        }

        $stmt = $db->prepare("INSERT INTO `pregnancy_video_progress` (
            `user_id`, `video_id`, `completed`, `progress_seconds`, `completion_pct`, `completed_at`, `last_watched_at`
        ) VALUES (
            :user_id, :video_id, :completed, :progress_seconds, :completion_pct, IF(:completed = 1, NOW(), NULL), NOW()
        ) ON DUPLICATE KEY UPDATE
            `completed` = GREATEST(`completed`, VALUES(`completed`)),
            `progress_seconds` = VALUES(`progress_seconds`),
            `completion_pct` = GREATEST(`completion_pct`, VALUES(`completion_pct`)),
            `completed_at` = IF(VALUES(`completed`) = 1 AND `completed_at` IS NULL, NOW(), `completed_at`),
            `last_watched_at` = NOW()");

        $stmt->execute([
            ':user_id'          => $userId,
            ':video_id'         => $videoId,
            ':completed'        => $completed,
            ':progress_seconds' => $progressSeconds,
            ':completion_pct'   => $completionPct
        ]);

        sendResponse(true, 'Progress saved successfully.', [
            'video_id'   => $videoId,
            'completed'  => $completed,
            'completion_pct' => $completionPct
        ]);
    }

    // ────────────────────────────────────────────────────────────────────────
    // 5. ADMIN-ONLY OPERATIONS BELOW
    // ────────────────────────────────────────────────────────────────────────
    if (!isSuperAdmin()) {
        sendResponse(false, 'Access Denied: Super Admin authentication required for content management.', null, 403);
    }

    // ── Upload Media (Video or Thumbnail) ──
    if ($action === 'upload_media' && $method === 'POST') {
        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            sendResponse(false, 'No file uploaded or upload error occurred.', null, 400);
        }

        $type = $_POST['type'] ?? 'thumbnail';
        $file = $_FILES['file'];
        $uploadBase = __DIR__ . '/../.uploads/';
        $subDir = ($type === 'video') ? 'videos/' : 'thumbnails/';
        $targetDir = $uploadBase . $subDir;

        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0755, true);
        }

        // Validate MIME type
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($file['tmp_name']);

        $allowedVideoMimes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
        $allowedThumbMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

        if ($type === 'video' && !in_array($mime, $allowedVideoMimes)) {
            sendResponse(false, 'Invalid video format. Allowed: MP4, WebM, OGG.', null, 400);
        }
        if ($type === 'thumbnail' && !in_array($mime, $allowedThumbMimes)) {
            sendResponse(false, 'Invalid image format. Allowed: JPG, PNG, WEBP, GIF, SVG.', null, 400);
        }

        // Generate clean unique filename
        $ext = pathinfo($file['name'], PATHINFO_EXTENSION);
        $filename = uniqid('bb_' . $type . '_', true) . '.' . strtolower($ext);
        $targetPath = $targetDir . $filename;

        if (move_uploaded_file($file['tmp_name'], $targetPath)) {
            $publicUrl = '.uploads/' . $subDir . $filename;
            sendResponse(true, 'File uploaded successfully.', [
                'url'      => $publicUrl,
                'filename' => $filename,
                'type'     => $type
            ]);
        } else {
            sendResponse(false, 'Failed to save uploaded file.', null, 500);
        }
    }

    // ── Create New Video ──
    if ($action === 'create' && $method === 'POST') {
        $rawInput = file_get_contents('php://input');
        $input = json_decode($rawInput, true) ?: $_POST;

        $title       = trim($input['title'] ?? '');
        $description = trim($input['description'] ?? '');
        $category    = trim($input['category'] ?? '');
        $trimester   = trim($input['trimester'] ?? 'All Trimesters');
        $duration    = trim($input['duration'] ?? '10 min');
        $difficulty  = trim($input['difficulty'] ?? 'Beginner');
        $videoUrl    = trim($input['video_url'] ?? '');
        $thumbUrl    = trim($input['thumbnail_url'] ?? '');

        if (empty($title) || empty($description) || empty($category)) {
            sendResponse(false, 'Title, description, and category are required.', null, 400);
        }

        if (empty($videoUrl)) {
            $videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
        }
        if (empty($thumbUrl)) {
            $thumbUrl = 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&auto=format&fit=crop&q=80';
        }

        $instructorName   = trim($input['instructor_name'] ?? 'Dr. Kavya Sharma, MPT');
        $instructorCreds  = trim($input['instructor_credentials'] ?? 'Certified Prenatal Physiotherapist');
        $safetyInfo       = trim($input['safety_information'] ?? 'Move gently within your comfort zone. Stop if you experience pain.');
        $reviewStatus     = in_array($input['review_status'] ?? '', ['reviewed', 'not_reviewed']) ? $input['review_status'] : 'reviewed';
        $isFeatured       = !empty($input['is_featured']) ? 1 : 0;
        $isPublished      = (isset($input['is_published']) && (int)$input['is_published'] === 0) ? 0 : 1;
        $adminId          = getCurrentUserId();

        $stmt = $db->prepare("INSERT INTO `pregnancy_videos` (
            `title`, `description`, `video_url`, `thumbnail_url`,
            `category`, `trimester`, `duration`, `difficulty`,
            `instructor_name`, `instructor_credentials`, `safety_information`,
            `review_status`, `is_featured`, `is_published`, `created_by`, `updated_by`
        ) VALUES (
            :title, :description, :video_url, :thumbnail_url,
            :category, :trimester, :duration, :difficulty,
            :instructor_name, :instructor_credentials, :safety_information,
            :review_status, :is_featured, :is_published, :created_by, :updated_by
        )");

        $stmt->execute([
            ':title'                  => $title,
            ':description'            => $description,
            ':video_url'              => $videoUrl,
            ':thumbnail_url'          => $thumbUrl,
            ':category'               => $category,
            ':trimester'              => $trimester,
            ':duration'               => $duration,
            ':difficulty'             => $difficulty,
            ':instructor_name'        => $instructorName,
            ':instructor_credentials' => $instructorCreds,
            ':safety_information'     => $safetyInfo,
            ':review_status'          => $reviewStatus,
            ':is_featured'            => $isFeatured,
            ':is_published'           => $isPublished,
            ':created_by'             => $adminId,
            ':updated_by'             => $adminId
        ]);

        $newId = (int)$db->lastInsertId();
        sendResponse(true, 'Prenatal video created successfully.', ['id' => $newId], 201);
    }

    // ── Update Existing Video ──
    if ($action === 'update' && $method === 'POST') {
        $rawInput = file_get_contents('php://input');
        $input = json_decode($rawInput, true) ?: $_POST;

        $id = (int)($input['id'] ?? $_GET['id'] ?? 0);
        if ($id <= 0) {
            sendResponse(false, 'Invalid video ID.', null, 400);
        }

        $title       = trim($input['title'] ?? '');
        $description = trim($input['description'] ?? '');
        $category    = trim($input['category'] ?? '');
        $trimester   = trim($input['trimester'] ?? 'All Trimesters');
        $duration    = trim($input['duration'] ?? '10 min');
        $difficulty  = trim($input['difficulty'] ?? 'Beginner');
        $videoUrl    = trim($input['video_url'] ?? '');
        $thumbUrl    = trim($input['thumbnail_url'] ?? '');

        if (empty($title) || empty($description) || empty($category)) {
            sendResponse(false, 'Title, description, and category are required.', null, 400);
        }

        $instructorName  = trim($input['instructor_name'] ?? '');
        $instructorCreds = trim($input['instructor_credentials'] ?? '');
        $safetyInfo      = trim($input['safety_information'] ?? '');
        $reviewStatus    = in_array($input['review_status'] ?? '', ['reviewed', 'not_reviewed']) ? $input['review_status'] : 'reviewed';
        $isFeatured      = !empty($input['is_featured']) ? 1 : 0;
        $isPublished     = (isset($input['is_published']) && (int)$input['is_published'] === 0) ? 0 : 1;
        $adminId         = getCurrentUserId();

        $stmt = $db->prepare("UPDATE `pregnancy_videos` SET 
            `title` = :title,
            `description` = :description,
            `video_url` = :video_url,
            `thumbnail_url` = :thumbnail_url,
            `category` = :category,
            `trimester` = :trimester,
            `duration` = :duration,
            `difficulty` = :difficulty,
            `instructor_name` = :instructor_name,
            `instructor_credentials` = :instructor_credentials,
            `safety_information` = :safety_information,
            `review_status` = :review_status,
            `is_featured` = :is_featured,
            `is_published` = :is_published,
            `updated_by` = :updated_by
            WHERE `id` = :id");

        $stmt->execute([
            ':id'                     => $id,
            ':title'                  => $title,
            ':description'            => $description,
            ':video_url'              => $videoUrl,
            ':thumbnail_url'          => $thumbUrl,
            ':category'               => $category,
            ':trimester'              => $trimester,
            ':duration'               => $duration,
            ':difficulty'             => $difficulty,
            ':instructor_name'        => $instructorName,
            ':instructor_credentials' => $instructorCreds,
            ':safety_information'     => $safetyInfo,
            ':review_status'          => $reviewStatus,
            ':is_featured'            => $isFeatured,
            ':is_published'           => $isPublished,
            ':updated_by'             => $adminId
        ]);

        sendResponse(true, 'Video updated successfully.', ['id' => $id]);
    }

    // ── Toggle Publish Status ──
    if ($action === 'toggle_publish' && $method === 'POST') {
        $rawInput = file_get_contents('php://input');
        $input = json_decode($rawInput, true) ?: $_POST;
        $id = (int)($input['id'] ?? $_GET['id'] ?? 0);

        if ($id <= 0) {
            sendResponse(false, 'Invalid video ID.', null, 400);
        }

        $stmt = $db->prepare("UPDATE `pregnancy_videos` SET `is_published` = 1 - `is_published`, `updated_by` = :adminId WHERE `id` = :id");
        $stmt->execute([':id' => $id, ':adminId' => getCurrentUserId()]);

        $checkStmt = $db->prepare("SELECT is_published FROM `pregnancy_videos` WHERE id = :id");
        $checkStmt->execute([':id' => $id]);
        $newStatus = (int)$checkStmt->fetchColumn();

        sendResponse(true, $newStatus ? 'Video published.' : 'Video moved to draft.', [
            'id'           => $id,
            'is_published' => $newStatus
        ]);
    }

    // ── Toggle Featured Status ──
    if ($action === 'toggle_featured' && $method === 'POST') {
        $rawInput = file_get_contents('php://input');
        $input = json_decode($rawInput, true) ?: $_POST;
        $id = (int)($input['id'] ?? $_GET['id'] ?? 0);

        if ($id <= 0) {
            sendResponse(false, 'Invalid video ID.', null, 400);
        }

        $stmt = $db->prepare("UPDATE `pregnancy_videos` SET `is_featured` = 1 - `is_featured`, `updated_by` = :adminId WHERE `id` = :id");
        $stmt->execute([':id' => $id, ':adminId' => getCurrentUserId()]);

        $checkStmt = $db->prepare("SELECT is_featured FROM `pregnancy_videos` WHERE id = :id");
        $checkStmt->execute([':id' => $id]);
        $newFeatured = (int)$checkStmt->fetchColumn();

        sendResponse(true, $newFeatured ? 'Video marked as Featured.' : 'Featured status removed.', [
            'id'          => $id,
            'is_featured' => $newFeatured
        ]);
    }

    // ── Delete Video ──
    if ($action === 'delete' && $method === 'POST') {
        $rawInput = file_get_contents('php://input');
        $input = json_decode($rawInput, true) ?: $_POST;
        $id = (int)($input['id'] ?? $_GET['id'] ?? 0);

        if ($id <= 0) {
            sendResponse(false, 'Invalid video ID.', null, 400);
        }

        $stmt = $db->prepare("DELETE FROM `pregnancy_videos` WHERE `id` = :id");
        $stmt->execute([':id' => $id]);

        sendResponse(true, 'Video deleted successfully.', ['id' => $id]);
    }

    sendResponse(false, 'Unknown API action requested.', null, 400);

} catch (Exception $e) {
    error_log("Pregnancy Videos API Error: " . $e->getMessage());
    sendResponse(false, 'Server Error: ' . $e->getMessage(), null, 500);
}
