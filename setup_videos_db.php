<?php
/**
 * BellyBand - Prenatal Yoga & Fitness Database Migrator & Seed Runner
 */

require_once __DIR__ . '/config/db.php';

header('Content-Type: application/json');

try {
    $db = getDBConnection();

    // Table 1: pregnancy_videos
    $sqlVideos = "CREATE TABLE IF NOT EXISTS `pregnancy_videos` (
      `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      `title` VARCHAR(255) NOT NULL,
      `description` TEXT NOT NULL,
      `video_url` VARCHAR(500) NOT NULL,
      `thumbnail_url` VARCHAR(500) NOT NULL,
      `category` VARCHAR(100) NOT NULL,
      `trimester` VARCHAR(50) NOT NULL,
      `duration` VARCHAR(50) NOT NULL,
      `difficulty` ENUM('Beginner', 'Gentle', 'Intermediate') NOT NULL DEFAULT 'Beginner',
      `instructor_name` VARCHAR(150) NULL,
      `instructor_credentials` VARCHAR(255) NULL,
      `safety_information` TEXT NULL,
      `review_status` ENUM('not_reviewed', 'reviewed') NOT NULL DEFAULT 'reviewed',
      `is_featured` TINYINT(1) NOT NULL DEFAULT 0,
      `is_published` TINYINT(1) NOT NULL DEFAULT 1,
      `created_by` INT UNSIGNED NULL,
      `updated_by` INT UNSIGNED NULL,
      `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX `idx_videos_trimester` (`trimester`),
      INDEX `idx_videos_category` (`category`),
      INDEX `idx_videos_published` (`is_published`),
      INDEX `idx_videos_featured` (`is_featured`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

    $db->exec($sqlVideos);

    // Table 2: pregnancy_video_progress
    $sqlProgress = "CREATE TABLE IF NOT EXISTS `pregnancy_video_progress` (
      `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      `user_id` INT UNSIGNED NOT NULL,
      `video_id` INT UNSIGNED NOT NULL,
      `completed` TINYINT(1) NOT NULL DEFAULT 0,
      `progress_seconds` INT UNSIGNED NOT NULL DEFAULT 0,
      `completion_pct` TINYINT UNSIGNED NOT NULL DEFAULT 0,
      `completed_at` DATETIME NULL,
      `last_watched_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY `uk_user_video` (`user_id`, `video_id`),
      INDEX `idx_user_progress` (`user_id`, `completed`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

    $db->exec($sqlProgress);

    // Check if table has seed records
    $stmt = $db->query("SELECT COUNT(*) FROM `pregnancy_videos`");
    $count = (int)$stmt->fetchColumn();

    $seeds = [
        [
            'id' => 1,
            'title' => 'Gentle Prenatal Full-Body Movement',
            'description' => 'Gentle movements for mobility, flexibility and whole-body relaxation. Focuses on light shoulder rolls, side body expanses, and joint ease.',
            'video_url' => 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            'thumbnail_url' => 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&auto=format&fit=crop&q=80',
            'category' => 'Mobility',
            'trimester' => 'All Trimesters',
            'duration' => '10 min',
            'difficulty' => 'Beginner',
            'instructor_name' => 'Dr. Kavya Sharma, MPT',
            'instructor_credentials' => 'Certified Prenatal Physiotherapist & Maternal Movement Specialist',
            'safety_information' => 'Maintain steady nasal breathing. Keep feet hip-distance apart for stability. Rest whenever needed.',
            'review_status' => 'reviewed',
            'is_featured' => 1,
            'is_published' => 1
        ],
        [
            'id' => 2,
            'title' => 'Prenatal Breathing & Relaxation',
            'description' => 'Calming pranayama breathwork to ease maternal tension, lower sympathetic nervous stress, and oxygenate body and baby.',
            'video_url' => 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
            'thumbnail_url' => 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop&q=80',
            'category' => 'Breathing',
            'trimester' => 'All Trimesters',
            'duration' => '8 min',
            'difficulty' => 'Beginner',
            'instructor_name' => 'Pooja Nair, E-RYT 500',
            'instructor_credentials' => 'Lead Prenatal Yoga Educator & Mindfulness Guide',
            'safety_information' => 'Never hold your breath until strained. Keep inhales soft and exhales slow and releasing.',
            'review_status' => 'reviewed',
            'is_featured' => 1,
            'is_published' => 1
        ],
        [
            'id' => 3,
            'title' => 'Cat-Cow & Gentle Pelvic Tilts',
            'description' => 'Rhythmic spinal decompression to relieve lumbar pressure, soothe sciatica discomfort, and encourage pelvic mobility.',
            'video_url' => 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
            'thumbnail_url' => 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&auto=format&fit=crop&q=80',
            'category' => 'Mobility',
            'trimester' => 'All Trimesters',
            'duration' => '10 min',
            'difficulty' => 'Beginner',
            'instructor_name' => 'Dr. Kavya Sharma, MPT',
            'instructor_credentials' => 'Certified Prenatal Physiotherapist',
            'safety_information' => 'Place a folded blanket under the knees for extra cushioning. Do not over-arch the lower back.',
            'review_status' => 'reviewed',
            'is_featured' => 0,
            'is_published' => 1
        ],
        [
            'id' => 4,
            'title' => 'Pelvic Floor Awareness',
            'description' => 'Guided pelvic floor awareness and subtle contraction-relaxation coordination to build pelvic strength and mindful release.',
            'video_url' => 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
            'thumbnail_url' => 'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?w=800&auto=format&fit=crop&q=80',
            'category' => 'Pelvic Floor',
            'trimester' => 'All Trimesters',
            'duration' => '7 min',
            'difficulty' => 'Beginner',
            'instructor_name' => 'Dr. Ananya Rao, OB-GYN',
            'instructor_credentials' => 'Consultant Obstetrician & Women\'s Health Specialist',
            'safety_information' => 'Ensure you fully release and relax the pelvic floor between gentle activations. Avoid clenching glutes.',
            'review_status' => 'reviewed',
            'is_featured' => 0,
            'is_published' => 1
        ],
        [
            'id' => 5,
            'title' => 'Supported Prenatal Strength',
            'description' => 'Low-impact standing strength sequence utilizing a chair or wall to support posture, glute stability, and leg circulation.',
            'video_url' => 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
            'thumbnail_url' => 'https://images.unsplash.com/photo-1599447421416-3414500d18a5?w=800&auto=format&fit=crop&q=80',
            'category' => 'Strength',
            'trimester' => 'Trimester 2',
            'duration' => '12 min',
            'difficulty' => 'Beginner',
            'instructor_name' => 'Elena Rostova',
            'instructor_credentials' => 'Prenatal Fitness & Core Conditioning Specialist',
            'safety_information' => 'Keep support within arm\'s reach. Discontinue if feeling lightheaded or overheated.',
            'review_status' => 'reviewed',
            'is_featured' => 0,
            'is_published' => 1
        ],
        [
            'id' => 6,
            'title' => 'Gentle Hip & Pelvic Mobility',
            'description' => 'Supported butterfly and hip circling flows to ease tension in the groin, hips, and lower sacrum.',
            'video_url' => 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
            'thumbnail_url' => 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80',
            'category' => 'Mobility',
            'trimester' => 'Trimester 2',
            'duration' => '12 min',
            'difficulty' => 'Beginner',
            'instructor_name' => 'Pooja Nair, E-RYT 500',
            'instructor_credentials' => 'Lead Prenatal Yoga Educator',
            'safety_information' => 'Use cushions under the knees if hip flexors feel tight. Move only within a comfortable range of motion.',
            'review_status' => 'reviewed',
            'is_featured' => 0,
            'is_published' => 1
        ],
        [
            'id' => 7,
            'title' => 'Prenatal Stretch & Relaxation',
            'description' => 'Restorative side stretches, gentle neck releases, and restorative seating for nighttime calm and easing muscle tightness.',
            'video_url' => 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4',
            'thumbnail_url' => 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&auto=format&fit=crop&q=80',
            'category' => 'Stretching',
            'trimester' => 'All Trimesters',
            'duration' => '8 min',
            'difficulty' => 'Gentle',
            'instructor_name' => 'Dr. Kavya Sharma, MPT',
            'instructor_credentials' => 'Prenatal Physiotherapist',
            'safety_information' => 'Avoid holding positions that compress the abdomen. Support the torso with bolsters.',
            'review_status' => 'reviewed',
            'is_featured' => 0,
            'is_published' => 1
        ],
        [
            'id' => 8,
            'title' => 'Third-Trimester Mobility & Breathing',
            'description' => 'Gentle upright and forward-leaning movement sequences to create pelvic space, maintain comfort, and prepare the body for birth.',
            'video_url' => 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
            'thumbnail_url' => 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop&q=80',
            'category' => 'Labor Preparation',
            'trimester' => 'Trimester 3',
            'duration' => '10 min',
            'difficulty' => 'Gentle',
            'instructor_name' => 'Dr. Ananya Rao, OB-GYN & Kavya Sharma, MPT',
            'instructor_credentials' => 'Obstetrics & Maternal Physical Therapy Collaboration',
            'safety_information' => 'Stay well hydrated. Avoid lying flat on your back. Always have a chair or birth ball available for support.',
            'review_status' => 'reviewed',
            'is_featured' => 1,
            'is_published' => 1
        ]
    ];

    $insertSql = "INSERT INTO `pregnancy_videos` (
        `id`, `title`, `description`, `video_url`, `thumbnail_url`,
        `category`, `trimester`, `duration`, `difficulty`,
        `instructor_name`, `instructor_credentials`, `safety_information`,
        `review_status`, `is_featured`, `is_published`
    ) VALUES (
        :id, :title, :description, :video_url, :thumbnail_url,
        :category, :trimester, :duration, :difficulty,
        :instructor_name, :instructor_credentials, :safety_information,
        :review_status, :is_featured, :is_published
    ) ON DUPLICATE KEY UPDATE
        `title` = VALUES(`title`),
        `description` = VALUES(`description`),
        `video_url` = VALUES(`video_url`),
        `thumbnail_url` = VALUES(`thumbnail_url`),
        `category` = VALUES(`category`),
        `trimester` = VALUES(`trimester`),
        `duration` = VALUES(`duration`),
        `difficulty` = VALUES(`difficulty`),
        `instructor_name` = VALUES(`instructor_name`),
        `instructor_credentials` = VALUES(`instructor_credentials`),
        `safety_information` = VALUES(`safety_information`),
        `review_status` = VALUES(`review_status`),
        `is_featured` = VALUES(`is_featured`),
        `is_published` = VALUES(`is_published`)";

    $stmt = $db->prepare($insertSql);
    foreach ($seeds as $item) {
        $stmt->execute($item);
    }

    echo json_encode([
        'success' => true,
        'message' => 'Database tables and 8 seed prenatal videos initialized successfully.',
        'seeded_count' => count($seeds)
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database setup failed: ' . $e->getMessage()
    ]);
}
