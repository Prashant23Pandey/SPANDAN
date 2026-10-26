// ============================================================================
// File: src/controllers/user.controller.ts
// Profile + security endpoints for authenticated users
// ============================================================================

import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import pool from '../config/db.config';
import { UserRole } from '../models/rbac.model';
import { JwtPayload } from '../models/user.model';
import { PutProfileBody, UserProfileDTO, NotificationPrefs, RoleData } from '../models/profile.model';
import { isEmail, isPhone, isStrongPassword, safeJsonParse } from '../utils/validation';
import { saveProfileImageDataUrl } from '../utils/mediaStorage';

function getUser(req: Request): (JwtPayload & { userRole?: UserRole }) {
  return (req.hcUser ?? {}) as JwtPayload & { userRole?: UserRole };
}

function normalizeNotificationPrefs(raw: unknown): NotificationPrefs {
  const parsed = safeJsonParse<Partial<NotificationPrefs>>(raw, {});
  return {
    email: !!parsed.email,
    sms: !!parsed.sms,
    criticalOnly: !!parsed.criticalOnly,
  };
}

function sanitizeRoleData(userRole: UserRole, incoming: RoleData | undefined, existing: RoleData): RoleData {
  const next = { ...(existing || {}) } as Record<string, unknown>;
  const inc = (incoming || {}) as Record<string, unknown>;

  const allow = (keys: string[]) => {
    for (const k of keys) {
      if (Object.prototype.hasOwnProperty.call(inc, k)) next[k] = inc[k];
    }
  };

  // Default: allow nothing except known, per-role keys.
  switch (userRole) {
    case UserRole.DOCTOR:
      allow(['specialty', 'yearsExperience', 'teleAvailability', 'signaturePath']);
      break;
    case UserRole.ALLIED_HEALTH:
    case UserRole.ASHA_NGO:
      allow(['subSpecialty', 'regions', 'languages']);
      break;
    case UserRole.SUPER_ADMIN:
    case UserRole.HOSPITAL_ADMIN:
      allow(['adminDesignation', 'escalationContact', 'facilityAccessId']);
      break;
    case UserRole.USER_PATIENT:
    case UserRole.USER_PARTNER:
    default:
      allow(['bloodGroup', 'primaryDoctorId', 'emergencyContacts']);
      break;
  }

  return next;
}

async function ensureProfileRow(userId: number): Promise<void> {
  await pool.execute(
    `INSERT INTO hc_user_profiles (user_id, role_data, notification_prefs)
     VALUES (?, JSON_OBJECT(), JSON_OBJECT())
     ON DUPLICATE KEY UPDATE user_id = user_id`,
    [userId],
  );
}

// ── GET /api/v1/user/profile ─────────────────────────────────────────────────
export async function getProfile(req: Request, res: Response): Promise<void> {
  const user = getUser(req);
  if (!user.sub) {
    res.status(401).json({ success: false, message: 'Unauthorized.' });
    return;
  }
  if (!user.userRole) {
    res.status(400).json({ success: false, message: 'JWT missing userRole; re-login required.' });
    return;
  }

  await ensureProfileRow(user.sub);

  const [rows] = await pool.execute<any[]>(
    `SELECT
        u.id AS user_id,
        u.full_name, u.email, u.phone,
        u.two_fa_enabled, u.two_fa_method,
        u.verification_status, u.license_number, u.facility_name,
        p.preferred_name, p.gender, p.pronouns, p.avatar_path,
        p.role_data, p.notification_prefs
     FROM hc_users u
     LEFT JOIN hc_user_profiles p ON p.user_id = u.id
     WHERE u.id = ?
     LIMIT 1`,
    [user.sub],
  );

  const row = rows[0];
  if (!row) {
    res.status(404).json({ success: false, message: 'User not found.' });
    return;
  }

  const dto: UserProfileDTO = {
    userId: row.user_id,
    userRole: user.userRole,
    status: row.verification_status,
    email: row.email,
    fullName: row.full_name,
    preferredName: row.preferred_name ?? null,
    gender: row.gender ?? null,
    pronouns: row.pronouns ?? null,
    phone: row.phone,
    avatarPath: row.avatar_path ?? null,
    twoFaEnabled: !!row.two_fa_enabled,
    twoFaMethod: row.two_fa_method ?? null,
    licenseNumber: row.license_number ?? null,
    facilityName: row.facility_name ?? null,
    roleData: safeJsonParse<RoleData>(row.role_data, {}),
    notificationPrefs: normalizeNotificationPrefs(row.notification_prefs),
  };

  res.json({ success: true, profile: dto });
}

// ── PUT /api/v1/user/profile ─────────────────────────────────────────────────
export async function putProfile(req: Request, res: Response): Promise<void> {
  const user = getUser(req);
  const body = req.body as PutProfileBody;

  if (!user.sub || !user.userRole) {
    res.status(401).json({ success: false, message: 'Unauthorized.' });
    return;
  }

  // Ensure profile row exists
  await ensureProfileRow(user.sub);

  // Fetch current state
  const [rows] = await pool.execute<any[]>(
    `SELECT
        u.full_name, u.phone, u.two_fa_enabled, u.two_fa_method,
        u.verification_status,
        p.avatar_path, p.role_data, p.notification_prefs
     FROM hc_users u
     LEFT JOIN hc_user_profiles p ON p.user_id = u.id
     WHERE u.id = ?
     LIMIT 1`,
    [user.sub],
  );

  const current = rows[0];
  if (!current) {
    res.status(404).json({ success: false, message: 'User not found.' });
    return;
  }

  const errors: string[] = [];

  if (typeof body.fullName === 'string' && body.fullName.trim().length < 2) {
    errors.push('Full name must be at least 2 characters.');
  }
  if (typeof body.phone === 'string' && !isPhone(body.phone)) {
    errors.push('Phone number must be 10–15 digits (optionally starting with +).');
  }
  if (body.twoFaEnabled === true && body.twoFaMethod && !['sms', 'authenticator'].includes(body.twoFaMethod)) {
    errors.push('Invalid 2FA method.');
  }

  if (errors.length) {
    res.status(400).json({ success: false, message: errors.join(' ') });
    return;
  }

  const existingRoleData = safeJsonParse<RoleData>(current.role_data, {});
  let nextRoleData: RoleData = sanitizeRoleData(user.userRole, body.roleData, existingRoleData);

  // Media updates
  let avatarPath: string | null = current.avatar_path ?? null;

  if (typeof body.avatarDataUrl === 'string' && body.avatarDataUrl.trim()) {
    const saved = await saveProfileImageDataUrl({ dataUrl: body.avatarDataUrl, userId: user.sub, kind: 'avatar' });
    avatarPath = saved.relativePath;
  } else if (body.avatarDataUrl === null) {
    avatarPath = null;
  }

  if (typeof body.signatureDataUrl === 'string' && body.signatureDataUrl.trim()) {
    const saved = await saveProfileImageDataUrl({ dataUrl: body.signatureDataUrl, userId: user.sub, kind: 'signature' });
    // Only store signature for clinical staff
    if (user.userRole === UserRole.DOCTOR) {
      nextRoleData = { ...(nextRoleData || {}), signaturePath: saved.relativePath };
    }
  } else if (body.signatureDataUrl === null) {
    if (user.userRole === UserRole.DOCTOR) {
      const rd = { ...(nextRoleData || {}) } as any;
      rd.signaturePath = null;
      nextRoleData = rd;
    }
  }

  // Notification prefs merge
  const existingPrefs = normalizeNotificationPrefs(current.notification_prefs);
  const nextPrefs: NotificationPrefs = {
    email: body.notificationPrefs?.email ?? existingPrefs.email,
    sms: body.notificationPrefs?.sms ?? existingPrefs.sms,
    criticalOnly: body.notificationPrefs?.criticalOnly ?? existingPrefs.criticalOnly,
  };

  // Persist (single transaction)
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (typeof body.fullName === 'string') {
      await conn.execute('UPDATE hc_users SET full_name = ? WHERE id = ?', [body.fullName.trim(), user.sub]);
    }
    if (typeof body.phone === 'string') {
      await conn.execute('UPDATE hc_users SET phone = ? WHERE id = ?', [body.phone.trim(), user.sub]);
    }

    if (typeof body.twoFaEnabled === 'boolean') {
      const enabled = body.twoFaEnabled ? 1 : 0;
      const method = body.twoFaEnabled ? (body.twoFaMethod || null) : null;
      await conn.execute('UPDATE hc_users SET two_fa_enabled = ?, two_fa_method = ? WHERE id = ?', [enabled, method, user.sub]);
    }

    await conn.execute(
      `UPDATE hc_user_profiles
         SET preferred_name = ?, gender = ?, pronouns = ?, avatar_path = ?,
             role_data = ?, notification_prefs = ?
       WHERE user_id = ?`,
      [
        body.preferredName ?? null,
        body.gender ?? null,
        body.pronouns ?? null,
        avatarPath,
        JSON.stringify(nextRoleData ?? {}),
        JSON.stringify(nextPrefs),
        user.sub,
      ],
    );

    await conn.commit();
    conn.release();

    res.json({ success: true, message: 'Profile updated.' });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('[PUT /user/profile]', err);
    res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
}

// ── PUT /api/v1/user/password ────────────────────────────────────────────────
export async function putPassword(req: Request, res: Response): Promise<void> {
  const user = getUser(req);
  const { currentPassword, newPassword } = (req.body ?? {}) as { currentPassword?: string; newPassword?: string };

  if (!user.sub) {
    res.status(401).json({ success: false, message: 'Unauthorized.' });
    return;
  }

  if (!currentPassword || !newPassword) {
    res.status(400).json({ success: false, message: 'Current password and new password are required.' });
    return;
  }

  if (!isStrongPassword(newPassword)) {
    res.status(400).json({ success: false, message: 'New password must be ≥12 chars with upper, lower, number and symbol.' });
    return;
  }

  const [rows] = await pool.execute<any[]>(
    'SELECT password_hash FROM hc_users WHERE id = ? LIMIT 1',
    [user.sub],
  );
  const row = rows[0];
  if (!row) {
    res.status(404).json({ success: false, message: 'User not found.' });
    return;
  }

  const ok = await bcrypt.compare(currentPassword, row.password_hash);
  if (!ok) {
    res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    return;
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await pool.execute('UPDATE hc_users SET password_hash = ? WHERE id = ?', [hash, user.sub]);
  res.json({ success: true, message: 'Password updated.' });
}

// ── POST /api/v1/user/email/request-otp ──────────────────────────────────────
export async function requestEmailOtp(req: Request, res: Response): Promise<void> {
  const user = getUser(req);
  const { newEmail } = (req.body ?? {}) as { newEmail?: string };

  if (!user.sub) {
    res.status(401).json({ success: false, message: 'Unauthorized.' });
    return;
  }

  if (!newEmail || !isEmail(newEmail)) {
    res.status(400).json({ success: false, message: 'A valid new email is required.' });
    return;
  }

  // Ensure email is not in use
  const [dup] = await pool.execute<any[]>(
    'SELECT id FROM hc_users WHERE email = ? LIMIT 1',
    [newEmail.trim().toLowerCase()],
  );
  if (dup.length) {
    res.status(409).json({ success: false, message: 'This email is already registered.' });
    return;
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

  // 10 minutes
  const expires = new Date();
  expires.setMinutes(expires.getMinutes() + 10);

  await pool.execute(
    `INSERT INTO hc_email_otp_log (user_id, new_email, otp_hash, attempts, verified, expires_at)
     VALUES (?, ?, ?, 0, 0, ?)`,
    [user.sub, newEmail.trim().toLowerCase(), otpHash, expires.toISOString().slice(0, 19).replace('T', ' ')],
  );

  // In production this should dispatch an email. In dev we expose it for testing.
  const includeDevOtp = process.env.NODE_ENV !== 'production';
  res.json({ success: true, message: 'OTP sent to the new email address.', ...(includeDevOtp ? { devOtp: otp } : {}) });
}

// ── POST /api/v1/user/email/verify-otp ───────────────────────────────────────
export async function verifyEmailOtp(req: Request, res: Response): Promise<void> {
  const user = getUser(req);
  const { newEmail, otp } = (req.body ?? {}) as { newEmail?: string; otp?: string };

  if (!user.sub) {
    res.status(401).json({ success: false, message: 'Unauthorized.' });
    return;
  }
  if (!newEmail || !isEmail(newEmail) || !otp || !/^\d{6}$/.test(otp)) {
    res.status(400).json({ success: false, message: 'New email and 6-digit OTP are required.' });
    return;
  }

  const normalizedEmail = newEmail.trim().toLowerCase();

  const [rows] = await pool.execute<any[]>(
    `SELECT id, otp_hash, attempts, expires_at, verified
     FROM hc_email_otp_log
     WHERE user_id = ? AND new_email = ?
     ORDER BY id DESC
     LIMIT 1`,
    [user.sub, normalizedEmail],
  );
  const row = rows[0];
  if (!row) {
    res.status(400).json({ success: false, message: 'No OTP request found for this email.' });
    return;
  }
  if (row.verified) {
    res.status(400).json({ success: false, message: 'OTP already used.' });
    return;
  }
  if (row.expires_at && new Date() > new Date(row.expires_at)) {
    res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });
    return;
  }
  if ((row.attempts ?? 0) >= 5) {
    res.status(429).json({ success: false, message: 'Too many attempts. Please request a new OTP.' });
    return;
  }

  const incomingHash = crypto.createHash('sha256').update(otp).digest('hex');
  const ok = incomingHash === row.otp_hash;

  await pool.execute('UPDATE hc_email_otp_log SET attempts = attempts + 1 WHERE id = ?', [row.id]);

  if (!ok) {
    res.status(400).json({ success: false, message: 'Invalid OTP.' });
    return;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Check again for duplicates (race safety)
    const [dup] = await conn.execute<any[]>(
      'SELECT id FROM hc_users WHERE email = ? LIMIT 1',
      [normalizedEmail],
    );
    if (dup.length) {
      await conn.rollback();
      conn.release();
      res.status(409).json({ success: false, message: 'This email is already registered.' });
      return;
    }

    await conn.execute('UPDATE hc_users SET email = ? WHERE id = ?', [normalizedEmail, user.sub]);
    await conn.execute('UPDATE hc_email_otp_log SET verified = 1 WHERE id = ?', [row.id]);

    await conn.commit();
    conn.release();
    res.json({ success: true, message: 'Email updated.' });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('[POST /user/email/verify-otp]', err);
    res.status(500).json({ success: false, message: 'Failed to update email.' });
  }
}

