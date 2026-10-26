-- ============================================================================
-- BELLYBAND PRENATAL YOGA & FITNESS DATABASE SCHEMA & SEED DATA
-- Database: bellyband_db
-- ============================================================================

USE `bellyband_db`;

-- ----------------------------------------------------------------------------
-- Table 1: pregnancy_videos
-- Stores video metadata, trimesters, categories, instructors, and status.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pregnancy_videos` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `video_url` VARCHAR(500) NOT NULL,
  `thumbnail_url` VARCHAR(500) NOT NULL,
  `category` VARCHAR(100) NOT NULL,            -- e.g. 'Prenatal Yoga', 'Stretching', 'Mobility', 'Pelvic Floor', 'Breathing', 'Strength', 'Relaxation', 'Labor Preparation'
  `trimester` VARCHAR(50) NOT NULL,            -- 'Trimester 1', 'Trimester 2', 'Trimester 3', 'All Trimesters'
  `duration` VARCHAR(50) NOT NULL,             -- e.g. '10 min', '8 min'
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

  -- Performance Indexes
  INDEX `idx_videos_trimester` (`trimester`),
  INDEX `idx_videos_category` (`category`),
  INDEX `idx_videos_published` (`is_published`),
  INDEX `idx_videos_featured` (`is_featured`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------------------------
-- Table 2: pregnancy_video_progress
-- Tracks user watch history, completion status, and progress seconds.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pregnancy_video_progress` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `video_id` INT UNSIGNED NOT NULL,
  `completed` TINYINT(1) NOT NULL DEFAULT 0,
  `progress_seconds` INT UNSIGNED NOT NULL DEFAULT 0,
  `completion_pct` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `completed_at` DATETIME NULL,
  `last_watched_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT `fk_video_prog_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT `fk_video_prog_video`
    FOREIGN KEY (`video_id`) REFERENCES `pregnancy_videos` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,

  UNIQUE KEY `uk_user_video` (`user_id`, `video_id`),
  INDEX `idx_user_progress` (`user_id`, `completed`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------------------------
-- SEED SAMPLE PRENATAL VIDEOS (The 8 requested videos)
-- ----------------------------------------------------------------------------
INSERT INTO `pregnancy_videos` (
  `id`, `title`, `description`, `video_url`, `thumbnail_url`,
  `category`, `trimester`, `duration`, `difficulty`,
  `instructor_name`, `instructor_credentials`, `safety_information`,
  `review_status`, `is_featured`, `is_published`
) VALUES 
(
  1,
  'Gentle Prenatal Full-Body Movement',
  'Gentle movements for mobility, flexibility and whole-body relaxation. Focuses on light shoulder rolls, side body expanses, and joint ease.',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&auto=format&fit=crop&q=80',
  'Mobility',
  'All Trimesters',
  '10 min',
  'Beginner',
  'Dr. Kavya Sharma, MPT',
  'Certified Prenatal Physiotherapist & Maternal Movement Specialist',
  'Maintain steady nasal breathing. Keep feet hip-distance apart for stability. Rest whenever needed.',
  'reviewed',
  1,
  1
),
(
  2,
  'Prenatal Breathing & Relaxation',
  'Calming pranayama breathwork to ease maternal tension, lower sympathetic nervous stress, and oxygenate body and baby.',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop&q=80',
  'Breathing',
  'All Trimesters',
  '8 min',
  'Beginner',
  'Pooja Nair, E-RYT 500',
  'Lead Prenatal Yoga Educator & Mindfulness Guide',
  'Never hold your breath until strained. Keep inhales soft and exhales slow and releasing.',
  'reviewed',
  1,
  1
),
(
  3,
  'Cat-Cow & Gentle Pelvic Tilts',
  'Rhythmic spinal decompression to relieve lumbar pressure, soothe sciatica discomfort, and encourage pelvic mobility.',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&auto=format&fit=crop&q=80',
  'Mobility',
  'All Trimesters',
  '10 min',
  'Beginner',
  'Dr. Kavya Sharma, MPT',
  'Certified Prenatal Physiotherapist',
  'Place a folded blanket under the knees for extra cushioning. Do not over-arch the lower back.',
  'reviewed',
  0,
  1
),
(
  4,
  'Pelvic Floor Awareness',
  'Guided pelvic floor awareness and subtle contraction-relaxation coordination to build pelvic strength and mindful release.',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
  'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?w=800&auto=format&fit=crop&q=80',
  'Pelvic Floor',
  'All Trimesters',
  '7 min',
  'Beginner',
  'Dr. Ananya Rao, OB-GYN',
  'Consultant Obstetrician & Women\'s Health Specialist',
  'Ensure you fully release and relax the pelvic floor between gentle activations. Avoid clenching glutes.',
  'reviewed',
  0,
  1
),
(
  5,
  'Supported Prenatal Strength',
  'Low-impact standing strength sequence utilizing a chair or wall to support posture, glute stability, and leg circulation.',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  'https://images.unsplash.com/photo-1599447421416-3414500d18a5?w=800&auto=format&fit=crop&q=80',
  'Strength',
  'Trimester 2',
  '12 min',
  'Beginner',
  'Elena Rostova',
  'Prenatal Fitness & Core Conditioning Specialist',
  'Keep support within arm\'s reach. Discontinue if feeling lightheaded or overheated.',
  'reviewed',
  0,
  1
),
(
  6,
  'Gentle Hip & Pelvic Mobility',
  'Supported butterfly and hip circling flows to ease tension in the groin, hips, and lower sacrum.',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&auto=format&fit=crop&q=80',
  'Mobility',
  'Trimester 2',
  '12 min',
  'Beginner',
  'Pooja Nair, E-RYT 500',
  'Lead Prenatal Yoga Educator',
  'Use cushions under the knees if hip flexors feel tight. Move only within a comfortable range of motion.',
  'reviewed',
  0,
  1
),
(
  7,
  'Prenatal Stretch & Relaxation',
  'Restorative side stretches, gentle neck releases, and restorative seating for nighttime calm and easing muscle tightness.',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4',
  'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&auto=format&fit=crop&q=80',
  'Stretching',
  'All Trimesters',
  '8 min',
  'Gentle',
  'Dr. Kavya Sharma, MPT',
  'Prenatal Physiotherapist',
  'Avoid holding positions that compress the abdomen. Support the torso with bolsters.',
  'reviewed',
  0,
  1
),
(
  8,
  'Third-Trimester Mobility & Breathing',
  'Gentle upright and forward-leaning movement sequences to create pelvic space, maintain comfort, and prepare the body for birth.',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop&q=80',
  'Labor Preparation',
  'Trimester 3',
  '10 min',
  'Gentle',
  'Dr. Ananya Rao, OB-GYN & Kavya Sharma, MPT',
  'Obstetrics & Maternal Physical Therapy Collaboration',
  'Stay well hydrated. Avoid lying flat on your back. Always have a chair or birth ball available for support.',
  'reviewed',
  1,
  1
)
ON DUPLICATE KEY UPDATE
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
  `is_published` = VALUES(`is_published`);
