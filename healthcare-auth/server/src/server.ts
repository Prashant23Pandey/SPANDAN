// ============================================================================
// BellyBand Healthcare Auth API
// File: src/server.ts
// Express entry point — middleware, routes, and server boot
// ============================================================================

import express, { Application, Request, Response, NextFunction } from 'express';
import cors          from 'cors';
import helmet        from 'helmet';
import rateLimit     from 'express-rate-limit';
import dotenv        from 'dotenv';
import { authRoutes } from './routes/auth.routes';
import { dashboardRoutes } from './routes/dashboard.routes';
import { userRoutes } from './routes/user.routes';
import path from 'path';

dotenv.config();

const app: Application = express();
const PORT = process.env.HC_API_PORT || 3001;

// ── Security Middleware ────────────────────────────────────────────────────────
app.use(helmet()); // Sets secure HTTP headers

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── Body Parsing ───────────────────────────────────────────────────────────────
// Profile image payloads are sent as data URLs; keep a conservative but usable limit.
app.use(express.json({ limit: '6mb' }));
app.use(express.urlencoded({ extended: true, limit: '6mb' }));

// Serve uploaded profile media
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Global Rate Limiting (HIPAA — prevent brute force) ────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      100,
  message:  { success: false, message: 'Too many requests from this IP. Please try again later.' },
  standardHeaders: true,
  legacyHeaders:   false,
});
app.use(globalLimiter);

// ── Auth Rate Limiting (tighter for auth endpoints) ───────────────────────────
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max:      10,
  message:  { success: false, message: 'Too many login attempts. Please wait 10 minutes.' },
});

// ── Health Check ───────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'BellyBand HC Auth API', timestamp: new Date().toISOString() });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/user', userRoutes);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[HC API Error]', err.message);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🏥  BellyBand Healthcare Auth API`);
  console.log(`✅  Server running at http://localhost:${PORT}`);
  console.log(`📡  Health:   GET  http://localhost:${PORT}/health`);
  console.log(`🔐  Register: POST http://localhost:${PORT}/api/v1/auth/register`);
  console.log(`🔑  Login:    POST http://localhost:${PORT}/api/v1/auth/login\n`);
});

export default app;
