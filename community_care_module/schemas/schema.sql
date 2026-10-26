-- ============================================================================
-- MAACARE / BELLYBAND: COLLABORATIVE COMMUNITY & CARE TEAM MODULE
-- Relational Schema: PostgreSQL / MySQL 8.0+
-- Compliance: DISHA (India) / HIPAA (US) Data Isolation & Audit Standard
-- ============================================================================

-- 1. EXTENSIONS & ENUMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Role Definitions
CREATE TYPE user_role_type AS ENUM (
    'pregnant_mother',
    'partner',
    'gynecologist',
    'nutritionist',
    'asha_worker',
    'hospital_admin',
    'emergency_dispatcher'
);

-- Channel Types
CREATE TYPE channel_type AS ENUM (
    'peer_support_forum',      -- Public / Moderated Community Forum
    'verified_expert_qa',      -- Group Q&A led by Clinicians/Dietitians
    'assigned_care_team',      -- Private multi-disciplinary clinical channel
    'direct_consultation',     -- 1-on-1 Doctor-Patient or ASHA-Patient
    'emergency_triage'         -- High-priority auto-bridged channel
);

-- Tele-Consultation Statuses
CREATE TYPE consult_status AS ENUM (
    'scheduled',
    'waiting_room',
    'in_progress',
    'completed',
    'cancelled',
    'escalated_to_sos'
);

-- SOS Emergency Escalation States
CREATE TYPE sos_state AS ENUM (
    'triggered',
    'partner_notified',
    'doctor_bridged',
    'ambulance_dispatched',
    'hospital_bed_reserved',
    'resolved'
);

-- ----------------------------------------------------------------------------
-- 2. USERS & EXTENDED CLINICAL ROLES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS care_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(191) UNIQUE NOT NULL,
    phone_e164 VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role_type NOT NULL,
    
    -- Verification details for clinical & community workers
    medical_license_number VARCHAR(100) NULL,
    registration_council VARCHAR(150) NULL,
    is_verified_badge BOOLEAN NOT NULL DEFAULT FALSE,
    assigned_hospital_id UUID NULL,
    
    -- Mother-specific metadata
    gestational_week SMALLINT NULL CHECK (gestational_week BETWEEN 1 AND 45),
    expected_delivery_date DATE NULL,
    primary_language VARCHAR(10) NOT NULL DEFAULT 'en', -- en, hi, bn, te, ta, kn
    
    -- Security & Encryption keys
    public_key_pem TEXT NULL, -- RSA-4096 / Curve25519 E2EE Public Key
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_active_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_care_users_role ON care_users(role);
CREATE INDEX idx_care_users_phone ON care_users(phone_e164);

-- ----------------------------------------------------------------------------
-- 3. MULTI-DISCIPLINARY CARE TEAMS
-- Bridges Mother -> Partner -> Gynecologist -> Nutritionist -> ASHA Worker
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS care_teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mother_user_id UUID NOT NULL REFERENCES care_users(id) ON DELETE CASCADE,
    partner_user_id UUID NULL REFERENCES care_users(id) ON DELETE SET NULL,
    primary_gynecologist_id UUID NOT NULL REFERENCES care_users(id),
    primary_nutritionist_id UUID NULL REFERENCES care_users(id),
    assigned_asha_worker_id UUID NULL REFERENCES care_users(id),
    hospital_id UUID NULL,
    
    risk_level VARCHAR(20) NOT NULL DEFAULT 'low', -- 'low', 'moderate', 'high_risk'
    clinical_notes_encrypted BYTEA NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uk_mother_care_team UNIQUE (mother_user_id)
);

CREATE INDEX idx_care_teams_gyn ON care_teams(primary_gynecologist_id);
CREATE INDEX idx_care_teams_asha ON care_teams(assigned_asha_worker_id);

-- ----------------------------------------------------------------------------
-- 4. COMMUNICATION CHANNELS & ACCESS CONTROL
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comm_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_type channel_type NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    
    care_team_id UUID NULL REFERENCES care_teams(id) ON DELETE CASCADE,
    is_encrypted BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES care_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS channel_memberships (
    channel_id UUID NOT NULL REFERENCES comm_channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES care_users(id) ON DELETE CASCADE,
    role_in_channel VARCHAR(50) NOT NULL DEFAULT 'member', -- 'owner', 'moderator', 'clinician', 'member'
    muted_until TIMESTAMPTZ NULL,
    last_read_message_id UUID NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (channel_id, user_id)
);

-- ----------------------------------------------------------------------------
-- 5. MESSAGES, VOICE NOTES & CLINICAL ATTACHMENTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS channel_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL REFERENCES comm_channels(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES care_users(id),
    
    -- E2EE Payload or Plaintext for Public Forums
    message_type VARCHAR(20) NOT NULL DEFAULT 'text', -- 'text', 'audio_voice_note', 'image_report', 'prescription_pdf', 'vital_alert'
    encrypted_payload TEXT NOT NULL,                  -- AES-256 encrypted payload or ciphertext
    iv_nonce VARCHAR(64) NULL,                       -- Initialization vector
    
    -- Attachment Metadata (Stored securely in S3/Blob storage with signed URLs)
    attachment_url VARCHAR(500) NULL,
    attachment_mime_type VARCHAR(100) NULL,
    attachment_size_bytes BIGINT NULL,
    duration_seconds SMALLINT NULL,                   -- For voice notes
    
    -- Auto-Translation Caches (Regional support)
    original_language VARCHAR(10) NOT NULL DEFAULT 'en',
    translation_json JSONB NULL,                      -- e.g. {"hi": "...", "bn": "..."}
    
    is_clinical_record BOOLEAN NOT NULL DEFAULT FALSE, -- Flag for electronic health record audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_channel_time ON channel_messages(channel_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 6. TELE-CONSULTATION SESSIONS (LiveKit / Agora WebRTC)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tele_consult_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_name VARCHAR(120) UNIQUE NOT NULL,           -- Unique WebRTC room identifier
    care_team_id UUID NOT NULL REFERENCES care_teams(id),
    mother_id UUID NOT NULL REFERENCES care_users(id),
    clinician_id UUID NOT NULL REFERENCES care_users(id),
    
    status consult_status NOT NULL DEFAULT 'scheduled',
    scheduled_start TIMESTAMPTZ NOT NULL,
    actual_start TIMESTAMPTZ NULL,
    actual_end TIMESTAMPTZ NULL,
    
    -- Low-Bandwidth Network Optimization Metrics (2G/3G tracking)
    average_bitrate_kbps INT NULL,
    packet_loss_percentage NUMERIC(5,2) NULL,
    network_quality_score SMALLINT NULL CHECK (network_quality_score BETWEEN 1 AND 5),
    
    -- Digital Clinical Output
    clinical_summary_encrypted TEXT NULL,
    prescription_id UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_consults_clinician ON tele_consult_sessions(clinician_id, scheduled_start);

-- ----------------------------------------------------------------------------
-- 7. REAL-TIME BLE VITALS STREAMING & CLINICAL AUDIT LOG
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patient_vitals_telemetry (
    id BIGSERIAL PRIMARY KEY,
    mother_id UUID NOT NULL REFERENCES care_users(id) ON DELETE CASCADE,
    session_id UUID NULL REFERENCES tele_consult_sessions(id),
    
    systolic_bp SMALLINT NULL,                        -- mmHg
    diastolic_bp SMALLINT NULL,                       -- mmHg
    heart_rate_bpm SMALLINT NULL,
    fetal_heart_rate_bpm SMALLINT NULL,               -- Doppler telemetry
    blood_glucose_mg_dl NUMERIC(5,2) NULL,
    spo2_percentage NUMERIC(4,1) NULL,
    temperature_fahrenheit NUMERIC(4,1) NULL,
    
    is_abnormal_alert BOOLEAN NOT NULL DEFAULT FALSE,
    source_device_ble_id VARCHAR(100) NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vitals_mother_time ON patient_vitals_telemetry(mother_id, recorded_at DESC);

-- ----------------------------------------------------------------------------
-- 8. EMERGENCY SOS TRIAGE & ESCALATION STATE MACHINE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS emergency_sos_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mother_id UUID NOT NULL REFERENCES care_users(id),
    care_team_id UUID NOT NULL REFERENCES care_teams(id),
    
    current_state sos_state NOT NULL DEFAULT 'triggered',
    trigger_latitude NUMERIC(10,7) NOT NULL,
    trigger_longitude NUMERIC(10,7) NOT NULL,
    geo_address TEXT NULL,
    
    -- Escalation Call Bridge Room
    emergency_webrtc_room VARCHAR(120) NOT NULL,
    
    -- Audit Timestamps for Multi-Party Auto-Bridging
    partner_bridged_at TIMESTAMPTZ NULL,
    doctor_bridged_at TIMESTAMPTZ NULL,
    hospital_notified_at TIMESTAMPTZ NULL,
    ambulance_assigned_at TIMESTAMPTZ NULL,
    resolved_at TIMESTAMPTZ NULL,
    
    triage_notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sos_status ON emergency_sos_events(current_state);
