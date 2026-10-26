// ============================================================================
// File: src/models/user.model.ts
// TypeScript interfaces for the HC user domain
// ============================================================================

/** Raw database row shape from hc_users JOIN */
export interface HcUser {
  id:                  number;
  full_name:           string;
  email:               string;
  phone:               string;
  phone_verified:      number;   // 0 | 1
  emergency_contact:   string | null;
  department_id:       number;
  role_id:             number;
  system_role?:        string | null;
  facility_name:       string | null;
  license_number:      string | null;
  licensing_body:      string | null;
  license_doc_path:    string | null;
  password_hash:       string;
  two_fa_enabled:      number;   // 0 | 1
  two_fa_method:       'sms' | 'authenticator' | null;
  two_fa_secret:       string | null;
  verification_status: VerificationStatus;
  login_attempt_count: number;
  locked_until:        Date | null;
  last_login_at:       Date | null;
  created_at:          Date;
  updated_at:          Date;
  // Joined columns
  dept_name?:          string;
  role_name?:          string;
}

export type VerificationStatus =
  | 'active'
  | 'pending_verification'
  | 'verified'
  | 'rejected'
  | 'suspended';

/** Payload shape stored inside the JWT */
export interface JwtPayload {
  sub:    number;           // user id
  email:  string;
  deptId: number;
  roleId: number;
  status: VerificationStatus;
  iat?:   number;
  exp?:   number;
}

/** Shape returned to client on successful register/login */
export interface AuthResponse {
  success:      boolean;
  message:      string;
  accessToken?: string;
  user?: {
    id:     number;
    name:   string;
    email:  string;
    dept:   string;
    role:   string;
    status: VerificationStatus;
  };
}

/** Registration request body */
export interface RegisterBody {
  full_name:         string;
  email:             string;
  phone:             string;
  emergency_contact: string;
  department_id:     number;
  role_id:           number;
  facility_name:     string;
  license_number?:   string;
  licensing_body?:   string;
  password:          string;
  two_fa_enabled?:   number;
  two_fa_method?:    'sms' | 'authenticator' | null;
}

/** Login request body */
export interface LoginBody {
  email:    string;
  password: string;
}
