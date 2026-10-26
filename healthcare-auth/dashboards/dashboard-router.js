/**
 * ============================================================================
 * BELLYBAND — CENTRAL DASHBOARD ROUTER (/dashboard/*)
 * File: dashboard-router.js
 *
 * Implements:
 * - Central RBAC-protected Router supporting:
 *     1. Super Admin:      /dashboard/super-admin    (#super-admin)
 *     2. Hospital Admin:   /dashboard/hospital-admin (#hospital-admin)
 *     3. Primary Clinical: /dashboard/clinical       (#clinical)
 *     4. Allied Health:    /dashboard/allied         (#allied)
 *     5. Community/Field:  /dashboard/field          (#field)
 *     6. Emergency:        /dashboard/emergency      (#emergency)
 * - Automatic bypass for Super Admin (23prashantpandey@bellyband.co.in)
 * - Redirection to Step 2 authentication entry point on unauthorized access
 * ============================================================================
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BellyBandRouter = factory();
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  // Role → Primary View Route Hash Map
  const ROLE_DEFAULT_ROUTES = {
    'ROLE_SUPER_ADMIN':    'super-admin',
    'ROLE_HOSPITAL_ADMIN': 'hospital-admin',
    'ROLE_DOCTOR':         'clinical',
    'ROLE_ALLIED_HEALTH':  'allied',
    'ROLE_ASHA_NGO':       'field',
    'ROLE_EMERGENCY':      'emergency'
  };

  // Route Hash → View Component Renderer
  const ROUTE_VIEW_HANDLERS = {
    'super-admin': {
      title: 'Super Admin Command Center — BellyBand',
      render: (containerId) => window.SuperAdminDashboardView?.render(containerId),
      allowedRoles: ['ROLE_SUPER_ADMIN']
    },
    'hospital-admin': {
      title: 'Hospital Operations Dashboard — BellyBand',
      render: (containerId) => window.HospitalAdminDashboardView?.render(containerId),
      allowedRoles: ['ROLE_SUPER_ADMIN', 'ROLE_HOSPITAL_ADMIN']
    },
    'clinical': {
      title: 'Doctor Clinical Console — BellyBand',
      render: (containerId) => window.ClinicalDashboardView?.render(containerId),
      allowedRoles: ['ROLE_SUPER_ADMIN', 'ROLE_DOCTOR']
    },
    'allied': {
      title: 'Allied Health & Nutrition Dashboard — BellyBand',
      render: (containerId) => window.AlliedHealthDashboardView?.render(containerId),
      allowedRoles: ['ROLE_SUPER_ADMIN', 'ROLE_ALLIED_HEALTH']
    },
    'field': {
      title: 'Community Field Worker Console — BellyBand',
      render: (containerId) => window.FieldWorkerDashboardView?.render(containerId),
      allowedRoles: ['ROLE_SUPER_ADMIN', 'ROLE_ASHA_NGO']
    },
    'emergency': {
      title: 'Emergency & Logistics Response — BellyBand',
      render: (containerId) => window.EmergencyDashboardView?.render(containerId),
      allowedRoles: ['ROLE_SUPER_ADMIN', 'ROLE_EMERGENCY']
    },
    'profile-settings': {
      title: 'Healthcare Profile & Account Settings — BellyBand',
      render: (containerId) => window.ProfileSettingsView?.render(containerId),
      allowedRoles: ['ROLE_SUPER_ADMIN', 'ROLE_HOSPITAL_ADMIN', 'ROLE_DOCTOR', 'ROLE_ALLIED_HEALTH', 'ROLE_ASHA_NGO', 'ROLE_EMERGENCY']
    }
  };

  class DashboardRouter {
    constructor() {
      this.currentRoute = null;
      if (typeof window !== 'undefined') {
        this.init();
      }
    }

    init() {
      if (typeof window === 'undefined') return;
      window.addEventListener('hashchange', () => this.handleRoute());
      // Handle initial route on page load
      this.handleRoute();
    }

    /**
     * Central route handler with RBAC validation
     */
    handleRoute() {
      const auth = window.BellyBandAuth?.authController;
      if (!auth) {
        console.warn('[DashboardRouter] AuthController not ready.');
        return;
      }

      const currentUser = auth.getCurrentUser();

      // 1. Guard against unauthenticated users -> redirect to Unified Provider Login Modal
      if (!currentUser) {
        console.warn('[DashboardRouter] Unauthenticated access attempt. Redirecting to Unified Gateway.');
        window.location.href = '../../index.html?action=provider-login';
        return;
      }

      const activeRole = auth.getActiveRole();
      const defaultHash = ROLE_DEFAULT_ROUTES[activeRole] || 'super-admin';

      // 2. Parse target route from hash or URL path
      let rawHash = window.location.hash.replace('#', '').trim();

      // Path inspection for /dashboard/* style urls
      if (!rawHash) {
        const path = window.location.pathname;
        if (path.includes('super-admin')) rawHash = 'super-admin';
        else if (path.includes('hospital-admin')) rawHash = 'hospital-admin';
        else if (path.includes('clinical')) rawHash = 'clinical';
        else if (path.includes('allied')) rawHash = 'allied';
        else if (path.includes('field')) rawHash = 'field';
        else if (path.includes('emergency')) rawHash = 'emergency';
        else rawHash = defaultHash;
      }

      // 3. RBAC Authorization check
      const routeHandler = ROUTE_VIEW_HANDLERS[rawHash];
      if (!routeHandler) {
        // Unknown route -> bounce to role's default dashboard
        this.navigate(defaultHash);
        return;
      }

      // Check if active role is permitted
      const isAuthorized = auth.isSuperAdmin() || routeHandler.allowedRoles.includes(activeRole);

      if (!isAuthorized) {
        if (window.BellyBandLayout) {
          window.BellyBandLayout.showToast(`🚫 Access Restricted: Your role (${activeRole}) cannot access /dashboard/${rawHash}.`);
        }
        this.navigate(defaultHash);
        return;
      }

      // 4. Render Target View
      this.currentRoute = rawHash;
      document.title = routeHandler.title;
      routeHandler.render('app-viewport');

      // Update sidebar & topbar active states
      if (window.BellyBandLayout) {
        window.BellyBandLayout.renderSidebar();
        window.BellyBandLayout.renderTopNav();
      }

      // Ensure hash in URL matches
      if (window.location.hash !== `#${rawHash}`) {
        window.location.hash = rawHash;
      }
    }

    /**
     * Programmatic navigation helper
     * @param {string} routeHash
     */
    navigate(routeHash) {
      window.location.hash = routeHash;
    }
  }

  const instance = new DashboardRouter();

  return {
    DashboardRouter,
    router: instance,
    navigate: (hash) => instance.navigate(hash),
    ROLE_DEFAULT_ROUTES,
    ROUTE_VIEW_HANDLERS
  };
});
