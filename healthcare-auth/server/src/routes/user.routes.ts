// ============================================================================
// File: src/routes/user.routes.ts
// /api/v1/user/* endpoints (profile, credentials, email OTP)
// ============================================================================

import { Router } from 'express';
import { verifyToken } from '../middleware/auth.middleware';
import {
  getProfile,
  putProfile,
  putPassword,
  requestEmailOtp,
  verifyEmailOtp,
} from '../controllers/user.controller';

export const userRoutes = Router();

userRoutes.get('/profile', verifyToken, getProfile);
userRoutes.put('/profile', verifyToken, putProfile);

userRoutes.put('/password', verifyToken, putPassword);

userRoutes.post('/email/request-otp', verifyToken, requestEmailOtp);
userRoutes.post('/email/verify-otp', verifyToken, verifyEmailOtp);

