// ============================================================================
// File: src/utils/validation.ts
// Small validation helpers (no external deps)
// ============================================================================

export function isEmail(value: string): boolean {
  const v = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function isPhone(value: string): boolean {
  const v = value.trim().replace(/\s/g, '');
  return /^\+?[0-9]{10,15}$/.test(v);
}

export function passwordStrengthScore(password: string): number {
  const val = password || '';
  const checks = [
    val.length >= 12,
    /[A-Z]/.test(val),
    /[a-z]/.test(val),
    /[0-9]/.test(val),
    /[^A-Za-z0-9]/.test(val),
  ];
  return checks.filter(Boolean).length; // 0..5
}

export function isStrongPassword(password: string): boolean {
  return passwordStrengthScore(password) >= 5;
}

export function safeJsonParse<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

