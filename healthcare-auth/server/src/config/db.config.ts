// ============================================================================
// File: src/config/db.config.ts
// MySQL connection pool using mysql2/promise
// ============================================================================

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

/** Singleton MySQL connection pool */
const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT || '3306', 10),
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'bellyband_hc',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  charset:            'utf8mb4',
  timezone:           '+00:00',   // Store all timestamps in UTC
  ssl:                process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
});

export default pool;
