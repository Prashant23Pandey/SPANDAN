// ============================================================================
// File: healthcare-auth/rbac/rbac-router.js
// MaaCare RBAC — Client-side Auth Guard + Role-Based Dashboard Router
// Works in PHP session mode (Option A): calls /api/me.php to get role data
// ============================================================================

'use strict';

// ── Configuration ─────────────────────────────────────────────────────────────
const RBAC_CONFIG = {
  meEndpoint:       '/BELLYBAND/healthcare-auth/php/api/me.php',
  loginPage:        '/BELLYBAND/healthcare-auth/login.html',
  pendingPage:      '#pending-verification',
  sessionKey:       'maacare_rbac_user',
  sessionTTL:       30 * 60 * 1000, // 30 min client-side cache
};

// ── Role → View Component Name map ───────────────────────────────────────────
const ROLE_VIEW_MAP = {
  'ROLE_SUPER_ADMIN':    'view-super-admin',
  'ROLE_HOSPITAL_ADMIN': 'view-hospital-admin',
  'ROLE_DOCTOR':         'view-clinical',
  'ROLE_ALLIED_HEALTH':  'view-allied',
  'ROLE_ASHA_NGO':       'view-field',
  'ROLE_EMERGENCY':      'view-emergency',
  'ROLE_USER_PATIENT':   'view-patient',
  'ROLE_USER_PARTNER':   'view-patient',
};

// Views accessible to ALL roles (global utilities)
const UNIVERSAL_VIEWS = ['account'];

// ── Sidebar nav items per role ─────────────────────────────────────────────────
const ROLE_NAV_MAP = {
  'ROLE_SUPER_ADMIN': [
    { id: 'nav-telemetry',   icon: '📊', label: 'System Telemetry',       view: 'super-admin',    section: 'telemetry' },
    { id: 'nav-users',       icon: '👥', label: 'User Management',         view: 'super-admin',    section: 'users' },
    { id: 'nav-verify',      icon: '✅', label: 'Verification Queue',      view: 'super-admin',    section: 'verify' },
    { id: 'nav-audit',       icon: '📋', label: 'Audit Log',               view: 'super-admin',    section: 'audit' },
    { id: 'nav-security',    icon: '🔒', label: 'Security Config',         view: 'super-admin',    section: 'security' },
    { id: 'nav-account',     icon: '⚙️', label: 'Account & Profile',       view: 'account',        section: 'account' },
  ],
  'ROLE_HOSPITAL_ADMIN': [
    { id: 'nav-staff',       icon: '👨‍⚕️', label: 'Staff Management',       view: 'hospital-admin', section: 'staff' },
    { id: 'nav-matrix',      icon: '🔗', label: 'Assignment Matrix',        view: 'hospital-admin', section: 'matrix' },
    { id: 'nav-beds',        icon: '🛏️', label: 'Bed Capacity',             view: 'hospital-admin', section: 'beds' },
    { id: 'nav-analytics',   icon: '📈', label: 'Facility Analytics',       view: 'hospital-admin', section: 'analytics' },
    { id: 'nav-account',     icon: '⚙️', label: 'Account & Profile',       view: 'account',        section: 'account' },
  ],
  'ROLE_DOCTOR': [
    { id: 'nav-teleconsult', icon: '📹', label: 'Tele-Consultation',        view: 'clinical',       section: 'teleconsult' },
    { id: 'nav-queue',       icon: '📅', label: 'Patient Queue',            view: 'clinical',       section: 'queue' },
    { id: 'nav-vitals',      icon: '💓', label: 'Live Vitals',              view: 'clinical',       section: 'vitals' },
    { id: 'nav-ehr',         icon: '📂', label: 'Health Records (EHR)',     view: 'clinical',       section: 'ehr' },
    { id: 'nav-rx',          icon: '💊', label: 'e-Prescription',           view: 'clinical',       section: 'rx' },
    { id: 'nav-account',     icon: '⚙️', label: 'Account & Profile',       view: 'account',        section: 'account' },
  ],
  'ROLE_ALLIED_HEALTH': [
    { id: 'nav-diet',        icon: '🥗', label: 'Diet Plan Builder',        view: 'allied',         section: 'diet' },
    { id: 'nav-mentalhealth',icon: '🧠', label: 'Mental Health Tracker',    view: 'allied',         section: 'mh' },
    { id: 'nav-chat',        icon: '💬', label: 'Patient Chat',             view: 'allied',         section: 'chat' },
    { id: 'nav-webinar',     icon: '🎥', label: 'Webinar Scheduler',        view: 'allied',         section: 'webinar' },
    { id: 'nav-account',     icon: '⚙️', label: 'Account & Profile',       view: 'account',        section: 'account' },
  ],
  'ROLE_ASHA_NGO': [
    { id: 'nav-registry',    icon: '📋', label: 'Field Registry',           view: 'field',          section: 'registry' },
    { id: 'nav-visits',      icon: '🏠', label: 'Home Visit Logger',        view: 'field',          section: 'visits' },
    { id: 'nav-welfare',     icon: '🏛️', label: 'Welfare Schemes',          view: 'field',          section: 'welfare' },
    { id: 'nav-referral',    icon: '🚑', label: 'Emergency Referral',       view: 'field',          section: 'referral' },
    { id: 'nav-account',     icon: '⚙️', label: 'Account & Profile',       view: 'account',        section: 'account' },
  ],
  'ROLE_EMERGENCY': [
    { id: 'nav-sos',         icon: '🆘', label: 'SOS Feed',                 view: 'emergency',      section: 'sos' },
    { id: 'nav-dispatch',    icon: '🗺️', label: 'Ambulance Dispatch',       view: 'emergency',      section: 'dispatch' },
    { id: 'nav-rapidcard',   icon: '🪪', label: 'Rapid Patient Card',       view: 'emergency',      section: 'rapidcard' },
    { id: 'nav-account',     icon: '⚙️', label: 'Account & Profile',       view: 'account',        section: 'account' },
  ],
  'ROLE_USER_PATIENT': [
    { id: 'nav-symptoms',    icon: '🌡️', label: 'Symptom Hub',              view: 'patient',        section: 'symptoms' },
    { id: 'nav-partner',     icon: '👫', label: 'Partner Guides',           view: 'patient',        section: 'partner' },
    { id: 'nav-appointments',icon: '📆', label: 'Appointments',             view: 'patient',        section: 'appointments' },
    { id: 'nav-careteam',    icon: '💬', label: 'Care Team Chat',           view: 'patient',        section: 'careteam' },
    { id: 'nav-account',     icon: '⚙️', label: 'Account & Profile',       view: 'account',        section: 'account' },
  ],
  'ROLE_USER_PARTNER': [
    { id: 'nav-partner',     icon: '👫', label: 'Partner Guides',           view: 'patient',        section: 'partner' },
    { id: 'nav-appointments',icon: '📆', label: 'Appointments',             view: 'patient',        section: 'appointments' },
    { id: 'nav-careteam',    icon: '💬', label: 'Care Team Chat',           view: 'patient',        section: 'careteam' },
    { id: 'nav-account',     icon: '⚙️', label: 'Account & Profile',       view: 'account',        section: 'account' },
  ],
};

// ── AuthGuard Class ────────────────────────────────────────────────────────────
class AuthGuard {
  constructor() {
    this._user = null;
  }

  /** Fetch user identity from PHP session bridge */
  async fetchIdentity() {
    // Try session cache first
    const cached = this._loadSessionCache();
    if (cached) { this._user = cached; return cached; }

    try {
      const res  = await fetch(RBAC_CONFIG.meEndpoint, { credentials: 'include' });
      const data = await res.json();

      if (!data.success || !data.authenticated) {
        this._redirectToLogin();
        return null;
      }

      this._user = data;
      this._saveSessionCache(data);
      return data;
    } catch (err) {
      console.error('[RBAC] Auth fetch failed:', err);
      this._redirectToLogin();
      return null;
    }
  }

  _loadSessionCache() {
    try {
      const raw = sessionStorage.getItem(RBAC_CONFIG.sessionKey);
      if (!raw) return null;
      const { data, ts } = JSON.parse(raw);
      if (Date.now() - ts > RBAC_CONFIG.sessionTTL) {
        sessionStorage.removeItem(RBAC_CONFIG.sessionKey);
        return null;
      }
      return data;
    } catch { return null; }
  }

  _saveSessionCache(data) {
    try {
      sessionStorage.setItem(RBAC_CONFIG.sessionKey, JSON.stringify({ data, ts: Date.now() }));
    } catch {}
  }

  invalidateCache() {
    sessionStorage.removeItem(RBAC_CONFIG.sessionKey);
  }

  _redirectToLogin() {
    window.location.href = RBAC_CONFIG.loginPage;
  }

  hasPermission(perm) {
    return Array.isArray(this._user?.permissions) && this._user.permissions.includes(perm);
  }

  get user() { return this._user; }
}

// ── RoleRouter Class ───────────────────────────────────────────────────────────
class RoleRouter {
  constructor(authGuard, sidebar) {
    this.guard   = authGuard;
    this.sidebar = sidebar;
    this._currentView = null;
  }

  async init() {
    const identity = await this.guard.fetchIdentity();
    if (!identity) return; // redirected to login

    const { userRole, verificationRequired, roleMeta } = identity;

    // Render sidebar with role-specific nav items
    this.sidebar.render(identity);

    // Handle hash-based routing on load
    const hash = window.location.hash.replace('#', '') || '';

    // Handle unverified doctor
    if (verificationRequired) {
      this._showView('pending-verification');
      return;
    }

    // Determine target view
    const roleView   = (ROLE_VIEW_MAP[userRole] || 'view-patient').replace('view-', '');
    const targetView = hash && this._isAuthorizedHash(hash, userRole) ? hash : roleView;
    this._showView(targetView);
    this._currentView = targetView;

    // Listen for hash changes (back/forward nav)
    window.addEventListener('hashchange', () => {
      const newHash = window.location.hash.replace('#', '');
      const next = newHash || roleView;

      // Navigation guard (e.g., dirty forms)
      if (!this._beforeNavigate(this._currentView, next)) {
        window.location.hash = this._currentView || roleView;
        return;
      }

      if (this._isAuthorizedHash(next, userRole)) {
        this._showView(next);
        this._currentView = next;
      } else {
        // Unauthorized hash — bounce back to role's dashboard
        window.location.hash = roleView;
      }
    });
  }

  _isAuthorizedHash(hash, userRole) {
    // Super admin can access any view
    if (userRole === 'ROLE_SUPER_ADMIN') return true;

    // Universal views for all roles (e.g., account settings)
    if (UNIVERSAL_VIEWS.some(v => hash === v || hash.startsWith(v))) return true;

    const allowedView = (ROLE_VIEW_MAP[userRole] || 'view-patient').replace('view-', '');
    // Sections within the same view (e.g. #clinical-ehr still within clinical)
    return hash === allowedView || hash.startsWith(allowedView);
  }

  _beforeNavigate(fromView, toView) {
    // Allow apps to register a navigation guard (e.g. unsaved changes).
    // Return false to cancel navigation.
    try {
      if (typeof window.__rbacBeforeNavigate === 'function') {
        return window.__rbacBeforeNavigate(fromView || '', toView || '');
      }
    } catch {}
    return true;
  }

  _showView(viewId) {
    // Hide all views
    document.querySelectorAll('.rbac-view').forEach(v => {
      v.classList.remove('active');
      v.setAttribute('aria-hidden', 'true');
    });

    // Show target view
    const target = document.getElementById(`view-${viewId}`);
    if (target) {
      target.classList.add('active');
      target.removeAttribute('aria-hidden');
      window.location.hash = viewId;
    } else {
      // Fallback to patient view
      const fallback = document.getElementById('view-patient');
      if (fallback) { fallback.classList.add('active'); fallback.removeAttribute('aria-hidden'); }
    }

    // Update active sidebar link
    document.querySelectorAll('.sidebar-nav-link').forEach(l => {
      l.classList.toggle('active', l.dataset.view === viewId || l.dataset.view?.startsWith(viewId));
    });
  }

  navigateTo(viewId) {
    if (!this._beforeNavigate(this._currentView, viewId)) return;
    this._showView(viewId);
    this._currentView = viewId;
  }
}

// ── Initialize on DOM ready ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // These classes are defined in rbac-sidebar.js, loaded before this file
  const guard   = new AuthGuard();
  const sidebar = new DynamicSidebar(ROLE_NAV_MAP);
  const router  = new RoleRouter(guard, sidebar);

  // Expose globally for inline onclick handlers
  window._rbacRouter = router;
  window._rbacGuard  = guard;

  await router.init();
});
