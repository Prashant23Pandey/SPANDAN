// ============================================================================
// File: src/routes/dashboard.routes.ts
// MaaCare RBAC — Protected /dashboard/* API endpoints
// All routes require valid JWT + role-level clearance
// ============================================================================

import { Router, Request, Response } from 'express';
import { verifyToken, requireVerified, requireRole } from '../middleware/auth.middleware';
import { ROLE_PERMISSIONS_MAP, getDashboardPath, ROLE_META_MAP } from '../models/rbac.model';
import { UserRole } from '../models/rbac.model';

export const dashboardRoutes = Router();

// ── /api/v1/dashboard/me ─────────────────────────────────────────────────────
/**
 * GET /me
 * Returns the authenticated user's role, dashboard path, and permissions.
 * Used by the client-side router on initial load.
 */
dashboardRoutes.get('/me', verifyToken, (req: Request, res: Response) => {
  const user       = req.hcUser!;
  const userRole   = user.userRole as UserRole;
  const permissions = ROLE_PERMISSIONS_MAP[userRole] ?? [];
  const meta        = ROLE_META_MAP[userRole];

  res.json({
    success:       true,
    userId:        user.sub,
    email:         user.email,
    userRole,
    dashboardPath: getDashboardPath(userRole),
    status:        user.status,
    facilityId:    user.facilityId ?? null,
    permissions,
    roleMeta: meta ?? null,
  });
});

// ── /dashboard/super-admin ────────────────────────────────────────────────────
dashboardRoutes.get(
  '/super-admin',
  verifyToken,
  requireRole(UserRole.SUPER_ADMIN),
  (_req: Request, res: Response) => {
    res.json({
      success: true,
      view:    'super-admin',
      kpis: [
        { label: 'Total Platform Users',      value: 0, trend: '+0%' },
        { label: 'Pending Verifications',     value: 0, trend: '' },
        { label: 'Active Hospitals',          value: 0, trend: '' },
        { label: 'Security Alerts (24h)',     value: 0, trend: '' },
      ],
    });
  }
);

// ── /dashboard/hospital-admin ─────────────────────────────────────────────────
dashboardRoutes.get(
  '/hospital-admin',
  verifyToken,
  requireRole(UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN),
  (req: Request, res: Response) => {
    res.json({
      success: true,
      view:    'hospital-admin',
      facilityId: req.hcUser?.facilityId,
      kpis: [
        { label: 'Total Staff',           value: 0 },
        { label: 'Assigned Patients',     value: 0 },
        { label: 'Bed Occupancy (%)',     value: 0 },
        { label: 'ICU Available',         value: 0 },
      ],
    });
  }
);

// ── /dashboard/clinical ───────────────────────────────────────────────────────
dashboardRoutes.get(
  '/clinical',
  verifyToken,
  requireRole(UserRole.DOCTOR, UserRole.SUPER_ADMIN),
  requireVerified,
  (req: Request, res: Response) => {
    res.json({
      success: true,
      view:    'clinical',
      kpis: [
        { label: 'Patients in Queue',     value: 0 },
        { label: 'Teleconsults Today',    value: 0 },
        { label: 'Prescriptions Issued',  value: 0 },
        { label: 'Alerts from Vitals',    value: 0 },
      ],
    });
  }
);

// ── /dashboard/allied ─────────────────────────────────────────────────────────
dashboardRoutes.get(
  '/allied',
  verifyToken,
  requireRole(UserRole.ALLIED_HEALTH, UserRole.SUPER_ADMIN),
  requireVerified,
  (_req: Request, res: Response) => {
    res.json({
      success: true,
      view:    'allied',
      kpis: [
        { label: 'Active Diet Plans',     value: 0 },
        { label: 'MH Sessions Today',     value: 0 },
        { label: 'Unread Messages',       value: 0 },
        { label: 'Upcoming Webinars',     value: 0 },
      ],
    });
  }
);

// ── /dashboard/field ──────────────────────────────────────────────────────────
dashboardRoutes.get(
  '/field',
  verifyToken,
  requireRole(UserRole.ASHA_NGO, UserRole.SUPER_ADMIN),
  (_req: Request, res: Response) => {
    res.json({
      success: true,
      view:    'field',
      kpis: [
        { label: 'Registered Patients',   value: 0 },
        { label: 'Home Visits Today',     value: 0 },
        { label: 'Welfare Enrollments',   value: 0 },
        { label: 'Referrals Dispatched',  value: 0 },
      ],
    });
  }
);

// ── /dashboard/emergency ──────────────────────────────────────────────────────
dashboardRoutes.get(
  '/emergency',
  verifyToken,
  requireRole(UserRole.EMERGENCY, UserRole.SUPER_ADMIN),
  (_req: Request, res: Response) => {
    res.json({
      success: true,
      view:    'emergency',
      kpis: [
        { label: 'Active SOS Alerts',     value: 0 },
        { label: 'Ambulances Dispatched', value: 0 },
        { label: 'Avg Response Time (m)', value: 0 },
        { label: 'Patients Stabilized',   value: 0 },
      ],
    });
  }
);

// ── /dashboard/patient ────────────────────────────────────────────────────────
dashboardRoutes.get(
  '/patient',
  verifyToken,
  requireRole(UserRole.USER_PATIENT, UserRole.USER_PARTNER, UserRole.SUPER_ADMIN),
  (_req: Request, res: Response) => {
    res.json({
      success: true,
      view:    'patient',
      kpis: [
        { label: 'Days Since Last Scan',  value: 0 },
        { label: 'Next Appointment',      value: 'Not set' },
        { label: 'Symptoms Logged',       value: 0 },
        { label: 'Unread Messages',       value: 0 },
      ],
    });
  }
);
