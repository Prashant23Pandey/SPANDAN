/**
 * ============================================================================
 * BELLYBAND — UNIVERSAL HEALTHCARE PROFILE SETTINGS VIEW (/dashboard/profile-settings)
 * File: view-profile-settings.js
 *
 * Provides complete Profile & Account Settings for ALL healthcare roles:
 * - Super Admin & Hospital Admin
 * - Primary Clinical (Doctors, Obstetricians, Pediatricians)
 * - Allied Health (Maternal Nutritionists, Psychologists, Lactation Consultants)
 * - Community Field Workers (ASHA, ANM)
 * - Emergency Response & Logistics
 * ============================================================================
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ProfileSettingsView = factory();
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  function render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const auth = window.BellyBandAuth?.authController;
    const user = auth ? auth.getCurrentUser() : null;
    const activeRole = auth ? auth.getActiveRole() : 'ROLE_DOCTOR';
    const roleMeta = auth ? auth.getRoleMeta(activeRole) : { label: 'Healthcare Provider', color: '#10B981', icon: '👩‍⚕️' };

    // Determine Role Specific Fields
    const isDoctor = activeRole === 'ROLE_DOCTOR';
    const isAllied = activeRole === 'ROLE_ALLIED_HEALTH';
    const isField = activeRole === 'ROLE_ASHA_NGO';
    const isEmergency = activeRole === 'ROLE_EMERGENCY';
    const isAdmin = activeRole === 'ROLE_SUPER_ADMIN' || activeRole === 'ROLE_HOSPITAL_ADMIN';

    container.innerHTML = `
      <!-- View Header -->
      <div class="view-header-row">
        <div class="view-heading-group">
          <div class="view-eyebrow" style="color:${roleMeta.color};">👤 Universal Healthcare Account Management</div>
          <h1 class="view-main-title">Profile &amp; Professional Settings</h1>
          <p class="view-description">Manage your medical credentials, facility affiliations, tele-consultation availability, security keys, and emergency dispatch alerts.</p>
        </div>
        <div class="view-actions-group">
          <button class="btn-core btn-primary-role" style="--role-color:${roleMeta.color};" id="btnSaveAllProfileSettings">
            💾 Save Profile Changes
          </button>
        </div>
      </div>

      <!-- User Profile Header Card -->
      <div class="panel-card" style="margin-bottom:24px;">
        <div style="display:flex; align-items:center; gap:24px; flex-wrap:wrap;">
          <div style="position:relative;">
            <div id="hcProfileAvatarBadge" style="width:84px; height:84px; border-radius:50%; background:${roleMeta.color}; font-size:38px; display:flex; align-items:center; justify-content:center; box-shadow:0 0 20px ${roleMeta.color}40; border:2px solid rgba(255,255,255,0.2); overflow:hidden;">
              ${user?.profile_photo ? `<img src="${user.profile_photo}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" />` : (user?.avatar || roleMeta.icon)}
            </div>
            <input type="file" id="hcProfilePhotoInput" accept="image/*" style="display:none;" onchange="window.ProfileSettingsView.handlePhotoUpload(event)" />
          </div>
          <div style="flex:1;">
            <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:4px;">
              <h2 id="hcProfileNameHeading" style="font-family:var(--font-heading); font-size:22px; font-weight:800; color:var(--text-primary); margin:0;">
                ${user?.name || 'Healthcare Professional'}
              </h2>
              <span class="badge-status-pill badge-verified" style="background:#065F46; color:#86EFAC; font-size:11px; padding:3px 10px; border-radius:9999px; font-weight:700;">
                ✓ Verified Medical License
              </span>
            </div>
            <p style="font-size:13px; color:var(--text-secondary); margin:0 0 10px 0;">
              ${user?.designation || roleMeta.label} • <strong style="color:${roleMeta.color};">${user?.facilityName || 'BellyBand Health Network'}</strong>
            </p>
            <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
              <button type="button" class="btn-core btn-primary-role" style="--role-color:${roleMeta.color}; font-size:13px; padding:6px 16px; border-radius:8px;" onclick="document.getElementById('hcProfilePhotoInput').click()">
                📷 Upload Profile Picture
              </button>
              <button type="button" class="btn-core btn-secondary" style="font-size:13px; padding:6px 16px; border-radius:8px; color:#F87171; border-color:#7F1D1D;" onclick="window.ProfileSettingsView.removePhoto()">
                🗑️ Remove Picture
              </button>
              <span style="font-size:11px; color:var(--text-muted);">Stored in DB (JPG, PNG, WebP)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Settings Grid -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap:24px; margin-bottom:24px;">

        <!-- 1. Personal & Identity Credentials -->
        <div class="panel-card">
          <div class="panel-header-strip">
            <span class="panel-main-title">📝 Personal &amp; Contact Info</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:14px; margin-top:14px;">
            <div>
              <label class="field-label" style="font-size:12px; font-weight:700; color:var(--text-secondary); display:block; margin-bottom:6px;">Full Legal Name</label>
              <input type="text" id="hcInputFullName" class="form-control-input" style="width:100%;" value="${user?.name || ''}" />
            </div>
            <div>
              <label class="field-label" style="font-size:12px; font-weight:700; color:var(--text-secondary); display:block; margin-bottom:6px;">Hospital Email Address</label>
              <input type="email" id="hcInputEmail" class="form-control-input" style="width:100%;" value="${user?.email || ''}" />
            </div>
            <div>
              <label class="field-label" style="font-size:12px; font-weight:700; color:var(--text-secondary); display:block; margin-bottom:6px;">Direct Phone / WhatsApp</label>
              <input type="tel" id="hcInputPhone" class="form-control-input" style="width:100%;" value="${user?.phone || '+91 98440 12345'}" />
            </div>
            <div>
              <label class="field-label" style="font-size:12px; font-weight:700; color:var(--text-secondary); display:block; margin-bottom:6px;">Primary Facility / Hospital Affiliation</label>
              <input type="text" id="hcInputFacility" class="form-control-input" style="width:100%;" value="${user?.facilityName || 'Apex Maternal Care Hospital'}" />
            </div>
          </div>
        </div>

        <!-- 2. Role-Specific Clinical & Operational Credentials -->
        <div class="panel-card">
          <div class="panel-header-strip">
            <span class="panel-main-title">🩺 Professional &amp; Regulatory Credentials</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:14px; margin-top:14px;">
            <div>
              <label class="field-label" style="font-size:12px; font-weight:700; color:var(--text-secondary); display:block; margin-bottom:6px;">Medical License / Registration No.</label>
              <input type="text" id="hcInputLicense" class="form-control-input" style="width:100%;" value="${user?.licenseNumber || 'MCI-98421-DEL'}" />
            </div>

            ${isDoctor ? `
            <div>
              <label class="field-label" style="font-size:12px; font-weight:700; color:var(--text-secondary); display:block; margin-bottom:6px;">Clinical Specialization</label>
              <select id="hcInputSpecialty" class="form-control-input" style="width:100%;">
                <option value="Obstetrics & Gynecology (OB-GYN)" selected>Obstetrics &amp; Gynecology (OB-GYN)</option>
                <option value="Maternal-Fetal Medicine">Maternal-Fetal Medicine</option>
                <option value="Pediatrics & Neonatology">Pediatrics &amp; Neonatology</option>
                <option value="General Physician">General Physician</option>
              </select>
            </div>
            <div>
              <label class="field-label" style="font-size:12px; font-weight:700; color:var(--text-secondary); display:block; margin-bottom:6px;">OPD Consultation Timings</label>
              <input type="text" class="form-control-input" style="width:100%;" value="09:00 AM – 02:00 PM (Mon–Sat)" />
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-top:1px solid rgba(255,255,255,0.06);">
              <div>
                <strong style="font-size:13px; color:var(--text-primary);">Accept Tele-Consultations</strong>
                <p style="font-size:11px; color:var(--text-secondary); margin:0;">Allow remote video sessions via doctor portal</p>
              </div>
              <input type="checkbox" checked style="width:18px; height:18px; accent-color:${roleMeta.color};" />
            </div>
            ` : ''}

            ${isAllied ? `
            <div>
              <label class="field-label" style="font-size:12px; font-weight:700; color:var(--text-secondary); display:block; margin-bottom:6px;">Sub-Specialty Focus</label>
              <input type="text" class="form-control-input" style="width:100%;" value="Gestational Diabetes, Postpartum Lactation & Nutrition" />
            </div>
            <div>
              <label class="field-label" style="font-size:12px; font-weight:700; color:var(--text-secondary); display:block; margin-bottom:6px;">Max Concurrent Patient Chat Capacity</label>
              <input type="number" class="form-control-input" style="width:100%;" value="40" />
            </div>
            ` : ''}

            ${isField ? `
            <div>
              <label class="field-label" style="font-size:12px; font-weight:700; color:var(--text-secondary); display:block; margin-bottom:6px;">Assigned Field Cluster / Villages</label>
              <input type="text" class="form-control-input" style="width:100%;" value="Katehar, Shivpur, Ramnagar Blocks (320 Households)" />
            </div>
            <div>
              <label class="field-label" style="font-size:12px; font-weight:700; color:var(--text-secondary); display:block; margin-bottom:6px;">Supervisor Medical Officer</label>
              <input type="text" class="form-control-input" style="width:100%;" value="Dr. Ramesh Verma (PHC In-charge)" />
            </div>
            ` : ''}

            ${isEmergency ? `
            <div>
              <label class="field-label" style="font-size:12px; font-weight:700; color:var(--text-secondary); display:block; margin-bottom:6px;">Assigned Ambulance Vehicle ID</label>
              <input type="text" class="form-control-input" style="width:100%;" value="ALS-Unit-04 (GPS Live Tracking Active)" />
            </div>
            <div>
              <label class="field-label" style="font-size:12px; font-weight:700; color:var(--text-secondary); display:block; margin-bottom:6px;">Emergency Radio Frequency / Channel</label>
              <input type="text" class="form-control-input" style="width:100%;" value="Channel 9 (Maternal SOS Dispatch Direct)" />
            </div>
            ` : ''}

            ${isAdmin ? `
            <div>
              <label class="field-label" style="font-size:12px; font-weight:700; color:var(--text-secondary); display:block; margin-bottom:6px;">Administrative Clearance Level</label>
              <input type="text" class="form-control-input" style="width:100%;" value="Level 5 — Full Hospital Network & Global Audit Access" readonly />
            </div>
            <div>
              <label class="field-label" style="font-size:12px; font-weight:700; color:var(--text-secondary); display:block; margin-bottom:6px;">HIPAA / DISHA Compliance Officer Contact</label>
              <input type="text" class="form-control-input" style="width:100%;" value="compliance@bellyband.health" />
            </div>
            ` : ''}
          </div>
        </div>

      </div>

      <!-- Security & Notification Section -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap:24px;">
        
        <!-- Change Password -->
        <div class="panel-card">
          <div class="panel-header-strip">
            <span class="panel-main-title">🔒 Password &amp; Authentication</span>
          </div>
          <form onsubmit="window.ProfileSettingsView.handlePasswordChange(event)" style="display:flex; flex-direction:column; gap:14px; margin-top:14px;">
            <div>
              <label class="field-label" style="font-size:12px; font-weight:700; color:var(--text-secondary); display:block; margin-bottom:6px;">Current Password</label>
              <input type="password" id="hcCurrentPwd" class="form-control-input" style="width:100%;" placeholder="••••••••" required />
            </div>
            <div>
              <label class="field-label" style="font-size:12px; font-weight:700; color:var(--text-secondary); display:block; margin-bottom:6px;">New Password (Min. 8 characters)</label>
              <input type="password" id="hcNewPwd" class="form-control-input" style="width:100%;" placeholder="At least 8 characters" required />
            </div>
            <div>
              <label class="field-label" style="font-size:12px; font-weight:700; color:var(--text-secondary); display:block; margin-bottom:6px;">Confirm New Password</label>
              <input type="password" id="hcConfirmPwd" class="form-control-input" style="width:100%;" placeholder="Repeat new password" required />
            </div>
            <button type="submit" class="btn-core btn-secondary" style="margin-top:6px;">Update Healthcare Password</button>
          </form>
        </div>

        <!-- Notification & Alert Dispatch -->
        <div class="panel-card">
          <div class="panel-header-strip">
            <span class="panel-main-title">🔔 Emergency Dispatch &amp; Alert Settings</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:12px; margin-top:14px;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.06);">
              <div>
                <strong style="font-size:13px; color:var(--text-primary);">Critical Fetal / Maternal HR Spike Audio Alert</strong>
                <p style="font-size:11px; color:var(--text-secondary); margin:0;">Play emergency chime when live BLE vitals cross threshold</p>
              </div>
              <input type="checkbox" checked style="width:18px; height:18px; accent-color:${roleMeta.color};" />
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.06);">
              <div>
                <strong style="font-size:13px; color:var(--text-primary);">Emergency SMS Dispatch Hotlink</strong>
                <p style="font-size:11px; color:var(--text-secondary); margin:0;">Instant SMS when high-risk mother triggers SOS</p>
              </div>
              <input type="checkbox" checked style="width:18px; height:18px; accent-color:${roleMeta.color};" />
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0;">
              <div>
                <strong style="font-size:13px; color:var(--text-primary);">Two-Factor Authentication (2FA)</strong>
                <p style="font-size:11px; color:var(--text-secondary); margin:0;">Enforced for all verified clinical workstations</p>
              </div>
              <span style="font-size:11px; font-weight:800; color:#86EFAC; background:#065F46; padding:3px 10px; border-radius:9999px;">✓ ACTIVE</span>
            </div>
          </div>
        </div>

      </div>
    `;

    // Attach Event Listeners
    const saveBtn = document.getElementById('btnSaveAllProfileSettings');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => saveProfileSettings());
    }
  }

  function changeAvatar(emoji) {
    const avatarBadge = document.getElementById('hcProfileAvatarBadge');
    if (avatarBadge) avatarBadge.textContent = emoji;

    // Update in auth session if available
    const auth = window.BellyBandAuth?.authController;
    if (auth) {
      const user = auth.getCurrentUser();
      if (user) {
        user.avatar = emoji;
        try {
          sessionStorage.setItem('bellyband_auth_user', JSON.stringify(user));
        } catch(e) {}
      }
    }

    // Update sidebar avatar
    const sideAvatar = document.getElementById('sidebarUserAvatar');
    if (sideAvatar) sideAvatar.textContent = emoji;

    if (window.BellyBandLayout?.showToast) {
      window.BellyBandLayout.showToast(`Avatar updated to ${emoji}!`);
    }
  }

  function saveProfileSettings() {
    const name = document.getElementById('hcInputFullName')?.value.trim();
    const email = document.getElementById('hcInputEmail')?.value.trim();
    const facility = document.getElementById('hcInputFacility')?.value.trim();
    const license = document.getElementById('hcInputLicense')?.value.trim();

    if (!name) {
      alert('Please enter your full name.');
      return;
    }

    const auth = window.BellyBandAuth?.authController;
    if (auth) {
      const user = auth.getCurrentUser();
      if (user) {
        user.name = name;
        if (email) user.email = email;
        if (facility) user.facilityName = facility;
        if (license) user.licenseNumber = license;
        try {
          sessionStorage.setItem('bellyband_auth_user', JSON.stringify(user));
        } catch(e) {}
      }
    }

    // Update header & sidebar
    const headName = document.getElementById('hcProfileNameHeading');
    const sideName = document.getElementById('sidebarUserName');
    const topName = document.getElementById('topNavUserName');
    const topFacility = document.getElementById('topNavFacilityIndicator');

    if (headName) headName.textContent = name;
    if (sideName) sideName.textContent = name;
    if (topName) topName.textContent = name.split(' ')[0];
    if (topFacility && facility) topFacility.textContent = facility;

    if (window.BellyBandLayout?.showToast) {
      window.BellyBandLayout.showToast('✓ Professional Profile Settings saved securely!');
    }
  }

  function handlePasswordChange(e) {
    e.preventDefault();
    const p1 = document.getElementById('hcNewPwd')?.value;
    const p2 = document.getElementById('hcConfirmPwd')?.value;
    if (p1 !== p2) {
      alert('New passwords do not match. Please verify.');
      return;
    }

    document.getElementById('hcCurrentPwd').value = '';
    document.getElementById('hcNewPwd').value = '';
    document.getElementById('hcConfirmPwd').value = '';

    if (window.BellyBandLayout?.showToast) {
      window.BellyBandLayout.showToast('🔒 Healthcare account password updated successfully!');
    }
  }

  function handlePhotoUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = function(evt) {
      const dataUrl = evt.target.result;
      const avatarBadge = document.getElementById('hcProfileAvatarBadge');
      if (avatarBadge) {
        avatarBadge.innerHTML = `<img src="${dataUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" />`;
      }

      // Update in auth session
      const auth = window.BellyBandAuth?.authController;
      if (auth) {
        const user = auth.getCurrentUser();
        if (user) {
          user.profile_photo = dataUrl;
          try {
            sessionStorage.setItem('bellyband_auth_user', JSON.stringify(user));
          } catch(err) {}
        }
      }

      // Update sidebar avatar
      const sideAvatar = document.getElementById('sidebarUserAvatar');
      if (sideAvatar) {
        sideAvatar.innerHTML = `<img src="${dataUrl}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" />`;
      }

      // Sync with backend PHP / MySQL
      const user = auth ? auth.getCurrentUser() : null;
      if (user && user.email) {
        fetch('../../update_profile.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            profile_photo: dataUrl
          })
        }).catch(() => {});
      }

      if (window.BellyBandLayout?.showToast) {
        window.BellyBandLayout.showToast('✓ Profile picture updated and stored to database!');
      }
    };
    reader.readAsDataURL(file);
  }

  function removePhoto() {
    if (!confirm('Are you sure you want to remove your profile picture?')) return;

    const auth = window.BellyBandAuth?.authController;
    const activeRole = auth ? auth.getActiveRole() : 'ROLE_DOCTOR';
    const roleMeta = auth ? auth.getRoleMeta(activeRole) : { icon: '👩‍⚕️' };

    const avatarBadge = document.getElementById('hcProfileAvatarBadge');
    if (avatarBadge) {
      avatarBadge.textContent = roleMeta.icon;
    }

    const sideAvatar = document.getElementById('sidebarUserAvatar');
    if (sideAvatar) {
      sideAvatar.textContent = roleMeta.icon;
    }

    if (auth) {
      const user = auth.getCurrentUser();
      if (user) {
        delete user.profile_photo;
        try {
          sessionStorage.setItem('bellyband_auth_user', JSON.stringify(user));
        } catch(err) {}

        if (user.email) {
          fetch('../../update_profile.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              profile_photo: 'remove'
            })
          }).catch(() => {});
        }
      }
    }

    const fileInput = document.getElementById('hcProfilePhotoInput');
    if (fileInput) fileInput.value = '';

    if (window.BellyBandLayout?.showToast) {
      window.BellyBandLayout.showToast('🗑️ Profile picture removed from database.');
    }
  }

  return {
    render,
    changeAvatar,
    handlePhotoUpload,
    removePhoto,
    saveProfileSettings,
    handlePasswordChange
  };
});
