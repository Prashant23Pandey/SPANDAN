/**
 * MaaCare Community & Care Team Module - Type Definitions
 */

export type UserRole = 
  | 'pregnant_mother'
  | 'partner'
  | 'gynecologist'
  | 'nutritionist'
  | 'asha_worker'
  | 'hospital_admin'
  | 'emergency_dispatcher';

export type ChannelType = 
  | 'peer_support_forum'
  | 'verified_expert_qa'
  | 'assigned_care_team'
  | 'direct_consultation'
  | 'emergency_triage';

export type ConsultStatus = 
  | 'scheduled'
  | 'waiting_room'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'escalated_to_sos';

export type SOSState = 
  | 'triggered'
  | 'partner_notified'
  | 'doctor_bridged'
  | 'ambulance_dispatched'
  | 'hospital_bed_reserved'
  | 'resolved';

export interface CareUser {
  id: string;
  fullName: string;
  email: string;
  phoneE164: string;
  role: UserRole;
  isVerifiedBadge: boolean;
  medicalLicenseNumber?: string;
  registrationCouncil?: string;
  assignedHospitalId?: string;
  gestationalWeek?: number;
  expectedDeliveryDate?: string;
  primaryLanguage: 'en' | 'hi' | 'bn' | 'te' | 'ta' | 'kn';
  publicKeyPem?: string;
}

export interface PatientVitals {
  motherId: string;
  sessionId?: string;
  systolicBp?: number;
  diastolicBp?: number;
  heartRateBpm?: number;
  fetalHeartRateBpm?: number;
  bloodGlucoseMgDl?: number;
  spo2Percentage?: number;
  temperatureFahrenheit?: number;
  isAbnormalAlert: boolean;
  sourceDeviceBleId?: string;
  recordedAt: string;
}

export interface WebRTCConnectionProfile {
  maxBitrateKbps: number;
  resolution: '240p' | '480p' | '720p';
  simulcast: boolean;
  audioOnlyFallback: boolean;
  adaptivePliIntervalMs: number;
}

export interface ChannelMessagePayload {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  senderBadge: boolean;
  messageType: 'text' | 'audio_voice_note' | 'image_report' | 'prescription_pdf' | 'vital_alert';
  encryptedPayload: string;
  ivNonce?: string;
  attachmentUrl?: string;
  durationSeconds?: number;
  originalLanguage: string;
  translations?: Record<string, string>;
  createdAt: string;
}

export interface SOSEmergencyPayload {
  sosEventId: string;
  motherId: string;
  motherName: string;
  phoneE164: string;
  latitude: number;
  longitude: number;
  geoAddress?: string;
  careTeamId: string;
  webrtcRoom: string;
  state: SOSState;
  escalationSequence: {
    partnerNotifiedAt?: string;
    doctorBridgedAt?: string;
    hospitalNotifiedAt?: string;
    ambulanceAssignedAt?: string;
  };
}
