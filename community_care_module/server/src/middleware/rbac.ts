import { Request, Response, NextFunction } from 'express';
import { UserRole, ChannelType } from '../types';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
    isVerifiedBadge: boolean;
    assignedHospitalId?: string;
  };
}

/**
 * Role-Based Access Control (RBAC) Middleware
 * Verifies that the authenticated user's role has permission to execute the action.
 */
export const requireRoles = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Authentication required to access this resource.'
      });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({
        success: false,
        error: 'FORBIDDEN_ROLE',
        message: `Role '${user.role}' lacks permission for this healthcare operation.`
      });
      return;
    }

    next();
  };
};

/**
 * Attribute-Based Access Control (ABAC) for Clinical Channel Isolation
 * Enforces DISHA/HIPAA compliance:
 * - Public peer forums: all registered users can read/post
 * - Assigned Care Team & Direct Tele-Consults: strictly isolated to assigned care team members
 */
export const enforceChannelIsolation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const user = req.user;
  const channelType = req.body.channelType as ChannelType || req.query.channelType as ChannelType;
  const channelId = req.params.channelId || req.body.channelId;

  if (!user) {
    res.status(401).json({ error: 'UNAUTHORIZED' });
    return;
  }

  // Public/peer forums have open access for all users
  if (channelType === 'peer_support_forum') {
    return next();
  }

  // Clinical & Care Team Channels: Must verify user is member or verified clinician
  if (channelType === 'assigned_care_team' || channelType === 'direct_consultation') {
    if (['gynecologist', 'nutritionist', 'asha_worker'].includes(user.role) && !user.isVerifiedBadge) {
      res.status(403).json({
        success: false,
        error: 'UNVERIFIED_CLINICIAN',
        message: 'Your medical credentials must be verified before accessing patient care channels.'
      });
      return;
    }
  }

  next();
};

/**
 * Vitals Stream Authorization
 * Only Assigned Gynecologists, Hospital Admins, and Emergency Responders can view real-time telemetry
 */
export const canAccessPatientVitals = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const user = req.user;
  const allowedVitalsViewers: UserRole[] = [
    'pregnant_mother',
    'gynecologist',
    'hospital_admin',
    'emergency_dispatcher'
  ];

  if (!user || !allowedVitalsViewers.includes(user.role)) {
    res.status(403).json({
      success: false,
      error: 'VITALS_ACCESS_RESTRICTED',
      message: 'Access to real-time clinical vitals stream is restricted to authorized medical personnel.'
    });
    return;
  }

  next();
};
