-- ============================================================================
-- MaaCare / BellyBand Healthcare Platform
-- File: healthcare-auth/sql/rbac_schema.sql
-- RBAC Extension Schema — Roles, Permissions, Role-Permission Mappings
-- Extends: bellyband_db (healthcare_db.sql must be imported first)
-- Compliance: HIPAA / DISHA aligned role isolation
-- ============================================================================

USE `bellyband_db`;

-- ============================================================================
-- TABLE: hc_system_roles
-- 7 named platform roles. Maps to JWT claim `user_role`.
-- ============================================================================
CREATE TABLE IF NOT EXISTS `hc_system_roles` (
  `id`          TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `role_key`    VARCHAR(50)  NOT NULL UNIQUE COMMENT 'e.g. ROLE_SUPER_ADMIN',
  `role_label`  VARCHAR(100) NOT NULL COMMENT 'Human-readable display name',
  `dashboard_path` VARCHAR(100) NOT NULL COMMENT 'Frontend route e.g. /dashboard/clinical',
  `color_hex`   VARCHAR(7)   NOT NULL DEFAULT '#6B7280' COMMENT 'UI badge color',
  `icon`        VARCHAR(10)  NOT NULL DEFAULT '👤',
  `priority`    TINYINT UNSIGNED NOT NULL DEFAULT 99 COMMENT 'Lower = higher authority',
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: hc_permissions
-- Atomic feature-level permission slugs.
-- ============================================================================
CREATE TABLE IF NOT EXISTS `hc_permissions` (
  `id`          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `perm_key`    VARCHAR(100) NOT NULL UNIQUE COMMENT 'e.g. read:ehr, dispatch:ambulance',
  `perm_label`  VARCHAR(150) NOT NULL,
  `category`    VARCHAR(50)  NOT NULL COMMENT 'Group: clinical, admin, field, emergency, etc.',
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- TABLE: hc_role_permissions
-- M:N pivot — which permissions each system role has access to.
-- ============================================================================
CREATE TABLE IF NOT EXISTS `hc_role_permissions` (
  `role_id`       TINYINT UNSIGNED NOT NULL,
  `permission_id` SMALLINT UNSIGNED NOT NULL,

  PRIMARY KEY (`role_id`, `permission_id`),

  CONSTRAINT `fk_rp_role`
    FOREIGN KEY (`role_id`) REFERENCES `hc_system_roles` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT `fk_rp_permission`
    FOREIGN KEY (`permission_id`) REFERENCES `hc_permissions` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ALTER hc_users — add system_role column
-- ============================================================================
ALTER TABLE `hc_users`
  ADD COLUMN IF NOT EXISTS `system_role` VARCHAR(50) NOT NULL DEFAULT 'ROLE_USER_PATIENT'
    COMMENT 'JWT claim: maps to hc_system_roles.role_key',
  ADD COLUMN IF NOT EXISTS `facility_id`  INT UNSIGNED NULL
    COMMENT 'FK to future hc_facilities table',
  ADD INDEX IF NOT EXISTS `idx_system_role` (`system_role`);

-- ============================================================================
-- SEED: hc_system_roles (7 platform roles)
-- ============================================================================
INSERT IGNORE INTO `hc_system_roles`
  (`id`, `role_key`, `role_label`, `dashboard_path`, `color_hex`, `icon`, `priority`)
VALUES
  (1, 'ROLE_SUPER_ADMIN',     'Super Administrator',         '/dashboard/super-admin',    '#7C3AED', '🔐', 1),
  (2, 'ROLE_HOSPITAL_ADMIN',  'Hospital / Enterprise Admin', '/dashboard/hospital-admin', '#1D4ED8', '🏥', 2),
  (3, 'ROLE_DOCTOR',          'Primary Clinical Practitioner','/dashboard/clinical',      '#0891B2', '🩺', 3),
  (4, 'ROLE_ALLIED_HEALTH',   'Allied Health & Therapy',     '/dashboard/allied',         '#059669', '🧘', 4),
  (5, 'ROLE_ASHA_NGO',        'Community & Field Worker',    '/dashboard/field',          '#D97706', '🌾', 5),
  (6, 'ROLE_EMERGENCY',       'Emergency Response',          '/dashboard/emergency',      '#DC2626', '🚨', 6),
  (7, 'ROLE_USER_PATIENT',    'Patient / Family Network',    '/dashboard/patient',        '#E07A5F', '💖', 7);

-- ============================================================================
-- SEED: hc_permissions (Feature-level permission atoms)
-- ============================================================================
INSERT IGNORE INTO `hc_permissions` (`perm_key`, `perm_label`, `category`) VALUES
  -- Super Admin
  ('manage:system',           'Full system management',               'admin'),
  ('view:audit_log',          'View audit logs',                      'admin'),
  ('manage:users_global',     'Global user management',               'admin'),
  ('verify:hospitals',        'Hospital registration verification',   'admin'),
  ('view:system_metrics',     'System telemetry & metrics',           'admin'),
  -- Hospital Admin
  ('manage:staff',            'Staff onboarding & deactivation',      'admin'),
  ('manage:assignments',      'Doctor-patient assignment matrix',      'clinical'),
  ('view:bed_capacity',       'Bed & ICU capacity tracker',           'clinical'),
  ('view:facility_analytics', 'Facility-level analytics',             'admin'),
  -- Clinical / Doctor
  ('access:teleconsult',      'Tele-consultation console (WebRTC)',    'clinical'),
  ('view:patient_queue',      'Patient queue calendar',               'clinical'),
  ('view:vitals_live',        'Live wearable vitals side-drawer',     'clinical'),
  ('read:ehr',                'Electronic health records (EHR)',       'clinical'),
  ('write:prescription',      'e-Prescription generator',             'clinical'),
  -- Allied Health
  ('write:diet_plan',         'Trimester diet builder',               'allied'),
  ('write:mental_health',     'Prenatal mental health tracker',       'allied'),
  ('access:patient_chat',     'Async patient chat',                   'allied'),
  ('manage:webinars',         'Group support webinar scheduler',      'allied'),
  -- Field / ASHA
  ('access:field_registry',   'Low-bandwidth/offline field registry', 'field'),
  ('log:home_visit',          'Home visit logger',                    'field'),
  ('view:welfare_schemes',    'Government welfare scheme tracker',    'field'),
  ('dispatch:referral',       'Emergency hospital referral dispatch', 'field'),
  -- Emergency
  ('view:sos_feed',           'Real-time SOS feed',                   'emergency'),
  ('dispatch:ambulance',      'GPS ambulance dispatch tracking',      'emergency'),
  ('read:rapid_card',         'Patient emergency rapid card access',  'emergency'),
  -- Patient / Partner
  ('log:symptoms',            'Mother symptom & vitals hub',          'patient'),
  ('view:partner_guide',      'Partner action guides',                'patient'),
  ('view:appointments',       'Appointment tracker',                  'patient'),
  ('access:care_chat',        'Care team chat',                       'patient');

-- ============================================================================
-- SEED: hc_role_permissions (M:N role → permission mappings)
-- ============================================================================
INSERT IGNORE INTO `hc_role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `hc_system_roles` r, `hc_permissions` p
WHERE
  -- ROLE_SUPER_ADMIN (1) — ALL permissions
  (r.role_key = 'ROLE_SUPER_ADMIN')
  -- ROLE_HOSPITAL_ADMIN (2)
  OR (r.role_key = 'ROLE_HOSPITAL_ADMIN' AND p.perm_key IN (
    'manage:staff','manage:assignments','view:bed_capacity','view:facility_analytics',
    'view:audit_log','view:system_metrics'))
  -- ROLE_DOCTOR (3)
  OR (r.role_key = 'ROLE_DOCTOR' AND p.perm_key IN (
    'access:teleconsult','view:patient_queue','view:vitals_live','read:ehr','write:prescription'))
  -- ROLE_ALLIED_HEALTH (4)
  OR (r.role_key = 'ROLE_ALLIED_HEALTH' AND p.perm_key IN (
    'write:diet_plan','write:mental_health','access:patient_chat','manage:webinars'))
  -- ROLE_ASHA_NGO (5)
  OR (r.role_key = 'ROLE_ASHA_NGO' AND p.perm_key IN (
    'access:field_registry','log:home_visit','view:welfare_schemes','dispatch:referral'))
  -- ROLE_EMERGENCY (6)
  OR (r.role_key = 'ROLE_EMERGENCY' AND p.perm_key IN (
    'view:sos_feed','dispatch:ambulance','read:rapid_card'))
  -- ROLE_USER_PATIENT (7)
  OR (r.role_key = 'ROLE_USER_PATIENT' AND p.perm_key IN (
    'log:symptoms','view:partner_guide','view:appointments','access:care_chat'));
