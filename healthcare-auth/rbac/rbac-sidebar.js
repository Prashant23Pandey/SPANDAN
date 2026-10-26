// ============================================================================
// File: healthcare-auth/rbac/rbac-sidebar.js
// MaaCare RBAC — Dynamic Sidebar Navigation + Top Navbar Component
// Renders only links the logged-in user's role has access to
// ============================================================================

'use strict';

class DynamicSidebar {
  constructor(roleNavMap) {
    this.roleNavMap = roleNavMap;
  }

  /** Main render method — called by RoleRouter after identity is loaded */
  render(identity) {
    this._renderTopNav(identity);
    this._renderSidebarNav(identity);
    this._renderMobileNav(identity);
    this._attachLogout();
  }

  // ── Top Navbar ──────────────────────────────────────────────────────────────
  _renderTopNav(identity) {
    const { name, userRole, roleMeta, facilityId } = identity;
    const meta = roleMeta || { label: 'User', color: '#6B7280', icon: '👤' };

    // Role badge
    const badge = document.getElementById('rbac-role-badge');
    if (badge) {
      badge.textContent = `${meta.icon} ${meta.label}`;
      badge.style.setProperty('--role-color', meta.color);
    }

    // User name
    const nameEl = document.getElementById('rbac-user-name');
    if (nameEl) nameEl.textContent = name || 'User';

    // Facility indicator
    const facilityEl = document.getElementById('rbac-facility-indicator');
    if (facilityEl) {
      facilityEl.textContent = facilityId ? `🏥 Facility #${facilityId}` : '🌐 Central System';
    }

    // Avatar initials
    const avatar = document.getElementById('rbac-avatar');
    if (avatar) {
      const initials = (name || 'U').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
      avatar.textContent = initials;
      avatar.style.background = meta.color;
    }

    // Sidebar role header
    const sideRoleLabel = document.getElementById('sidebar-role-label');
    if (sideRoleLabel) {
      sideRoleLabel.textContent = meta.label;
      sideRoleLabel.style.color = meta.color;
    }
    const sideUserName = document.getElementById('sidebar-user-name');
    if (sideUserName) sideUserName.textContent = name || 'User';
  }

  // ── Sidebar Navigation ──────────────────────────────────────────────────────
  _renderSidebarNav(identity) {
    const { userRole } = identity;
    const navItems = this.roleNavMap[userRole] || [];
    const navList  = document.getElementById('sidebar-nav-list');
    if (!navList) return;

    navList.innerHTML = navItems.map((item, idx) => `
      <li class="sidebar-nav-item" style="animation-delay: ${idx * 0.05}s">
        <a href="#${item.view}"
           id="${item.id}"
           class="sidebar-nav-link"
           data-view="${item.view}"
           data-section="${item.section}"
           onclick="window._rbacRouter?.navigateTo('${item.view}')"
           role="menuitem"
           aria-label="${item.label}">
          <span class="nav-icon" aria-hidden="true">${item.icon}</span>
          <span class="nav-label">${item.label}</span>
        </a>
      </li>
    `).join('');
  }

  // ── Mobile Bottom Navigation ────────────────────────────────────────────────
  _renderMobileNav(identity) {
    const { userRole } = identity;
    const navItems = (this.roleNavMap[userRole] || []).slice(0, 5); // max 5 items
    const mobileNav = document.getElementById('mobile-bottom-nav');
    if (!mobileNav) return;

    mobileNav.innerHTML = navItems.map(item => `
      <a href="#${item.view}"
         class="mobile-nav-item"
         data-view="${item.view}"
         onclick="window._rbacRouter?.navigateTo('${item.view}')"
         aria-label="${item.label}">
        <span class="mobile-nav-icon">${item.icon}</span>
        <span class="mobile-nav-label">${item.label}</span>
      </a>
    `).join('');
  }

  // ── Account Menu Toggle ─────────────────────────────────────────────────────
  _attachLogout() {
    // Account switcher toggle
    const trigger = document.getElementById('account-menu-trigger');
    const menu    = document.getElementById('account-dropdown-menu');
    if (trigger && menu) {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('open');
      });
      document.addEventListener('click', () => menu.classList.remove('open'));
    }

    // Logout
    const logoutBtn = document.getElementById('rbac-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        window._rbacGuard?.invalidateCache();
        // Call PHP logout
        try { await fetch('/BELLYBAND/healthcare-auth/php/hc-logout.php', { credentials: 'include' }); } catch {}
        window.location.href = '/BELLYBAND/index.html';
      });
    }

    // Sidebar mobile toggle
    const sidebarToggle  = document.getElementById('sidebar-mobile-toggle');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const sidebar        = document.getElementById('rbac-sidebar');

    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', () => {
        sidebar?.classList.toggle('open');
        sidebarOverlay?.classList.toggle('visible');
      });
    }
    if (sidebarOverlay) {
      sidebarOverlay.addEventListener('click', () => {
        sidebar?.classList.remove('open');
        sidebarOverlay?.classList.remove('visible');
      });
    }
  }
}
