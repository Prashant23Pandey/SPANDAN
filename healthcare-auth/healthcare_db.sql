-- ============================================================================
-- HEALTHCARE AUTH SYSTEM — DATABASE SCHEMA
-- BellyBand Healthcare Multi-Role Registration & Authentication Module
-- Database: MySQL / MariaDB (Compatible with XAMPP phpMyAdmin)
-- Encoding: utf8mb4 (Full multilingual + emoji support)
-- Compliance: HIPAA / DISHA aligned data isolation
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `bellyband_db`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `bellyband_db`;

-- ============================================================================
-- TABLE 1: hc_departments
-- Reference table for the 5 healthcare departments.
-- ============================================================================
CREATE TABLE IF NOT EXISTS `hc_departments` (
  `id`          TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `dept_key`    VARCHAR(50)  NOT NULL UNIQUE COMMENT 'Machine-readable key',
  `dept_name`   VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) NULL,
  `icon`        VARCHAR(10)  NOT NULL DEFAULT '🏥',
  `requires_license` TINYINT(1) NOT NULL DEFAULT 1
    COMMENT '1 = professional credential required; 0 = personal care (no license)',
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE 2: hc_roles
-- All 17 roles mapped to departments. Cascading dropdown source.
-- ============================================================================
CREATE TABLE IF NOT EXISTS `hc_roles` (
  `id`            SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `department_id` TINYINT UNSIGNED NOT NULL,
  `role_key`      VARCHAR(80)  NOT NULL UNIQUE,
  `role_name`     VARCHAR(120) NOT NULL,
  `description`   VARCHAR(255) NULL,
  `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT `fk_roles_dept`
    FOREIGN KEY (`department_id`) REFERENCES `hc_departments` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  INDEX `idx_roles_dept` (`department_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE 3: hc_users
-- Central user table. Stores all registration data, credentials, RBAC metadata.
-- ============================================================================
CREATE TABLE IF NOT EXISTS `hc_users` (
  `id`                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

  -- Step 1: Basic Identity
  `full_name`             VARCHAR(120) NOT NULL,
  `email`                 VARCHAR(191) NOT NULL UNIQUE,
  `phone`                 VARCHAR(20)  NOT NULL,
  `phone_verified`        TINYINT(1)   NOT NULL DEFAULT 0,
  `emergency_contact`     VARCHAR(20)  NULL,

  -- Step 2: Department & Role
  `department_id`         TINYINT UNSIGNED NOT NULL,
  `role_id`               SMALLINT UNSIGNED NOT NULL,
  `facility_name`         VARCHAR(200) NULL COMMENT 'Hospital / NGO / Clinic name',

  -- Step 3: Professional Credentials (NULL for Personal Care dept)
  `license_number`        VARCHAR(100) NULL,
  `licensing_body`        VARCHAR(150) NULL,
  `license_doc_path`      VARCHAR(500) NULL COMMENT 'Relative path to uploaded license file',

  -- Step 4: Security
  `password_hash`         VARCHAR(255) NOT NULL COMMENT 'bcrypt cost=12',
  `two_fa_enabled`        TINYINT(1)   NOT NULL DEFAULT 0,
  `two_fa_method`         ENUM('sms','authenticator') NULL DEFAULT NULL,
  `two_fa_secret`         VARCHAR(64)  NULL COMMENT 'TOTP secret (encrypted at rest)',

  -- Status & RBAC
  `verification_status`   ENUM(
                            'active',
                            'pending_verification',
                            'verified',
                            'rejected',
                            'suspended'
                          ) NOT NULL DEFAULT 'pending_verification',
  `admin_notes`           TEXT NULL COMMENT 'Admin remarks during verification review',

  -- Metadata
  `last_login_at`         DATETIME NULL,
  `login_attempt_count`   TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `locked_until`          DATETIME NULL COMMENT 'Brute-force lockout timestamp',
  `created_at`            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Foreign Keys
  CONSTRAINT `fk_users_dept`
    FOREIGN KEY (`department_id`) REFERENCES `hc_departments` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT `fk_users_role`
    FOREIGN KEY (`role_id`) REFERENCES `hc_roles` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  -- Indexes
  INDEX `idx_hc_users_email`     (`email`),
  INDEX `idx_hc_users_phone`     (`phone`),
  INDEX `idx_hc_users_dept_role` (`department_id`, `role_id`),
  INDEX `idx_hc_users_status`    (`verification_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE 3B: hc_user_profiles
-- Extended profile + role-specific fields in JSON (keeps hc_users lean).
-- ============================================================================
CREATE TABLE IF NOT EXISTS `hc_user_profiles` (
  `user_id`            INT UNSIGNED PRIMARY KEY,
  `preferred_name`     VARCHAR(120) NULL,
  `gender`             VARCHAR(40)  NULL,
  `pronouns`           VARCHAR(60)  NULL,
  `avatar_path`        VARCHAR(500) NULL COMMENT 'Relative path to profile avatar',
  `role_data`          JSON NOT NULL COMMENT 'Role-specific fields (doctor/admin/patient/etc.)',
  `notification_prefs` JSON NOT NULL COMMENT 'Notification settings: email/sms/criticalOnly',
  `created_at`         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT `fk_profile_user`
    FOREIGN KEY (`user_id`) REFERENCES `hc_users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE 4: hc_verification_queue
-- All clinical & allied health registrations enter this queue for admin review.
-- ============================================================================
CREATE TABLE IF NOT EXISTS `hc_verification_queue` (
  `id`              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id`         INT UNSIGNED NOT NULL UNIQUE,
  `license_number`  VARCHAR(100) NOT NULL,
  `licensing_body`  VARCHAR(150) NOT NULL,
  `doc_path`        VARCHAR(500) NOT NULL,
  `status`          ENUM('pending','under_review','approved','rejected') NOT NULL DEFAULT 'pending',
  `reviewed_by`     INT UNSIGNED NULL COMMENT 'Admin hc_users.id who reviewed this',
  `reviewed_at`     DATETIME NULL,
  `review_notes`    TEXT NULL,
  `submitted_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT `fk_vq_user`
    FOREIGN KEY (`user_id`) REFERENCES `hc_users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,

  INDEX `idx_vq_status`    (`status`),
  INDEX `idx_vq_submitted` (`submitted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE 5: hc_refresh_tokens
-- Secure JWT refresh token store. Used by Node.js API layer.
-- ============================================================================
CREATE TABLE IF NOT EXISTS `hc_refresh_tokens` (
  `id`          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id`     INT UNSIGNED NOT NULL,
  `token_hash`  VARCHAR(128) NOT NULL UNIQUE COMMENT 'SHA-256 hash of actual token',
  `ip_address`  VARCHAR(45)  NULL,
  `user_agent`  VARCHAR(500) NULL,
  `expires_at`  DATETIME NOT NULL,
  `revoked`     TINYINT(1) NOT NULL DEFAULT 0,
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT `fk_rt_user`
    FOREIGN KEY (`user_id`) REFERENCES `hc_users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,

  INDEX `idx_rt_token`   (`token_hash`),
  INDEX `idx_rt_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE 6: hc_otp_log
-- Phone OTP codes. Short TTL — cleaned by app logic.
-- ============================================================================
CREATE TABLE IF NOT EXISTS `hc_otp_log` (
  `id`          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `phone`       VARCHAR(20) NOT NULL,
  `otp_hash`    VARCHAR(128) NOT NULL COMMENT 'SHA-256 hash of OTP code',
  `purpose`     ENUM('phone_verify','login_2fa','password_reset') NOT NULL DEFAULT 'phone_verify',
  `attempts`    TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `verified`    TINYINT(1) NOT NULL DEFAULT 0,
  `expires_at`  DATETIME NOT NULL COMMENT 'OTP valid for 10 minutes',
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX `idx_otp_phone`   (`phone`),
  INDEX `idx_otp_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE 6B: hc_email_otp_log
-- Email OTP codes for email change verification (10 min TTL).
-- ============================================================================
CREATE TABLE IF NOT EXISTS `hc_email_otp_log` (
  `id`         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id`    INT UNSIGNED NOT NULL,
  `new_email`  VARCHAR(191) NOT NULL,
  `otp_hash`   VARCHAR(128) NOT NULL,
  `attempts`   TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `verified`   TINYINT(1) NOT NULL DEFAULT 0,
  `expires_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT `fk_email_otp_user`
    FOREIGN KEY (`user_id`) REFERENCES `hc_users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,

  INDEX `idx_email_otp_user` (`user_id`),
  INDEX `idx_email_otp_email` (`new_email`),
  INDEX `idx_email_otp_expires` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE 7: hc_audit_log
-- HIPAA-aligned audit trail. Every auth action logged immutably.
-- ============================================================================
CREATE TABLE IF NOT EXISTS `hc_audit_log` (
  `id`          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id`     INT UNSIGNED NULL COMMENT 'NULL for failed attempts (unknown user)',
  `action`      VARCHAR(80) NOT NULL
    COMMENT 'LOGIN_SUCCESS | LOGIN_FAIL | REGISTER | LOGOUT | TOKEN_REFRESH | ACCOUNT_LOCKED',
  `ip_address`  VARCHAR(45) NULL,
  `user_agent`  VARCHAR(500) NULL,
  `meta`        JSON NULL COMMENT 'Extra context: dept, role, error reason, etc.',
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX `idx_audit_user`   (`user_id`),
  INDEX `idx_audit_action` (`action`),
  INDEX `idx_audit_ts`     (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- SEED DATA: 5 Departments
-- ============================================================================
INSERT INTO `hc_departments`
  (`id`, `dept_key`, `dept_name`, `description`, `icon`, `requires_license`)
VALUES
  (1, 'clinical_services',
   'Clinical Services',
   'OB-GYNs, Physicians, Maternal-Fetal Specialists & Pediatricians', '🩺', 1),

  (2, 'allied_health',
   'Allied Health & Therapy',
   'Nutritionists, Counselors, Physiotherapists & Lactation Consultants', '💊', 1),

  (3, 'community_field_health',
   'Community & Field Health',
   'ASHA Workers, ANM, Community Volunteers & NGO Field Leads', '🌿', 1),

  (4, 'emergency_operations',
   'Emergency & Operations',
   'On-Call Responders, Ambulance Coordinators & Hospital Admissions', '🚑', 1),

  (5, 'personal_care_network',
   'Personal Care Network',
   'Expectant Mothers, Partners, Family Members & Secondary Caregivers', '👨‍👩‍👧', 0)

ON DUPLICATE KEY UPDATE `id` = `id`;


-- ============================================================================
-- SEED DATA: 17 Roles across all 5 Departments
-- ============================================================================
INSERT INTO `hc_roles`
  (`id`, `department_id`, `role_key`, `role_name`, `description`)
VALUES
  -- Dept 1: Clinical Services (4 roles)
  ( 1, 1, 'obgyn',
    'Obstetrician / Gynecologist (OB-GYN)',
    'Specializes in pregnancy, childbirth, and female reproductive health'),
  ( 2, 1, 'general_physician',
    'General Physician',
    'Primary care doctor covering maternal general health'),
  ( 3, 1, 'mfm_specialist',
    'Maternal-Fetal Specialist',
    'Manages high-risk pregnancies and complex fetal conditions'),
  ( 4, 1, 'pediatrician_neonatologist',
    'Pediatrician / Neonatologist',
    'Newborn and infant specialist'),

  -- Dept 2: Allied Health & Therapy (4 roles)
  ( 5, 2, 'maternal_nutritionist',
    'Maternal Nutritionist / Dietitian',
    'Provides prenatal and postnatal dietary guidance'),
  ( 6, 2, 'mental_health_counselor',
    'Prenatal Mental Health Counselor',
    'Supports emotional and psychological wellbeing during pregnancy'),
  ( 7, 2, 'physiotherapist',
    'Physiotherapist',
    'Physical rehabilitation and pregnancy fitness specialist'),
  ( 8, 2, 'lactation_consultant',
    'Lactation Consultant',
    'Supports breastfeeding education and challenges'),

  -- Dept 3: Community & Field Health (3 roles)
  ( 9, 3, 'asha_anm_worker',
    'ASHA / ANM Worker',
    'Accredited Social Health Activist or Auxiliary Nurse Midwife'),
  (10, 3, 'community_health_volunteer',
    'Community Health Volunteer',
    'Grassroots health awareness and outreach'),
  (11, 3, 'ngo_field_lead',
    'NGO Field Lead',
    'Manages NGO maternal health programs in field'),

  -- Dept 4: Emergency & Operations (3 roles)
  (12, 4, 'emergency_responder',
    'On-Call Emergency Responder',
    'First-response care during obstetric emergencies'),
  (13, 4, 'ambulance_coordinator',
    'Ambulance Logistics Coordinator',
    'Manages emergency transport for maternal cases'),
  (14, 4, 'hospital_admissions_staff',
    'Hospital Admissions Staff',
    'Handles patient intake, records, and bed allocation'),

  -- Dept 5: Personal Care Network (3 roles)
  (15, 5, 'expectant_mother',
    'Expectant Mother',
    'Primary user tracking their own pregnancy journey'),
  (16, 5, 'partner_husband',
    'Partner / Husband',
    'Supporting partner synced with mothers pregnancy data'),
  (17, 5, 'secondary_caregiver',
    'Secondary Caregiver / Family Member',
    'Extended family member providing support')

ON DUPLICATE KEY UPDATE `id` = `id`;

