/**
 * ============================================================================
 * BELLYBAND — RBAC AUTH CONTROLLER & MOCK SEED
 * File: auth-controller.js
 *
 * Implements:
 * - Hardcoded Super Admin Credentials:
 *     Default Email:    23prashantpandey@bellyband.co.in
 *     Default Password: ANURAGp23@
 * - Initial state seed for all 6 roles with full telemetry capabilities
 * - Super Admin full read/write access & global role overrides
 * - RBAC permission checking engine & session state persistence
 * ============================================================================
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BellyBandAuth = factory();
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  // ── 1. Hardcoded Platform Credentials & Role Directory ────────────────────────
  const SEED_USERS = {
    // 👑 Super Admin Platform Owner
    '23prashantpandey@bellyband.co.in': {
      id: 1,
      name: 'Prashant Pandey',
      email: '23prashantpandey@bellyband.co.in',
      password: 'ANURAGp23@',
      role: 'ROLE_SUPER_ADMIN',
      facilityId: null,
      facilityName: 'BellyBand Global HQ',
      department: 'Platform Engineering & Governance',
      designation: 'Platform Owner & Super Admin',
      status: 'verified',
      avatar: '👑',
      themeColor: '#8B5CF6',
      permissions: ['*'], // Universal Super Admin permissions
    },

    // 🏥 Hospital / NGO Administrator
    'hospital.admin@apollo.org': {
      id: 2,
      name: 'Dr. Rajesh Sharma',
      email: 'hospital.admin@apollo.org',
      password: 'HospitalAdmin@2026',
      role: 'ROLE_HOSPITAL_ADMIN',
      facilityId: 'FAC-01',
      facilityName: 'Apollo Maternity & Neonatal Institute',
      department: 'Hospital Administration',
      designation: 'Chief Medical Superintendent',
      status: 'verified',
      avatar: '🏥',
      themeColor: '#3B82F6',
      permissions: [
        'staff:read', 'staff:write', 'staff:onboard',
        'patients:allocate', 'beds:manage', 'analytics:read',
        'audit:facility'
      ],
    },

    // 🩺 Primary Clinical Doctor (OB-GYN)
    'dr.priya@bellyband.health': {
      id: 3,
      name: 'Dr. Priya Mehta, MD',
      email: 'dr.priya@bellyband.health',
      password: 'Doctor@Clinical2026',
      role: 'ROLE_DOCTOR',
      facilityId: 'FAC-01',
      facilityName: 'Apollo Maternity & Neonatal Institute',
      department: 'Obstetrics & Gynecology',
      designation: 'Senior OB-GYN & MFM Specialist',
      status: 'verified',
      avatar: '🩺',
      themeColor: '#06B6D4',
      permissions: [
        'appointments:read', 'teleconsult:join', 'telemetry:live',
        'ehr:read', 'ehr:write', 'prescription:generate'
      ],
    },

    // 🧘 Allied Health (Maternal Nutritionist & Wellness)
    'kavya.nutrition@bellyband.health': {
      id: 4,
      name: 'Kavya Singh, RD',
      email: 'kavya.nutrition@bellyband.health',
      password: 'Allied@Diet2026',
      role: 'ROLE_ALLIED_HEALTH',
      facilityId: 'FAC-01',
      facilityName: 'Apollo Maternity & Neonatal Institute',
      department: 'Nutrition & Prenatal Wellness',
      designation: 'Lead Maternal Dietitian & Counselor',
      status: 'verified',
      avatar: '🧘',
      themeColor: '#10B981',
      permissions: [
        'diet:create', 'diet:update', 'mentalhealth:track',
        'chat:async', 'webinar:schedule'
      ],
    },

    // 🌾 Community & Field Worker (ASHA / ANM)
    'asha.savitri@bellyband.health': {
      id: 5,
      name: 'Savitri Devi',
      email: 'asha.savitri@bellyband.health',
      password: 'AshaField@2026',
      role: 'ROLE_ASHA_NGO',
      facilityId: 'REG-UP-04',
      facilityName: 'Varanasi District Rural Health Hub',
      department: 'Community Health Outreach',
      designation: 'Senior ASHA Field Lead',
      status: 'verified',
      avatar: '🌾',
      themeColor: '#F59E0B',
      permissions: [
        'registry:read', 'registry:write', 'homevisit:log',
        'offline:sync', 'referral:trigger'
      ],
    },

    // 🚨 Emergency Response & Ambulance Dispatch
    'emergency.dispatch@bellyband.health': {
      id: 6,
      name: 'Rohan Deshmukh',
      email: 'emergency.dispatch@bellyband.health',
      password: 'Emergency@SOS2026',
      role: 'ROLE_EMERGENCY',
      facilityId: 'EMS-CENTRAL',
      facilityName: 'Central EMS & Maternal Dispatch Hub',
      department: 'Emergency & Tactical Logistics',
      designation: 'Lead Emergency Coordinator',
      status: 'verified',
      avatar: '🚨',
      themeColor: '#EF4444',
      permissions: [
        'sos:read', 'sos:triage', 'ambulance:dispatch',
        'rapidcard:read', 'hospital:alert'
      ],
    }
  };

  // ── 2. Role Metadata & Route Map ──────────────────────────────────────────────
  const ROLE_CONFIG = {
    'ROLE_SUPER_ADMIN': {
      label: 'Super Admin',
      route: '/dashboard/super-admin',
      hash: 'super-admin',
      color: '#8B5CF6',
      bg: 'rgba(139, 92, 246, 0.12)',
      glow: 'rgba(139, 92, 246, 0.35)',
      icon: '👑',
      description: 'Platform telemetry, institution verification, system audit & global overrides'
    },
    'ROLE_HOSPITAL_ADMIN': {
      label: 'Hospital Administrator',
      route: '/dashboard/hospital-admin',
      hash: 'hospital-admin',
      color: '#3B82F6',
      bg: 'rgba(59, 130, 246, 0.12)',
      glow: 'rgba(59, 130, 246, 0.35)',
      icon: '🏥',
      description: 'Staff onboarding, patient assignment matrix, and bed/ICU occupancy tracker'
    },
    'ROLE_DOCTOR': {
      label: 'Primary Clinical Doctor',
      route: '/dashboard/clinical',
      hash: 'clinical',
      color: '#06B6D4',
      bg: 'rgba(6, 182, 212, 0.12)',
      glow: 'rgba(6, 182, 212, 0.35)',
      icon: '🩺',
      description: 'Daily appointment queue, live BLE vitals drawer, tele-consult & e-Prescriptions'
    },
    'ROLE_ALLIED_HEALTH': {
      label: 'Allied Health Specialist',
      route: '/dashboard/allied',
      hash: 'allied',
      color: '#10B981',
      bg: 'rgba(16, 185, 129, 0.12)',
      glow: 'rgba(16, 185, 129, 0.35)',
      icon: '🧘',
      description: 'Trimester diet plan builder, patient async chat, and wellness webinars'
    },
    'ROLE_ASHA_NGO': {
      label: 'Community & Field Worker',
      route: '/dashboard/field',
      hash: 'field',
      color: '#F59E0B',
      bg: 'rgba(245, 158, 11, 0.12)',
      glow: 'rgba(245, 158, 11, 0.35)',
      icon: '🌾',
      description: 'Rural patient registry, offline home-visit logger, and hospital referrals'
    },
    'ROLE_EMERGENCY': {
      label: 'Emergency Operations',
      route: '/dashboard/emergency',
      hash: 'emergency',
      color: '#EF4444',
      bg: 'rgba(239, 68, 68, 0.12)',
      glow: 'rgba(239, 68, 68, 0.35)',
      icon: '🚨',
      description: 'Live SOS alert feed with GPS, Rapid Emergency Card & ambulance dispatch'
    }
  };

  // ── 3. Session Keys ──────────────────────────────────────────────────────────
  const SESSION_USER_KEY = 'bellyband_auth_user';
  const OVERRIDE_ROLE_KEY = 'bellyband_override_role';

  // ── 4. AuthController Core Class ─────────────────────────────────────────────
  class AuthController {
    constructor() {
      this._currentUser = null;
      this._activeOverrideRole = null;
      this._listeners = [];
      this.init();
    }

    init() {
      // 1. Check local session storage for active session
      try {
        const stored = sessionStorage.getItem(SESSION_USER_KEY);
        if (stored) {
          this._currentUser = JSON.parse(stored);
        } else {
          // Auto-seed default Super Admin if running standalone for instant validation
          this._currentUser = Object.assign({}, SEED_USERS['23prashantpandey@bellyband.co.in']);
          this.saveSession();
        }

        const storedOverride = sessionStorage.getItem(OVERRIDE_ROLE_KEY);
        if (storedOverride && this.isSuperAdmin()) {
          this._activeOverrideRole = storedOverride;
        }
      } catch (err) {
        console.warn('[AuthController] Session restoration failed:', err);
      }
    }

    /**
     * Authenticate user credentials
     * @param {string} email
     * @param {string} password
     * @returns {Promise<{success: boolean, user?: object, redirect?: string, message?: string}>}
     */
    async login(email, password) {
      const normalizedEmail = (email || '').trim().toLowerCase();
      const user = Object.values(SEED_USERS).find(u => u.email.toLowerCase() === normalizedEmail);

      if (!user || user.password !== password) {
        return {
          success: false,
          message: 'Invalid email or password. Please verify your credentials.'
        };
      }

      if (user.status !== 'verified' && user.role !== 'ROLE_SUPER_ADMIN') {
        return {
          success: false,
          message: 'Account pending administrative verification.'
        };
      }

      this._currentUser = Object.assign({}, user);
      this._activeOverrideRole = null;
      sessionStorage.removeItem(OVERRIDE_ROLE_KEY);
      this.saveSession();

      const roleMeta = ROLE_CONFIG[user.role] || ROLE_CONFIG['ROLE_DOCTOR'];
      this.notify();

      return {
        success: true,
        user: this.getCurrentUser(),
        redirect: roleMeta.route,
        message: `Welcome back, ${user.name}!`
      };
    }

    /** Log out current session */
    logout() {
      this._currentUser = null;
      this._activeOverrideRole = null;
      try {
        sessionStorage.removeItem(SESSION_USER_KEY);
        sessionStorage.removeItem(OVERRIDE_ROLE_KEY);
      } catch (e) {}
      this.notify();
    }

    /** Save session into storage */
    saveSession() {
      if (this._currentUser) {
        sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(this._currentUser));
      }
    }

    /** Get the active user object */
    getCurrentUser() {
      return this._currentUser;
    }

    /** Get the active effective role (considers Super Admin overrides) */
    getActiveRole() {
      if (!this._currentUser) return null;
      if (this.isSuperAdmin() && this._activeOverrideRole) {
        return this._activeOverrideRole;
      }
      return this._currentUser.role;
    }

    /** Is the logged in user a Super Admin? */
    isSuperAdmin() {
      return this._currentUser && this._currentUser.role === 'ROLE_SUPER_ADMIN';
    }

    /** Super Admin global role override trigger */
    setOverrideRole(roleKey) {
      if (!this.isSuperAdmin()) {
        console.warn('[AuthController] Only Super Admin can override active role context.');
        return false;
      }

      if (roleKey === 'ROLE_SUPER_ADMIN' || !roleKey) {
        this._activeOverrideRole = null;
        sessionStorage.removeItem(OVERRIDE_ROLE_KEY);
      } else if (ROLE_CONFIG[roleKey]) {
        this._activeOverrideRole = roleKey;
        sessionStorage.setItem(OVERRIDE_ROLE_KEY, roleKey);
      }

      this.notify();
      return true;
    }

    /** Check if active role has permission */
    hasPermission(permission) {
      if (!this._currentUser) return false;
      if (this.isSuperAdmin()) return true; // Super admin possesses universal capabilities
      const activeRole = this.getActiveRole();
      const seedRole = Object.values(SEED_USERS).find(u => u.role === activeRole);
      if (!seedRole) return false;
      return seedRole.permissions.includes(permission) || seedRole.permissions.includes('*');
    }

    /** Get role metadata */
    getRoleMeta(roleKey) {
      const key = roleKey || this.getActiveRole();
      return ROLE_CONFIG[key] || ROLE_CONFIG['ROLE_SUPER_ADMIN'];
    }

    /** Get all available roles for Super Admin switcher */
    getAllRoles() {
      return Object.entries(ROLE_CONFIG).map(([key, config]) => ({
        key,
        ...config
      }));
    }

    /** Subscribe to auth state changes */
    subscribe(callback) {
      this._listeners.push(callback);
      return () => {
        this._listeners = this._listeners.filter(l => l !== callback);
      };
    }

    notify() {
      this._listeners.forEach(fn => {
        try { fn(this.getCurrentUser(), this.getActiveRole()); } catch (e) { console.error(e); }
      });
    }
  }

  // Singleton instance
  const instance = new AuthController();
  return {
    AuthController,
    authController: instance,
    SEED_USERS,
    ROLE_CONFIG
  };
});
