// ============================================================================
// File: src/controllers/auth.controller.ts
// POST /api/v1/auth/register  — multi-role healthcare registration
// POST /api/v1/auth/login     — credential validation + JWT issuance
// ============================================================================

import { Request, Response } from 'express';
import bcrypt   from 'bcrypt';
import jwt      from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto   from 'crypto';
import pool     from '../config/db.config';
import {
  HcUser, RegisterBody, LoginBody, JwtPayload, VerificationStatus,
} from '../models/user.model';
import { mapSystemRole } from '../utils/systemRole';
import { UserRole, isValidRole } from '../models/rbac.model';

// ── Constants ─────────────────────────────────────────────────────────────────
const JWT_SECRET          = process.env.JWT_SECRET          || 'CHANGE_ME_IN_PRODUCTION_MIN_64_CHARS';
const JWT_ACCESS_EXPIRES  = process.env.JWT_ACCESS_EXPIRES  || '15m';   // 15 minutes
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '7d';    // 7 days
const BCRYPT_ROUNDS       = 12; // HIPAA-compliant cost factor
const MAX_LOGIN_ATTEMPTS  = 5;
const LOCKOUT_MINUTES     = 15;

// Departments 1–4 require professional license verification
const LICENSE_REQUIRED_DEPT_IDS = [1, 2, 3, 4];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Generates a short-lived JWT access token (15 min) */
function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRES } as jwt.SignOptions);
}

/** Writes an audit record for every auth action */
async function writeAudit(
  userId: number | null,
  action: string,
  req: Request,
  meta: Record<string, unknown> = {},
): Promise<void> {
  await pool.execute(
    'INSERT INTO hc_audit_log (user_id, action, ip_address, user_agent, meta) VALUES (?, ?, ?, ?, ?)',
    [userId, action, req.ip || null, req.headers['user-agent']?.substring(0, 500) ?? null, JSON.stringify(meta)],
  );
}

// ── POST /api/v1/auth/register ────────────────────────────────────────────────
export async function register(req: Request, res: Response): Promise<void> {
  const body = req.body as RegisterBody;

  const {
    full_name, email, phone, emergency_contact,
    department_id, role_id, facility_name,
    license_number, licensing_body,
    password, two_fa_enabled = 0, two_fa_method = null,
  } = body;

  // ── Input Validation ────────────────────────────────────────────────────────
  const errors: string[] = [];

  if (!full_name || full_name.trim().length < 2)
    errors.push('Full name must be at least 2 characters.');

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRe.test(email.trim()))
    errors.push('A valid email address is required.');

  const phoneRe = /^\+?[0-9]{10,15}$/;
  if (!phone || !phoneRe.test(phone.trim().replace(/\s/g, '')))
    errors.push('A valid phone number (10–15 digits) is required.');

  if (!emergency_contact)
    errors.push('Emergency contact number is required.');

  const deptId = parseInt(String(department_id), 10);
  if (!deptId || deptId < 1 || deptId > 5)
    errors.push('Please select a valid department (1–5).');

  const roleId = parseInt(String(role_id), 10);
  if (!roleId || roleId < 1)
    errors.push('Please select a valid role.');

  if (!facility_name?.trim())
    errors.push('Facility / hospital / NGO name is required.');

  // Password: ≥12 chars, upper, lower, digit, symbol
  const pwdRe = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,}$/;
  if (!password || !pwdRe.test(password))
    errors.push('Password must be ≥12 chars with upper, lower, number and symbol.');

  const requiresLicense = LICENSE_REQUIRED_DEPT_IDS.includes(deptId);
  if (requiresLicense) {
    if (!license_number?.trim()) errors.push('Medical license / registration number is required for clinical roles.');
    if (!licensing_body?.trim()) errors.push('Licensing body name is required for clinical roles.');
  }

  if (errors.length > 0) {
    res.status(400).json({ success: false, message: errors.join(' ') });
    return;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // ── Duplicate email check ────────────────────────────────────────────────
    const [emailRows] = await conn.execute<any[]>(
      'SELECT id FROM hc_users WHERE email = ? LIMIT 1',
      [email.trim().toLowerCase()],
    );
    if (emailRows.length > 0) {
      res.status(409).json({
        success: false,
        message: 'An account with this email already exists. Please login instead.',
      });
      conn.release();
      return;
    }

    // ── Duplicate phone check ────────────────────────────────────────────────
    const [phoneRows] = await conn.execute<any[]>(
      'SELECT id FROM hc_users WHERE phone = ? LIMIT 1',
      [phone.trim()],
    );
    if (phoneRows.length > 0) {
      res.status(409).json({
        success: false,
        message: 'This phone number is already registered.',
      });
      conn.release();
      return;
    }

    // ── Hash password ────────────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // ── Determine verification status ────────────────────────────────────────
    // Personal Care Network (dept 5) → immediately active
    const verStatus: VerificationStatus = (deptId === 5) ? 'active' : 'pending_verification';

    // ── Insert user ──────────────────────────────────────────────────────────
    const [result] = await conn.execute<any>(
      `INSERT INTO hc_users
        (full_name, email, phone, phone_verified, emergency_contact,
         department_id, role_id, facility_name,
         license_number, licensing_body,
         password_hash, two_fa_enabled, two_fa_method,
         verification_status)
       VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        full_name.trim(), email.trim().toLowerCase(), phone.trim(), emergency_contact.trim(),
        deptId, roleId, facility_name.trim(),
        license_number?.trim() || null, licensing_body?.trim() || null,
        passwordHash, two_fa_enabled ? 1 : 0, two_fa_method || null,
        verStatus,
      ],
    );

    const newUserId: number = result.insertId;

    // ── Add to verification queue for clinical departments ───────────────────
    if (requiresLicense && license_number && licensing_body) {
      await conn.execute(
        `INSERT INTO hc_verification_queue
           (user_id, license_number, licensing_body, doc_path, status)
         VALUES (?, ?, ?, ?, 'pending')`,
        [newUserId, license_number.trim(), licensing_body.trim(), 'pending_upload'],
      );
    }

    await conn.commit();
    conn.release();

    // ── Audit log ────────────────────────────────────────────────────────────
    await writeAudit(newUserId, 'REGISTER', req, { deptId, roleId, status: verStatus });

    // ── Issue tokens for immediately active users ─────────────────────────────
    if (verStatus === 'active') {
      const userRole = mapSystemRole(deptId, roleId);
      const jwtPayload: JwtPayload = {
        sub: newUserId, email: email.toLowerCase(), deptId, roleId, status: verStatus,
      };
      // Attach dashboard RBAC role into the token for downstream role-gated APIs
      (jwtPayload as JwtPayload & { userRole: string }).userRole = userRole;
      const accessToken = signAccessToken(jwtPayload);

      res.status(201).json({
        success: true,
        message: 'Registration successful! Welcome to BellyBand Healthcare.',
        accessToken,
        user: { id: newUserId, name: full_name.trim(), email, status: verStatus },
      });
    } else {
      res.status(201).json({
        success: true,
        message:
          'Registration submitted. Your credentials are under review. ' +
          'You will be notified by email within 24–48 hours once verified.',
        user: { id: newUserId, name: full_name.trim(), email, status: verStatus },
      });
    }

  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('[HC Register API Error]', err);
      const accessToken = signAccessToken(jwtPayload);

      res.status(201).json({
        success: true,
        message: 'Registration successful! Welcome to BellyBand Healthcare.',
        accessToken,
        user: { id: newUserId, name: full_name.trim(), email, status: verStatus },
      });
    } else {
      res.status(201).json({
        success: true,
        message:
          'Registration submitted. Your credentials are under review. ' +
          'You will be notified by email within 24–48 hours once verified.',
        user: { id: newUserId, name: full_name.trim(), email, status: verStatus },
      });
    }

  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('[HC Register API Error]', err);
    res.status(500).json({ success: false, message: 'Server error during registration. Please try again.' });
  }
}

// ── POST /api/v1/auth/login ───────────────────────────────────────────────────
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as LoginBody;

  // ── Basic Validation ────────────────────────────────────────────────────────
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRe.test(email.trim())) {
    res.status(400).json({ success: false, message: 'A valid email address is required.' });
    return;
  }
  if (!password) {
    res.status(400).json({ success: false, message: 'Password is required.' });
    return;
  }

  // ── Super Admin Hardcoded Override ──────────────────────────────────────────
  if (email.trim().toLowerCase() === '23prashantpandey@bellyband.co.in' && password === 'ANURAGp23@') {
    const jwtPayload: JwtPayload = {
      sub: 1,
      email: '23prashantpandey@bellyband.co.in',
      deptId: 1,
      roleId: 1,
      status: 'verified',
    };
    (jwtPayload as any).userRole = 'ROLE_SUPER_ADMIN';
    (jwtPayload as any).user_role = 'ROLE_SUPER_ADMIN';
    const accessToken = signAccessToken(jwtPayload);

    res.json({
      success: true,
      message: 'Super Admin login authorized.',
      user_role: 'ROLE_SUPER_ADMIN',
      accessToken,
      redirect: '/dashboard/super-admin',
      user: {
        id: 1,
        name: 'Prashant Pandey',
        email: '23prashantpandey@bellyband.co.in',
        dept: 'Platform Engineering & Governance',
        role: 'Platform Owner & Super Admin',
        system_role: 'ROLE_SUPER_ADMIN',
        status: 'verified',
      },
    });
    return;
  }

  try {
    // ── Fetch user ────────────────────────────────────────────────────────────
    // `system_role` is optional (for admin overrides). We keep a fallback for older DBs.
    let rows: any[] = [];
    try {
      const [r] = await pool.execute<any[]>(`
        SELECT
          u.id, u.full_name, u.password_hash, u.verification_status,
          u.login_attempt_count, u.locked_until,
          u.department_id, u.role_id, u.two_fa_enabled, u.two_fa_method,
          u.system_role,
          d.dept_name, r.role_name
        FROM hc_users u
        JOIN hc_departments d ON d.id = u.department_id
        JOIN hc_roles r       ON r.id = u.role_id
        WHERE u.email = ?
        LIMIT 1
      `, [email.trim().toLowerCase()]);
      rows = r as any[];
    } catch (err: any) {
      if (err?.code === 'ER_BAD_FIELD_ERROR') {
        const [r] = await pool.execute<any[]>(`
          SELECT
            u.id, u.full_name, u.password_hash, u.verification_status,
            u.login_attempt_count, u.locked_until,
            u.department_id, u.role_id, u.two_fa_enabled, u.two_fa_method,
            d.dept_name, r.role_name
          FROM hc_users u
          JOIN hc_departments d ON d.id = u.department_id
          JOIN hc_roles r       ON r.id = u.role_id
          WHERE u.email = ?
          LIMIT 1
        `, [email.trim().toLowerCase()]);
        rows = r as any[];
      } else {
        throw err;
      }
    }

    const user = rows[0] as HcUser | undefined;

    // ── User Not Found ────────────────────────────────────────────────────────
    if (!user) {
      await writeAudit(null, 'LOGIN_FAIL', req, { reason: 'user_not_found', email });
      // Same message to prevent email enumeration
      res.status(401).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    // ── Lockout Check ─────────────────────────────────────────────────────────
    if (user.locked_until && new Date() < new Date(user.locked_until)) {
      const until = new Date(user.locked_until).toLocaleTimeString();
      await writeAudit(user.id, 'LOGIN_BLOCKED', req, { reason: 'account_locked' });
      res.status(429).json({
        success: false,
        message: `Account locked due to too many failed attempts. Try again after ${until}.`,
      });
      return;
    }

    // ── Password Check ────────────────────────────────────────────────────────
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      const newAttempts = (user.login_attempt_count || 0) + 1;
      let lockedUntil: string | null = null;

      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        const lockDate = new Date();
        lockDate.setMinutes(lockDate.getMinutes() + LOCKOUT_MINUTES);
        lockedUntil = lockDate.toISOString().slice(0, 19).replace('T', ' ');
      }

      await pool.execute(
        'UPDATE hc_users SET login_attempt_count = ?, locked_until = ? WHERE id = ?',
        [newAttempts >= MAX_LOGIN_ATTEMPTS ? 0 : newAttempts, lockedUntil, user.id],
      );

      await writeAudit(user.id, 'LOGIN_FAIL', req, { reason: 'wrong_password', attempts: newAttempts });

      const lockMsg = lockedUntil ? ` Account locked for ${LOCKOUT_MINUTES} minutes.` : '';
      res.status(401).json({ success: false, message: `Invalid email or password.${lockMsg}` });
      return;
    }

    // ── Status Gate ───────────────────────────────────────────────────────────
    const blockedStatuses: Record<string, string> = {
      pending_verification: 'Your account is pending verification. You will be notified within 24–48 hours.',
      rejected:             'Your account verification was unsuccessful. Contact support@bellyband.health.',
      suspended:            'Your account has been suspended. Contact the healthcare administrator.',
    };

    const status = user.verification_status as VerificationStatus;
    if (blockedStatuses[status]) {
      await writeAudit(user.id, 'LOGIN_BLOCKED', req, { reason: status });
      res.status(403).json({ success: false, message: blockedStatuses[status] });
      return;
    }

    // ── Reset brute-force counter & update last login ─────────────────────────
    await pool.execute(
      'UPDATE hc_users SET login_attempt_count = 0, locked_until = NULL, last_login_at = NOW() WHERE id = ?',
      [user.id],
    );

    // ── Determine platform RBAC role ──────────────────────────────────────────
    const systemRoleRaw = (user as any)?.system_role as string | null | undefined;
    const mappedRole    = mapSystemRole(user.department_id, user.role_id);
    const userRole: UserRole = (systemRoleRaw && isValidRole(systemRoleRaw))
      ? (systemRoleRaw as UserRole)
      : (mappedRole as UserRole);

    // ── Issue JWT access token (15 min) ───────────────────────────────────────
    const jwtPayload: JwtPayload = {
      sub:    user.id,
      email:  email.toLowerCase(),
      deptId: user.department_id,
      roleId: user.role_id,
      status,
    };
    (jwtPayload as JwtPayload & { userRole: string }).userRole = userRole;
    const accessToken = signAccessToken(jwtPayload);

    // ── Issue refresh token (7 days) stored as SHA-256 hash in DB ────────────
    const rawRefreshToken  = uuidv4() + '-' + uuidv4();
    const refreshTokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    const expiresAt        = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await pool.execute(
      'INSERT INTO hc_refresh_tokens (user_id, token_hash, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)',
      [user.id, refreshTokenHash, req.ip || null, req.headers['user-agent']?.substring(0, 500) ?? null,
    const accessToken = signAccessToken(jwtPayload);

    // ── Issue refresh token (7 days) stored as SHA-256 hash in DB ────────────
    const rawRefreshToken  = uuidv4() + '-' + uuidv4();
    const refreshTokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    const expiresAt        = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await pool.execute(
      'INSERT INTO hc_refresh_tokens (user_id, token_hash, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)',
      [user.id, refreshTokenHash, req.ip || null, req.headers['user-agent']?.substring(0, 500) ?? null,
       expiresAt.toISOString().slice(0, 19).replace('T', ' ')],
    );

    await writeAudit(user.id, 'LOGIN_SUCCESS', req, { deptId: user.department_id, roleId: user.role_id });

    // Set refresh token as HttpOnly cookie (production: add Secure + SameSite)
    res.cookie('hc_refresh_token', rawRefreshToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days in ms
    });

    const roleRedirectMap: Record<string, string> = {
      'ROLE_SUPER_ADMIN':    '/dashboard/super-admin',
      'ROLE_HOSPITAL_ADMIN': '/dashboard/hospital-admin',
      'ROLE_DOCTOR':         '/dashboard/clinical',
      'ROLE_ALLIED_HEALTH':  '/dashboard/allied',
      'ROLE_ASHA_NGO':       '/dashboard/field',
      'ROLE_EMERGENCY':      '/dashboard/emergency',
    };
    const redirect = roleRedirectMap[userRole] || '/dashboard/clinical';

    res.json({
      success:     true,
      message:     `Welcome back, ${user.full_name}!`,
      user_role:   userRole,
      accessToken,
      redirect,
      user: {
        id:          user.id,
        name:        user.full_name,
        email:       email,
        dept:        user.dept_name,
        role:        user.role_name,
        system_role: userRole,
        status,
      },
    });

  } catch (err) {
    console.error('[HC Login API Error]', err);
    res.status(500).json({ success: false, message: 'Server error during login. Please try again.' });
  }
}
