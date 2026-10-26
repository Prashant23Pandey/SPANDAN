// ============================================================================
// File: src/routes/auth.routes.ts
// Route mapping for /api/v1/auth/register and /api/v1/auth/login
// ============================================================================

import { Router } from 'express';
import { register, login } from '../controllers/auth.controller';
import { verifyToken, requireVerified, requireDepartment } from '../middleware/auth.middleware';

export const authRoutes = Router();

// Public Authentication Endpoints
authRoutes.post('/register', register);
authRoutes.post('/login', login);

// Example Protected Route to test Verification Status + Department Role-Based Access Control (RBAC)
authRoutes.get('/clinical-records', verifyToken, requireVerified, requireDepartment([1]), (req, res) => {
  res.json({
    success: true,
    message: 'Access granted. Welcome to the Obstetric & Gynecological Electronic Health Records portal.',
    user: req.hcUser
  });
});
