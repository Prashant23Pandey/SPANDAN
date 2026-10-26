/**
 * ============================================================================
 * BELLYBAND — DASHBOARD ROUTING & LAYOUT WRAPPER
 * File: layout-wrapper.js
 *
 * Provides:
 * - Dynamic sidebar navigation that auto-adapts links to the active role
 * - Top telemetry bar with facility indicators, live pulse, and Super Admin role override
 * - Central Modal and Toast Notification managers
 * - Responsive mobile drawer toggle & theme engine
 * ============================================================================
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BellyBandLayout = factory();
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  // Role Navigation Map for Sidebar
  const ROLE_NAV_LINKS = {
    'ROLE_SUPER_ADMIN': [
      { id: 'nav-sa-telemetry', icon: '👑', label: 'Platform Telemetry', hash: 'super-admin' },
      { id: 'nav-sa-queue',     icon: '🏛️', label: 'Hospital Verification', hash: 'super-admin' },
      { id: 'nav-sa-audit',     icon: '📋', label: 'Audit Trail Logs', hash: 'super-admin' },
      { id: 'nav-sa-overrides', icon: '⚡', label: 'Global Role Overrides', hash: 'super-admin' },
      { id: 'nav-sa-profile',   icon: '👤', label: 'Profile Settings', hash: 'profile-settings' },
    ],
    'ROLE_HOSPITAL_ADMIN': [
      { id: 'nav-ha-staff',     icon: '👨‍⚕️', label: 'Staff Management', hash: 'hospital-admin' },
      { id: 'nav-ha-matrix',    icon: '🔗', label: 'Patient Matrix', hash: 'hospital-admin' },
      { id: 'nav-ha-beds',      icon: '🛏️', label: 'Bed & ICU Capacity', hash: 'hospital-admin' },
      { id: 'nav-ha-profile',   icon: '👤', label: 'Profile Settings', hash: 'profile-settings' },
    ],
    'ROLE_DOCTOR': [
      { id: 'nav-cl-queue',     icon: '📅', label: 'Patient Queue', hash: 'clinical' },
      { id: 'nav-cl-vitals',    icon: '💓', label: 'Live BLE Vitals', hash: 'clinical' },
      { id: 'nav-cl-video',     icon: '📹', label: 'Tele-Consultation', hash: 'clinical' },
      { id: 'nav-cl-rx',        icon: '💊', label: 'e-Prescriptions', hash: 'clinical' },
      { id: 'nav-cl-profile',   icon: '👤', label: 'Profile Settings', hash: 'profile-settings' },
    ],
    'ROLE_ALLIED_HEALTH': [
      { id: 'nav-al-diet',      icon: '🥗', label: 'Diet Plan Builder', hash: 'allied' },
      { id: 'nav-al-mh',        icon: '🧠', label: 'Mental Health Tracker', hash: 'allied' },
      { id: 'nav-al-chat',      icon: '💬', label: 'Patient Async Chat', hash: 'allied' },
      { id: 'nav-al-webinar',   icon: '🎥', label: 'Webinar Scheduler', hash: 'allied' },
      { id: 'nav-al-profile',   icon: '👤', label: 'Profile Settings', hash: 'profile-settings' },
    ],
    'ROLE_ASHA_NGO': [
      { id: 'nav-fw-registry',  icon: '📋', label: 'Village Registry', hash: 'field' },
      { id: 'nav-fw-notes',     icon: '🏠', label: 'Home Visit Logger', hash: 'field' },
      { id: 'nav-fw-referral',  icon: '🚑', label: 'Emergency Referral', hash: 'field' },
      { id: 'nav-fw-profile',   icon: '👤', label: 'Profile Settings', hash: 'profile-settings' },
    ],
    'ROLE_EMERGENCY': [
      { id: 'nav-em-sos',       icon: '🆘', label: 'Live SOS Feed', hash: 'emergency' },
      { id: 'nav-em-gps',       icon: '🗺️', label: 'Ambulance Dispatch', hash: 'emergency' },
      { id: 'nav-em-card',      icon: '🪪', label: 'Rapid Emergency Card', hash: 'emergency' },
      { id: 'nav-em-profile',   icon: '👤', label: 'Profile Settings', hash: 'profile-settings' },
    ]
  };

  let modalCallback = null;

  function initLayout() {
    renderSidebar();
    renderTopNav();
    attachGlobalEvents();

    // Subscribe to Auth changes
    if (window.BellyBandAuth?.authController) {
      window.BellyBandAuth.authController.subscribe(() => {
        renderSidebar();
        renderTopNav();
      });
    }
  }

  function renderSidebar() {
    const auth = window.BellyBandAuth?.authController;
    if (!auth) return;

    const user = auth.getCurrentUser();
    const activeRole = auth.getActiveRole();
    const roleMeta = auth.getRoleMeta(activeRole);

    // Update Role Theme Variables
    document.documentElement.style.setProperty('--role-color', roleMeta.color);
    document.documentElement.style.setProperty('--role-bg', roleMeta.bg);
    document.documentElement.style.setProperty('--role-glow', roleMeta.glow);

    // Sidebar User Header Card
    const avatarEl = document.getElementById('sidebarUserAvatar');
    const nameEl = document.getElementById('sidebarUserName');
    const roleEl = document.getElementById('sidebarUserRole');

    if (avatarEl) {
      avatarEl.textContent = user?.avatar || roleMeta.icon;
      avatarEl.style.background = roleMeta.color;
    }
    if (nameEl) nameEl.textContent = user?.name || 'Healthcare User';
    if (roleEl) roleEl.textContent = roleMeta.label;

    // Render Role Navigation Links
    const navContainer = document.getElementById('sidebarNavList');
    if (!navContainer) return;

    const links = ROLE_NAV_LINKS[activeRole] || ROLE_NAV_LINKS['ROLE_DOCTOR'];
    const currentHash = window.location.hash.replace('#', '') || roleMeta.hash;

    navContainer.innerHTML = links.map(link => `
      <li>
        <button class="nav-item-btn ${currentHash === link.hash ? 'active' : ''}"
                id="${link.id}"
                data-hash="${link.hash}"
                onclick="window.BellyBandRouter.navigate('${link.hash}')">
          <span class="nav-icon">${link.icon}</span>
          <span class="nav-label">${link.label}</span>
        </button>
      </li>
    `).join('');
  }

  function renderTopNav() {
    const auth = window.BellyBandAuth?.authController;
    if (!auth) return;

    const user = auth.getCurrentUser();
    const activeRole = auth.getActiveRole();
    const roleMeta = auth.getRoleMeta(activeRole);
    const isSuperAdmin = auth.isSuperAdmin();

    // Facility Indicator
    const facilityEl = document.getElementById('topNavFacilityIndicator');
    if (facilityEl) {
      facilityEl.textContent = user?.facilityName || '🌐 BellyBand Central Healthcare Grid';
    }

    // Role Badge
    const roleBadgeEl = document.getElementById('topNavRoleBadge');
    if (roleBadgeEl) {
      roleBadgeEl.innerHTML = `${roleMeta.icon} ${roleMeta.label}`;
      roleBadgeEl.style.background = roleMeta.bg;
      roleBadgeEl.style.borderColor = roleMeta.color;
      roleBadgeEl.style.color = roleMeta.color;
    }

    // User Avatar & Name in Topbar
    const topAvatar = document.getElementById('topNavUserAvatar');
    const topName = document.getElementById('topNavUserName');
    if (topAvatar) topAvatar.textContent = user?.avatar || roleMeta.icon;
    if (topName) topName.textContent = user?.name || 'User';

    // Super Admin Role Override Dropdown
    const overrideWrap = document.getElementById('roleOverrideContainer');
    if (overrideWrap) {
      if (isSuperAdmin) {
        overrideWrap.style.display = 'flex';
        const selectEl = document.getElementById('roleOverrideSelect');
        if (selectEl) {
          const roles = auth.getAllRoles();
          selectEl.innerHTML = roles.map(r => `
            <option value="${r.key}" ${r.key === activeRole ? 'selected' : ''}>
              ${r.icon} ${r.label}
            </option>
          `).join('');
          selectEl.onchange = (e) => {
            auth.setOverrideRole(e.target.value);
            const targetMeta = auth.getRoleMeta(e.target.value);
            window.BellyBandRouter.navigate(targetMeta.hash);
            showToast(`⚡ Switched active role context to "${targetMeta.label}".`);
          };
        }
      } else {
        overrideWrap.style.display = 'none';
      }
    }
  }

  function attachGlobalEvents() {
    // Mobile Sidebar Toggle
    const toggleBtn = document.getElementById('sidebarMobileToggle');
    const sidebar = document.getElementById('app-sidebar');
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
    }

    // Close mobile sidebar on backdrop click
    document.addEventListener('click', (e) => {
      if (sidebar && sidebar.classList.contains('open')) {
        if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
          sidebar.classList.remove('open');
        }
      }
    });

    // Sidebar User Card Click -> Navigate to Profile Settings
    const userCard = document.querySelector('.sidebar-user-card');
    if (userCard) {
      userCard.style.cursor = 'pointer';
      userCard.title = 'Edit Profile Settings';
      userCard.addEventListener('click', () => {
        if (window.BellyBandRouter) window.BellyBandRouter.navigate('profile-settings');
      });
    }

    // Topbar User Menu Trigger Click -> Navigate to Profile Settings
    const userMenuTrigger = document.getElementById('userMenuTrigger');
    if (userMenuTrigger) {
      userMenuTrigger.style.cursor = 'pointer';
      userMenuTrigger.title = 'Edit Profile Settings';
      userMenuTrigger.addEventListener('click', () => {
        if (window.BellyBandRouter) window.BellyBandRouter.navigate('profile-settings');
      });
    }

    // Logout Action
    const logoutBtn = document.getElementById('btnAppLogout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (window.BellyBandAuth?.authController) {
          window.BellyBandAuth.authController.logout();
        }
        showToast('👋 Signed out of Healthcare Portal.');
        setTimeout(() => {
          window.location.href = '../../index.html?action=provider-login';
        }, 600);
      });
    }

    // Modal Global Confirm & Cancel
    const modalBackdrop = document.getElementById('appModalBackdrop');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const modalCancelBtn = document.getElementById('modalCancelBtn');
    const modalConfirmBtn = document.getElementById('modalConfirmBtn');

    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
    if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeModal);
    if (modalConfirmBtn) {
      modalConfirmBtn.addEventListener('click', () => {
        if (typeof modalCallback === 'function') {
          const shouldClose = modalCallback();
          if (shouldClose !== false) closeModal();
        } else {
          closeModal();
        }
      });
    }
    if (modalBackdrop) {
      modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) closeModal();
      });
    }
  }

  // ── Global Modal Helper ──
  function showModal({ title, body, confirmText = 'Confirm', onConfirm = null }) {
    const backdrop = document.getElementById('appModalBackdrop');
    const titleEl = document.getElementById('modalTitle');
    const bodyEl = document.getElementById('modalBody');
    const confirmBtn = document.getElementById('modalConfirmBtn');

    if (!backdrop || !titleEl || !bodyEl) return;

    titleEl.innerHTML = title || 'Healthcare Action';
    bodyEl.innerHTML = body || '';
    if (confirmBtn) confirmBtn.textContent = confirmText;
    modalCallback = onConfirm;

    backdrop.classList.add('open');
  }

  function closeModal() {
    const backdrop = document.getElementById('appModalBackdrop');
    if (backdrop) backdrop.classList.remove('open');
    modalCallback = null;
  }

  // ── Global Toast Helper ──
  function showToast(message, duration = 3500) {
    const shelf = document.getElementById('toast-shelf-container');
    if (!shelf) return;

    const toast = document.createElement('div');
    toast.className = 'app-toast-item';
    toast.innerHTML = `
      <span style="font-size:16px;">🌸</span>
      <span style="font-size:13px; line-height:1.4;">${message}</span>
    `;
    shelf.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px) scale(0.95)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  return {
    initLayout,
    renderSidebar,
    renderTopNav,
    showModal,
    closeModal,
    showToast
  };
});
