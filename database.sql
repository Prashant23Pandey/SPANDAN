-- ============================================================================
-- BELLYBAND DATABASE SCHEMA
-- Pregnancy, Motherhood & Family Companion Application
-- Database: MySQL / MariaDB (Compatible with phpMyAdmin, XAMPP, LAMP, cPanel)
-- Character Set: utf8mb4 (Full multilingual support for EN, HI, BN, TE, TA, KN)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `bellyband_db`
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `bellyband_db`;

-- ----------------------------------------------------------------------------
-- Table 1: users
-- Stores user profile, authentication credentials, onboarding choices,
-- language preference, role, life stage, and delivery date/week.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `full_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  
  -- Onboarding Step 1: Language ('en', 'hi', 'bn', 'te', 'ta', 'kn')
  `language` VARCHAR(10) NOT NULL DEFAULT 'en',
  
  -- Onboarding Step 2: Role in Family
  `role` ENUM('wife_mother', 'husband_father') NOT NULL DEFAULT 'wife_mother',
  
  -- Onboarding Step 3: Life Stage
  `life_stage` ENUM('pregnant', 'mother', 'already_parent') NOT NULL DEFAULT 'pregnant',
  
  -- Onboarding Step 4: Due Date or Current Week
  `expected_delivery_date` DATE NULL,
  `pregnancy_week` TINYINT UNSIGNED NULL, -- Range: 1 to 41
  
  -- Profile & Status Details
  `avatar_emoji` VARCHAR(20) DEFAULT '🌸',
  `profile_photo` LONGTEXT NULL, -- Supports upload path (e.g. .uploads/profiles/...) or image data URL
  `status` ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
  `last_login_at` DATETIME NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes for quick authentication lookups
  INDEX `idx_users_email` (`email`),
  INDEX `idx_users_role_stage` (`role`, `life_stage`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------------------------
-- Table 2: user_sessions
-- Secure session / persistent login "Remember Me" authentication tokens.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `session_token` VARCHAR(64) NOT NULL UNIQUE,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` VARCHAR(255) NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT `fk_sessions_user_id`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
    
  INDEX `idx_sessions_token` (`session_token`),
  INDEX `idx_sessions_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------------------------
-- Table 3: password_resets
-- One-time secure tokens for forgot-password workflows.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `password_resets` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(191) NOT NULL,
  `token` VARCHAR(64) NOT NULL UNIQUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATETIME NOT NULL,
  
  INDEX `idx_resets_email_token` (`email`, `token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------------------------
-- Table 4: kick_logs
-- Fetal kick counter tracking logs for pregnant mothers.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `kick_logs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `log_date` DATE NOT NULL,
  `kick_count` SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  `session_start` TIME NULL,
  `session_end` TIME NULL,
  `notes` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT `fk_kick_user_id`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
    
  INDEX `idx_kick_user_date` (`user_id`, `log_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------------------------
-- Table 5: water_logs
-- Daily hydration and water glasses tracking.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `water_logs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `log_date` DATE NOT NULL,
  `glasses_logged` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `target_glasses` TINYINT UNSIGNED NOT NULL DEFAULT 8,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  CONSTRAINT `fk_water_user_id`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
    
  UNIQUE KEY `uk_user_water_date` (`user_id`, `log_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------------------------
-- Table 6: symptom_logs
-- Daily mood, physical symptoms, and journal notes.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `symptom_logs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `log_date` DATE NOT NULL,
  `mood` VARCHAR(50) NULL,             -- e.g. 'Energetic', 'Tired', 'Calm', 'Anxious'
  `symptoms` TEXT NULL,                -- JSON or comma-separated symptoms (e.g. 'Backache, Nausea')
  `notes` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT `fk_symptom_user_id`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
    
  INDEX `idx_symptom_user_date` (`user_id`, `log_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ----------------------------------------------------------------------------
-- Table 7: appointments
-- Doctor visits, ultrasounds, scans, and vaccine reminders.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `appointments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(150) NOT NULL,       -- e.g. 'Week 24 Glucose Screening Appointment'
  `doctor_name` VARCHAR(100) NULL,
  `clinic_location` VARCHAR(200) NULL,
  `appointment_date` DATE NOT NULL,
  `appointment_time` TIME NULL,
  `is_completed` TINYINT(1) NOT NULL DEFAULT 0,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT `fk_appt_user_id`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
    
  INDEX `idx_appt_user_date` (`user_id`, `appointment_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- SEED SAMPLE DATA (For testing login & registration)
-- ============================================================================
-- Demo User 1: Sarah Jenkins (Wife | Mother, Pregnant, Week 24)
-- Password: Password123! (bcrypt hashed)
INSERT INTO `users` (
  `id`, `full_name`, `email`, `password_hash`, `language`, `role`, `life_stage`, `expected_delivery_date`, `pregnancy_week`, `avatar_emoji`, `status`
) VALUES (
  1,
  'Sarah Jenkins',
  'sarah@example.com',
  '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- Default bcrypt hash for 'password'
  'en',
  'wife_mother',
  'pregnant',
  '2026-11-15',
  24,
  '🌸',
  'active'
) ON DUPLICATE KEY UPDATE `id` = `id`;

-- Demo User 2: David Jenkins (Husband | Father, Partner Sync)
INSERT INTO `users` (
  `id`, `full_name`, `email`, `password_hash`, `language`, `role`, `life_stage`, `expected_delivery_date`, `pregnancy_week`, `avatar_emoji`, `status`
) VALUES (
  2,
  'David Jenkins',
  'david@example.com',
  '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- Default bcrypt hash for 'password'
  'en',
  'husband_father',
  'pregnant',
  '2026-11-15',
  24,
  '👨‍🍼',
  'active'
) ON DUPLICATE KEY UPDATE `id` = `id`;

-- Sample Kick Logs for Sarah
INSERT INTO `kick_logs` (`user_id`, `log_date`, `kick_count`, `session_start`, `session_end`, `notes`)
VALUES (1, CURDATE(), 4, '09:30:00', '10:00:00', 'Active kicks after breakfast')
ON DUPLICATE KEY UPDATE `id` = `id`;

-- Sample Water Log for Sarah
INSERT INTO `water_logs` (`user_id`, `log_date`, `glasses_logged`, `target_glasses`)
VALUES (1, CURDATE(), 6, 8)
ON DUPLICATE KEY UPDATE `glasses_logged` = 6;
