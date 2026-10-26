// ============================================================================
// File: src/utils/systemRole.ts
// Maps DB department/role IDs to platform RBAC roles (ROLE_DOCTOR, etc.)
// ============================================================================

import { UserRole } from '../models/rbac.model';

/**
 * mapSystemRole
 * The database uses `department_id` and `role_id` (hc_departments/hc_roles).
 * The dashboard uses higher-level RBAC roles.
 *
 * NOTE:
 * - Dept 1–4 map 1:1 to staff dashboards.
 * - Dept 5 is "Personal Care Network" which includes both patients and partners.
 */
export function mapSystemRole(deptId: number, roleId: number): UserRole {
  switch (deptId) {
    case 1: return UserRole.DOCTOR;
    case 2: return UserRole.ALLIED_HEALTH;
    case 3: return UserRole.ASHA_NGO;
    case 4: return UserRole.EMERGENCY;
    case 5:
      // 15 = Expectant Mother, 16 = Partner, 17 = Caregiver
      if ([16, 17].includes(roleId)) return UserRole.USER_PARTNER;
      return UserRole.USER_PATIENT;
    default:
      return UserRole.USER_PATIENT;
  }
}

