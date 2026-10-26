// ============================================================================
// File: src/middleware/auth.middleware.ts
// JWT verification middleware + RBAC department/role guard
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload, VerificationStatus } from '../models/user.model';
import { UserRole, isValidRole } from '../models/rbac.model';

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME_IN_PRODUCTION_MIN_64_CHARS';

/** Extend Express Request with decoded JWT payload */
declare global {
  namespace Express {
    interface Request {
      hcUser?: JwtPayload & { userRole?: UserRole; facilityId?: string };
    }
  }
}

/**
 * verifyToken
 * Validates the Bearer JWT from the Authorization header.
 * Attaches decoded payload to req.hcUser on success.
 */
export function verifyToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Authorization token missing.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as JwtPayload & { userRole?: UserRole; facilityId?: string };
    req.hcUser    = decoded;
    next();
  } catch (err: unknown) {
    const message = (err instanceof jwt.TokenExpiredError)
      ? 'Session expired. Please login again.'
      : 'Invalid or tampered token. Access denied.';

    res.status(401).json({ success: false, message });
  }
}

/**
 * requireVerified
 * Blocks routes for users whose accounts are pending_verification or rejected.
 * Must be chained AFTER verifyToken.
 */
export function requireVerified(req: Request, res: Response, next: NextFunction): void {
  const status = req.hcUser?.status as VerificationStatus | undefined;

  const blockedStatuses: VerificationStatus[] = ['pending_verification', 'rejected', 'suspended'];
  if (!status || blockedStatuses.includes(status)) {
    res.status(403).json({
      success: false,
      code:    'VERIFICATION_REQUIRED',
      message: 'Clinical access is restricted to verified healthcare professionals. ' +
               'Your account is pending verification or has been suspended.',
      redirect: '/pending-verification',
    });
    return;
  }
  next();
}

/**
 * requireRole
 * Factory — restricts a route to one or more UserRole values.
 * Example: requireRole(UserRole.DOCTOR, UserRole.SUPER_ADMIN)
 * Must be chained AFTER verifyToken.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.hcUser?.userRole;

    if (!userRole || !isValidRole(userRole) || !allowedRoles.includes(userRole)) {
      res.status(403).json({
        success: false,
        code:    'INSUFFICIENT_ROLE',
        message: `Access denied. Required role: [${allowedRoles.join(' | ')}]. Your role: ${userRole ?? 'unknown'}.`,
      });
      return;
    }
    next();
  };
}

/**
 * requireDepartment
 * Factory — restricts a route to specific department IDs.
 * Example: requireDepartment([1, 2]) allows Clinical & Allied Health only.
 */
export function requireDepartment(allowedDeptIds: number[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const deptId = req.hcUser?.deptId;
    if (!deptId || !allowedDeptIds.includes(deptId)) {
      res.status(403).json({
        success: false,
        code:    'INSUFFICIENT_DEPARTMENT',
        message: 'You do not have the required department clearance to access this resource.',
      });
      return;
    }
    next();
  };
}
