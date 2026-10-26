// ============================================================================
// File: src/models/rbac.model.ts
// MaaCare RBAC — Role constants, permission maps, dashboard routing table
// ============================================================================

// ── User Roles (7 platform roles) ───────────────────────────────────────────
export const UserRole = {
  SUPER_ADMIN:    'ROLE_SUPER_ADMIN',
  HOSPITAL_ADMIN: 'ROLE_HOSPITAL_ADMIN',
  DOCTOR:         'ROLE_DOCTOR',
  ALLIED_HEALTH:  'ROLE_ALLIED_HEALTH',
  ASHA_NGO:       'ROLE_ASHA_NGO',
  EMERGENCY:      'ROLE_EMERGENCY',
  USER_PATIENT:   'ROLE_USER_PATIENT',
  USER_PARTNER:   'ROLE_USER_PARTNER',
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

// ── Permission slugs ─────────────────────────────────────────────────────────
export type Permission =
  | 'manage:system'
  | 'view:audit_log'
  | 'manage:users_global'
  | 'verify:hospitals'
  | 'view:system_metrics'
  | 'manage:staff'
  | 'manage:assignments'
  | 'view:bed_capacity'
  | 'view:facility_analytics'
  | 'access:teleconsult'
  | 'view:patient_queue'
  | 'view:vitals_live'
  | 'read:ehr'
  | 'write:prescription'
  | 'write:diet_plan'
  | 'write:mental_health'
  | 'access:patient_chat'
  | 'manage:webinars'
  | 'access:field_registry'
  | 'log:home_visit'
  | 'view:welfare_schemes'
  | 'dispatch:referral'
  | 'view:sos_feed'
  | 'dispatch:ambulance'
  | 'read:rapid_card'
  | 'log:symptoms'
  | 'view:partner_guide'
  | 'view:appointments'
  | 'access:care_chat';

// ── Role → Dashboard path map ────────────────────────────────────────────────
export const ROLE_DASHBOARD_MAP: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]:    '/dashboard/super-admin',
  [UserRole.HOSPITAL_ADMIN]: '/dashboard/hospital-admin',
  [UserRole.DOCTOR]:         '/dashboard/clinical',
  [UserRole.ALLIED_HEALTH]:  '/dashboard/allied',
  [UserRole.ASHA_NGO]:       '/dashboard/field',
  [UserRole.EMERGENCY]:      '/dashboard/emergency',
  [UserRole.USER_PATIENT]:   '/dashboard/patient',
  [UserRole.USER_PARTNER]:   '/dashboard/patient',
};

// ── Role → Permissions map ───────────────────────────────────────────────────
export const ROLE_PERMISSIONS_MAP: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: [
    'manage:system', 'view:audit_log', 'manage:users_global',
    'verify:hospitals', 'view:system_metrics',
    'manage:staff', 'manage:assignments', 'view:bed_capacity', 'view:facility_analytics',
    'access:teleconsult', 'view:patient_queue', 'view:vitals_live', 'read:ehr', 'write:prescription',
    'write:diet_plan', 'write:mental_health', 'access:patient_chat', 'manage:webinars',
    'access:field_registry', 'log:home_visit', 'view:welfare_schemes', 'dispatch:referral',
    'view:sos_feed', 'dispatch:ambulance', 'read:rapid_card',
    'log:symptoms', 'view:partner_guide', 'view:appointments', 'access:care_chat',
  ],
  [UserRole.HOSPITAL_ADMIN]: [
    'manage:staff', 'manage:assignments', 'view:bed_capacity',
    'view:facility_analytics', 'view:audit_log', 'view:system_metrics',
  ],
  [UserRole.DOCTOR]: [
    'access:teleconsult', 'view:patient_queue', 'view:vitals_live',
    'read:ehr', 'write:prescription',
  ],
  [UserRole.ALLIED_HEALTH]: [
    'write:diet_plan', 'write:mental_health', 'access:patient_chat', 'manage:webinars',
  ],
  [UserRole.ASHA_NGO]: [
    'access:field_registry', 'log:home_visit', 'view:welfare_schemes', 'dispatch:referral',
  ],
  [UserRole.EMERGENCY]: [
    'view:sos_feed', 'dispatch:ambulance', 'read:rapid_card',
  ],
  [UserRole.USER_PATIENT]: [
    'log:symptoms', 'view:partner_guide', 'view:appointments', 'access:care_chat',
  ],
  [UserRole.USER_PARTNER]: [
    'view:partner_guide', 'view:appointments', 'access:care_chat',
  ],
};

// ── Role metadata for UI ─────────────────────────────────────────────────────
export interface RoleMeta {
  label:    string;
  color:    string;
  icon:     string;
  priority: number;
}

export const ROLE_META_MAP: Record<UserRole, RoleMeta> = {
  [UserRole.SUPER_ADMIN]:    { label: 'Super Admin',          color: '#7C3AED', icon: '🔐', priority: 1 },
  [UserRole.HOSPITAL_ADMIN]: { label: 'Hospital Admin',       color: '#1D4ED8', icon: '🏥', priority: 2 },
  [UserRole.DOCTOR]:         { label: 'Clinical Practitioner',color: '#0891B2', icon: '🩺', priority: 3 },
  [UserRole.ALLIED_HEALTH]:  { label: 'Allied Health',        color: '#059669', icon: '🧘', priority: 4 },
  [UserRole.ASHA_NGO]:       { label: 'Field Worker',         color: '#D97706', icon: '🌾', priority: 5 },
  [UserRole.EMERGENCY]:      { label: 'Emergency Response',   color: '#DC2626', icon: '🚨', priority: 6 },
  [UserRole.USER_PATIENT]:   { label: 'Patient',              color: '#E07A5F', icon: '💖', priority: 7 },
  [UserRole.USER_PARTNER]:   { label: 'Partner / Family',     color: '#E07A5F', icon: '👨‍👩‍👧', priority: 7 },
};

// ── Permission check utilities ───────────────────────────────────────────────
export function hasPermission(role: UserRole, perm: Permission): boolean {
  return ROLE_PERMISSIONS_MAP[role]?.includes(perm) ?? false;
}

export function getDashboardPath(role: UserRole): string {
  return ROLE_DASHBOARD_MAP[role] ?? '/dashboard/patient';
}

export function isValidRole(role: string): role is UserRole {
  return Object.values(UserRole).includes(role as UserRole);
}
