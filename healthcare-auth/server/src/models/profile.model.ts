// ============================================================================
// File: src/models/profile.model.ts
// User profile domain models (universal + role-specific + notification prefs)
// ============================================================================

import { UserRole } from './rbac.model';
import { VerificationStatus } from './user.model';

export type TwoFaMethod = 'sms' | 'authenticator' | null;

export interface NotificationPrefs {
  email: boolean;
  sms: boolean;
  criticalOnly: boolean;
}

export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

export interface RoleDataClinical {
  specialty?: string;
  yearsExperience?: number;
  teleAvailability?: { start: string; end: string } | null;
  signaturePath?: string | null;
}

export interface RoleDataAlliedField {
  subSpecialty?: string;
  regions?: string[];
  languages?: string[];
}

export interface RoleDataAdmin {
  adminDesignation?: string;
  escalationContact?: string;
  facilityAccessId?: string | null; // read-only
}

export interface RoleDataPatient {
  bloodGroup?: string;
  primaryDoctorId?: string | null;
  emergencyContacts?: EmergencyContact[];
}

export type RoleData =
  | (RoleDataClinical & Record<string, unknown>)
  | (RoleDataAlliedField & Record<string, unknown>)
  | (RoleDataAdmin & Record<string, unknown>)
  | (RoleDataPatient & Record<string, unknown>)
  | Record<string, unknown>;

export interface UserProfileDTO {
  userId: number;
  userRole: UserRole;
  status: VerificationStatus;
  email: string;
  fullName: string;
  preferredName: string | null;
  gender: string | null;
  pronouns: string | null;
  phone: string;
  avatarPath: string | null;
  twoFaEnabled: boolean;
  twoFaMethod: TwoFaMethod;
  // Staff identity info that may be read-only for verified users
  licenseNumber: string | null;
  facilityName: string | null;
  roleData: RoleData;
  notificationPrefs: NotificationPrefs;
}

export interface PutProfileBody {
  fullName?: string;
  preferredName?: string | null;
  gender?: string | null;
  pronouns?: string | null;
  phone?: string;
  twoFaEnabled?: boolean;
  twoFaMethod?: TwoFaMethod;

  // Media (client-side cropped/compressed, sent as data URL)
  avatarDataUrl?: string | null;    // set null to delete
  signatureDataUrl?: string | null; // set null to delete

  // Role specific
  roleData?: RoleData;

  // Notification prefs
  notificationPrefs?: Partial<NotificationPrefs>;
}

