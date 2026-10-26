/**
 * ============================================================================
 * BELLYBAND — Healthcare Auth System
 * File: hc-auth.js
 * Handles: Step navigation, cascading dropdowns, OTP simulation,
 *          password strength meter, form validation, file upload UI
 * ============================================================================
 */

'use strict';

/* ─────────────────────────────────────────────
   1. DEPARTMENT → ROLE TAXONOMY (Cascading Data)
   ───────────────────────────────────────────── */
const HC_DEPARTMENTS = [
  {
    id: 1, key: 'clinical_services',
    name: 'Clinical Services', icon: '🩺',
    requiresLicense: true,
    roles: [
      { id: 1,  key: 'obgyn',                      name: 'Obstetrician / Gynecologist (OB-GYN)' },
      { id: 2,  key: 'general_physician',           name: 'General Physician' },
      { id: 3,  key: 'mfm_specialist',              name: 'Maternal-Fetal Specialist' },
      { id: 4,  key: 'pediatrician_neonatologist',  name: 'Pediatrician / Neonatologist' },
    ]
  },
  {
    id: 2, key: 'allied_health',
    name: 'Allied Health & Therapy', icon: '💊',
    requiresLicense: true,
    roles: [
      { id: 5,  key: 'maternal_nutritionist',    name: 'Maternal Nutritionist / Dietitian' },
      { id: 6,  key: 'mental_health_counselor',  name: 'Prenatal Mental Health Counselor' },
      { id: 7,  key: 'physiotherapist',          name: 'Physiotherapist' },
      { id: 8,  key: 'lactation_consultant',     name: 'Lactation Consultant' },
    ]
  },
  {
    id: 3, key: 'community_field_health',
    name: 'Community & Field Health', icon: '🌿',
    requiresLicense: true,
    roles: [
      { id: 9,  key: 'asha_anm_worker',              name: 'ASHA / ANM Worker' },
      { id: 10, key: 'community_health_volunteer',   name: 'Community Health Volunteer' },
      { id: 11, key: 'ngo_field_lead',               name: 'NGO Field Lead' },
    ]
  },
  {
    id: 4, key: 'emergency_operations',
    name: 'Emergency & Operations', icon: '🚑',
    requiresLicense: true,
    roles: [
      { id: 12, key: 'emergency_responder',        name: 'On-Call Emergency Responder' },
      { id: 13, key: 'ambulance_coordinator',      name: 'Ambulance Logistics Coordinator' },
      { id: 14, key: 'hospital_admissions_staff',  name: 'Hospital Admissions Staff' },
    ]
  },
  {
    id: 5, key: 'personal_care_network',
    name: 'Personal Care Network', icon: '👨‍👩‍👧',
    requiresLicense: false,
    roles: [
      { id: 15, key: 'expectant_mother',    name: 'Expectant Mother' },
      { id: 16, key: 'partner_husband',     name: 'Partner / Husband' },
      { id: 17, key: 'secondary_caregiver', name: 'Secondary Caregiver / Family Member' },
    ]
  }
];

/* ─────────────────────────────────────────────
   2. STATE
   ───────────────────────────────────────────── */
const state = {
  currentStep:       1,
  totalSteps:        4,
  selectedDeptId:    null,
  selectedRoleId:    null,
  requiresLicense:   true,
  phoneVerified:     false,
  otpSent:           false,
  otpTimer:          null,
  uploadedFileName:  null,
  twoFaEnabled:      false,
  twoFaMethod:       null,
};

/* ─────────────────────────────────────────────
   3. INIT
   ───────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  buildDeptCards();
  bindEvents();
  updateProgressUI();
});

/* ─────────────────────────────────────────────
   4. BUILD DEPARTMENT CARDS
   ───────────────────────────────────────────── */
function buildDeptCards() {
  const container = document.getElementById('hcDeptCards');
  if (!container) return;

  container.innerHTML = '';
  HC_DEPARTMENTS.forEach(dept => {
    const card = document.createElement('div');
    card.className = 'hc-dept-card';
    card.dataset.deptId = dept.id;
    card.innerHTML = `
      <span class="hc-dept-icon">${dept.icon}</span>
      <span class="hc-dept-name">${dept.name}</span>
      <span class="hc-dept-badge">${dept.roles.length} role${dept.roles.length > 1 ? 's' : ''}</span>
    `;
    card.addEventListener('click', () => selectDepartment(dept.id));
    container.appendChild(card);
  });
}

/* ─────────────────────────────────────────────
   5. DEPARTMENT SELECTION
   ───────────────────────────────────────────── */
function selectDepartment(deptId) {
  state.selectedDeptId  = deptId;
  state.selectedRoleId  = null;

  // Highlight selected card
  document.querySelectorAll('.hc-dept-card').forEach(c => c.classList.remove('selected'));
  const chosen = document.querySelector(`.hc-dept-card[data-dept-id="${deptId}"]`);
  if (chosen) chosen.classList.add('selected');

  // Populate cascading role dropdown
  const dept = HC_DEPARTMENTS.find(d => d.id === deptId);
  state.requiresLicense = dept.requiresLicense;

  const roleWrap   = document.getElementById('hcRoleSelectWrap');
  const roleSelect = document.getElementById('hcRoleSelect');
  if (roleWrap && roleSelect) {
    roleSelect.innerHTML = '<option value="">— Select your role —</option>';
    dept.roles.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = r.name;
      roleSelect.appendChild(opt);
    });
    roleWrap.classList.add('visible');
  }

  // Show/hide license notice for Step 3
  const skipNotice = document.getElementById('hcStep3SkipNotice');
  if (skipNotice) {
    skipNotice.style.display = state.requiresLicense ? 'none' : 'flex';
  }

  clearFieldError('hcDeptError');
}

/* ─────────────────────────────────────────────
   6. STEP NAVIGATION
   ───────────────────────────────────────────── */
function goToStep(target) {
  const from = state.currentStep;
  const to   = Math.max(1, Math.min(state.totalSteps, target));

  // Skip Step 3 for Personal Care Network
  const resolvedTo = resolveStep(from, to);

  // Animate panels
  const oldPanel = document.getElementById(`hcStep${from}`);
  const newPanel = document.getElementById(`hcStep${resolvedTo}`);
  if (oldPanel) oldPanel.classList.remove('active');
  if (newPanel) newPanel.classList.add('active');

  state.currentStep = resolvedTo;
  updateProgressUI();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resolveStep(from, target) {
  // Step 3 is credentials — skip if no license required
  if (target === 3 && !state.requiresLicense) {
    return target < from ? 2 : 4; // going back → 2, going forward → 4
  }
  return target;
}

function nextStep() {
  if (!validateStep(state.currentStep)) return;
  goToStep(state.currentStep + 1);
}

function prevStep() {
  goToStep(state.currentStep - 1);
}

/* ─────────────────────────────────────────────
   7. PROGRESS UI UPDATE
   ───────────────────────────────────────────── */
function updateProgressUI() {
  const fill = document.getElementById('hcProgressFill');
  if (fill) {
    const pct = ((state.currentStep - 1) / (state.totalSteps - 1)) * 100;
    fill.style.width = pct + '%';
  }

  for (let i = 1; i <= state.totalSteps; i++) {
    const label = document.getElementById(`hcStepLabel${i}`);
    if (!label) continue;
    label.classList.remove('active', 'done');
    if (i === state.currentStep) label.classList.add('active');
    else if (i < state.currentStep) label.classList.add('done');
  }
}

/* ─────────────────────────────────────────────
   8. STEP VALIDATION
   ───────────────────────────────────────────── */
function validateStep(step) {
  let valid = true;

  if (step === 1) {
    valid = validateRequired('hcFullName',   'hcFullNameError',  'Full name is required.') && valid;
    valid = validateEmail  ('hcEmail',       'hcEmailError')                                && valid;
    valid = validatePhone  ('hcPhone',       'hcPhoneError')                                && valid;
    valid = validateRequired('hcEmergency',  'hcEmergencyError', 'Emergency contact is required.') && valid;
    if (!state.phoneVerified) {
      showFieldError('hcPhoneError', 'Please verify your phone number with OTP.');
      valid = false;
    }
  }

  if (step === 2) {
    if (!state.selectedDeptId) {
      showFieldError('hcDeptError', 'Please select a department.');
      valid = false;
    }
    if (!document.getElementById('hcRoleSelect')?.value) {
      showFieldError('hcRoleError', 'Please select your role.');
      valid = false;
    }
    valid = validateRequired('hcFacility', 'hcFacilityError', 'Facility / hospital name is required.') && valid;
    if (valid) {
      state.selectedRoleId = parseInt(document.getElementById('hcRoleSelect').value, 10);
    }
  }

  if (step === 3 && state.requiresLicense) {
    valid = validateRequired('hcLicenseNo',   'hcLicenseNoError',  'License / registration number is required.') && valid;
    valid = validateRequired('hcLicenseBody', 'hcLicenseBodyError','Licensing body is required.')                && valid;
    if (!state.uploadedFileName) {
      showFieldError('hcUploadError', 'Please upload your license document (PDF or JPEG).');
      valid = false;
    }
  }

  if (step === 4) {
    valid = validatePassword('hcPassword', 'hcPasswordError') && valid;
    valid = validateConfirm ('hcPassword', 'hcConfirm', 'hcConfirmError') && valid;
  }

  return valid;
}

/* ─────────────────────────────────────────────
   9. INDIVIDUAL VALIDATORS
   ───────────────────────────────────────────── */
function validateRequired(fieldId, errorId, msg) {
  const el = document.getElementById(fieldId);
  if (!el || !el.value.trim()) {
    showFieldError(errorId, msg);
    el && el.classList.add('error');
    return false;
  }
  clearFieldError(errorId);
  el.classList.remove('error');
  el.classList.add('success');
  return true;
}

function validateEmail(fieldId, errorId) {
  const el  = document.getElementById(fieldId);
  const val = el ? el.value.trim() : '';
  const re  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(val)) {
    showFieldError(errorId, 'Please enter a valid email address.');
    el && el.classList.add('error');
    return false;
  }
  clearFieldError(errorId);
  el.classList.remove('error'); el.classList.add('success');
  return true;
}

function validatePhone(fieldId, errorId) {
  const el  = document.getElementById(fieldId);
  const val = el ? el.value.trim().replace(/\s/g, '') : '';
  if (!/^\+?[0-9]{10,15}$/.test(val)) {
    showFieldError(errorId, 'Enter a valid phone number (10–15 digits).');
    el && el.classList.add('error');
    return false;
  }
  clearFieldError(errorId);
  el.classList.remove('error'); el.classList.add('success');
  return true;
}

function validatePassword(fieldId, errorId) {
  const el  = document.getElementById(fieldId);
  const val = el ? el.value : '';
  const rules = getPasswordRules(val);
  if (!rules.every(r => r.pass)) {
    showFieldError(errorId, 'Password does not meet the minimum requirements.');
    el && el.classList.add('error');
    return false;
  }
  clearFieldError(errorId);
  el.classList.remove('error'); el.classList.add('success');
  return true;
}

function validateConfirm(pwdId, confirmId, errorId) {
  const pwd     = document.getElementById(pwdId)?.value || '';
  const confirm = document.getElementById(confirmId)?.value || '';
  const el      = document.getElementById(confirmId);
  if (pwd !== confirm) {
    showFieldError(errorId, 'Passwords do not match.');
    el && el.classList.add('error');
    return false;
  }
  clearFieldError(errorId);
  el && el.classList.remove('error');
  el && el.classList.add('success');
  return true;
}

/* ─────────────────────────────────────────────
   10. FIELD ERROR HELPERS
   ───────────────────────────────────────────── */
function showFieldError(errorId, msg) {
  const el = document.getElementById(errorId);
  if (!el) return;
  el.textContent = '⚠ ' + msg;
  el.classList.add('show');
}
function clearFieldError(errorId) {
  const el = document.getElementById(errorId);
  if (el) el.classList.remove('show');
}

/* ─────────────────────────────────────────────
   11. OTP SIMULATION
   ───────────────────────────────────────────── */
function sendOTP() {
  const phone = document.getElementById('hcPhone')?.value.trim();
  if (!phone || !/^\+?[0-9]{10,15}$/.test(phone.replace(/\s/g, ''))) {
    showFieldError('hcPhoneError', 'Enter a valid phone number before sending OTP.');
    return;
  }
  clearFieldError('hcPhoneError');

  // Simulate OTP send
  const btn     = document.getElementById('hcOtpBtn');
  const otpRow  = document.getElementById('hcOtpInputRow');
  const simCode = Math.floor(100000 + Math.random() * 900000);

  state.otpSent     = true;
  state.simulatedOTP = String(simCode);

  if (otpRow) otpRow.style.display = 'flex';

  // Show simulated code in dev (toast-style alert)
  showAlert('hcGlobalAlert', `[DEV MODE] OTP sent to ${phone}. Code: ${simCode}`, 'info');

  // Start countdown
  let secs = 30;
  if (btn) {
    btn.disabled = true;
    const countdown = setInterval(() => {
      btn.textContent = `Resend (${--secs}s)`;
      if (secs <= 0) {
        clearInterval(countdown);
        btn.disabled    = false;
        btn.textContent = 'Resend OTP';
      }
    }, 1000);
  }
}

function verifyOTP() {
  const entered = document.getElementById('hcOtpCode')?.value.trim();
  if (entered === state.simulatedOTP) {
    state.phoneVerified = true;
    const badge = document.getElementById('hcOtpVerifiedBadge');
    const row   = document.getElementById('hcOtpInputRow');
    if (badge) badge.classList.add('show');
    if (row)   row.style.display = 'none';
    showAlert('hcGlobalAlert', 'Phone number verified successfully! ✓', 'success');
    clearFieldError('hcPhoneError');
  } else {
    showFieldError('hcOtpError', 'Invalid OTP. Please check the code and try again.');
  }
}

/* ─────────────────────────────────────────────
   12. PASSWORD STRENGTH METER
   ───────────────────────────────────────────── */
function getPasswordRules(val) {
  return [
    { key: 'len',    label: '12+ characters',       pass: val.length >= 12 },
    { key: 'upper',  label: 'Uppercase letter',      pass: /[A-Z]/.test(val) },
    { key: 'lower',  label: 'Lowercase letter',      pass: /[a-z]/.test(val) },
    { key: 'num',    label: 'Number (0–9)',           pass: /[0-9]/.test(val) },
    { key: 'sym',    label: 'Special symbol (!@#…)', pass: /[^A-Za-z0-9]/.test(val) },
  ];
}

function onPasswordInput() {
  const val   = document.getElementById('hcPassword')?.value || '';
  const rules = getPasswordRules(val);
  const score = rules.filter(r => r.pass).length;

  // Update bar
  const bar = document.getElementById('hcStrengthBar');
  if (bar) {
    bar.className = 'hc-strength-bar strength-' + (val.length === 0 ? 0 : Math.max(1, score));
  }

  // Update label
  const labels = ['', 'Very Weak', 'Weak', 'Good', 'Strong', 'Excellent'];
  const lbl = document.getElementById('hcStrengthLabel');
  if (lbl) lbl.textContent = val.length ? labels[Math.max(1, score)] : '';

  // Update rule chips
  rules.forEach(r => {
    const el = document.getElementById('rule_' + r.key);
    if (!el) return;
    el.classList.toggle('pass', r.pass);
    const icon = el.querySelector('.rule-icon');
    if (icon) icon.textContent = r.pass ? '✓' : '';
  });
}

/* ─────────────────────────────────────────────
   13. FILE UPLOAD UI
   ───────────────────────────────────────────── */
function onFileChange(input) {
  const file = input.files[0];
  if (!file) return;

  const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  if (!allowed.includes(file.type)) {
    showFieldError('hcUploadError', 'Only PDF, JPEG, or PNG files are accepted.');
    input.value = '';
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showFieldError('hcUploadError', 'File size must not exceed 5 MB.');
    input.value = '';
    return;
  }

  state.uploadedFileName = file.name;
  clearFieldError('hcUploadError');

  const badge = document.getElementById('hcUploadSelected');
  if (badge) {
    badge.querySelector('.upload-name').textContent = file.name;
    badge.classList.add('show');
  }
}

/* ─────────────────────────────────────────────
   14. 2FA TOGGLE
   ───────────────────────────────────────────── */
function on2FAToggle(checkbox) {
  state.twoFaEnabled = checkbox.checked;
  const opts = document.getElementById('hc2FAOptions');
  const card = document.getElementById('hc2FACard');
  if (opts) opts.classList.toggle('show', state.twoFaEnabled);
  if (card) card.classList.toggle('enabled', state.twoFaEnabled);
}

function on2FAMethodSelect(value) {
  state.twoFaMethod = value;
}

/* ─────────────────────────────────────────────
   15. TOGGLE PASSWORD VISIBILITY
   ───────────────────────────────────────────── */
function togglePwd(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁';
  }
}

/* ─────────────────────────────────────────────
   16. ALERT HELPER
   ───────────────────────────────────────────── */
function showAlert(id, msg, type = 'info') {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `hc-alert ${type} show`;
  el.innerHTML = `<span>${type === 'error' ? '✗' : type === 'success' ? '✓' : 'ℹ'}</span><span>${msg}</span>`;

  clearTimeout(el._timer);
  if (type !== 'error') {
    el._timer = setTimeout(() => el.classList.remove('show'), 5000);
  }
}

/* ─────────────────────────────────────────────
   17. FINAL FORM SUBMISSION (Registration)
   ───────────────────────────────────────────── */
function submitRegistration(e) {
  e.preventDefault();
  if (!validateStep(state.currentStep)) return;

  const btn = document.getElementById('hcSubmitBtn');
  if (btn) btn.classList.add('loading');

  // Collect form data
  const formData = new FormData();
  formData.append('full_name',       document.getElementById('hcFullName')?.value.trim()    || '');
  formData.append('email',           document.getElementById('hcEmail')?.value.trim()        || '');
  formData.append('phone',           document.getElementById('hcPhone')?.value.trim()        || '');
  formData.append('emergency_contact', document.getElementById('hcEmergency')?.value.trim() || '');
  formData.append('department_id',   state.selectedDeptId  || '');
  formData.append('role_id',         state.selectedRoleId  || '');
  formData.append('facility_name',   document.getElementById('hcFacility')?.value.trim()    || '');
  formData.append('license_number',  document.getElementById('hcLicenseNo')?.value.trim()   || '');
  formData.append('licensing_body',  document.getElementById('hcLicenseBody')?.value.trim() || '');
  formData.append('password',        document.getElementById('hcPassword')?.value            || '');
  formData.append('two_fa_enabled',  state.twoFaEnabled ? 1 : 0);
  formData.append('two_fa_method',   state.twoFaMethod || '');

  const fileInput = document.getElementById('hcLicenseFile');
  if (fileInput && fileInput.files[0]) {
    formData.append('license_doc', fileInput.files[0]);
  }

  fetch('../php/hc-register.php', {
    method: 'POST',
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
    body: formData,
  })
    .then(r => r.json())
    .then(data => {
      if (btn) btn.classList.remove('loading');
      if (data.success) {
        showAlert('hcGlobalAlert', data.message || 'Registration successful!', 'success');
        setTimeout(() => { window.location.href = data.redirect || 'dashboard.html'; }, 1500);
      } else {
        showAlert('hcGlobalAlert', data.message || 'Registration failed. Please try again.', 'error');
      }
    })
    .catch(() => {
      if (btn) btn.classList.remove('loading');
      showAlert('hcGlobalAlert', 'Network error. Please check your connection and try again.', 'error');
    });
}

/* ─────────────────────────────────────────────
   18. LOGIN FORM SUBMISSION & ROUTING
   ───────────────────────────────────────────── */
function submitLogin(e) {
  e.preventDefault();

  const email = document.getElementById('hcLoginEmail')?.value.trim() || '';
  const pwd   = document.getElementById('hcLoginPwd')?.value           || '';
  let valid = true;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showFieldError('hcLoginEmailError', 'Enter a valid email address.');
    valid = false;
  } else clearFieldError('hcLoginEmailError');

  if (!pwd) {
    showFieldError('hcLoginPwdError', 'Password is required.');
    valid = false;
  } else clearFieldError('hcLoginPwdError');

  if (!valid) return;

  const btn = document.getElementById('hcLoginBtn');
  if (btn) btn.classList.add('loading');

  // Hardcoded Super Admin / Client-Side Seed Quick Auth
  const isSuperAdminEmail = (email.toLowerCase() === '23prashantpandey@bellyband.co.in');
  if (isSuperAdminEmail && pwd === 'ANURAGp23@') {
    const superAdminUser = {
      id: 1,
      name: 'Prashant Pandey',
      email: '23prashantpandey@bellyband.co.in',
      password: 'ANURAGp23@',
      role: 'ROLE_SUPER_ADMIN',
      facilityName: 'BellyBand Global HQ',
      department: 'Platform Engineering & Governance',
      designation: 'Platform Owner & Super Admin',
      status: 'verified',
      avatar: '👑',
      themeColor: '#8B5CF6'
    };
    try {
      sessionStorage.setItem('bellyband_auth_user', JSON.stringify(superAdminUser));
    } catch(e) {}
    setTimeout(() => {
      if (btn) btn.classList.remove('loading');
      window.location.href = 'dashboards/index.html#super-admin';
    }, 400);
    return;
  }

  // Check backend PHP endpoint or fallback
  fetch('php/hc-login.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: new URLSearchParams({ email, password: pwd }),
  })
    .then(r => r.json())
    .then(data => {
      if (btn) btn.classList.remove('loading');
      if (data.success) {
        // Direct to new modular dashboard suite
        if (data.user?.role === 'ROLE_SUPER_ADMIN' || isSuperAdminEmail) {
          window.location.href = 'dashboards/index.html#super-admin';
        } else {
          window.location.href = data.redirect || 'dashboards/index.html';
        }
      } else {
        showAlert('hcLoginAlert', data.message || 'Invalid credentials.', 'error');
      }
    })
    .catch(() => {
      // Offline / standalone fallback simulation
      if (isSuperAdminEmail && pwd === 'ANURAGp23@') {
        window.location.href = 'dashboards/index.html#super-admin';
      } else {
        if (btn) btn.classList.remove('loading');
        showAlert('hcLoginAlert', 'Invalid credentials or server connection issue. For Super Admin, use: 23prashantpandey@bellyband.co.in / ANURAGp23@', 'error');
      }
    });
}

/* ─────────────────────────────────────────────
   19. DRAG & DROP UPLOAD
   ───────────────────────────────────────────── */
function bindEvents() {
  const zone = document.getElementById('hcUploadZone');
  if (zone) {
    zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const input = document.getElementById('hcLicenseFile');
      if (input && e.dataTransfer.files.length) {
        input.files = e.dataTransfer.files;
        onFileChange(input);
      }
    });
  }

  // Live password input
  const pwdInput = document.getElementById('hcPassword');
  if (pwdInput) pwdInput.addEventListener('input', onPasswordInput);

  // Role select change
  const roleSelect = document.getElementById('hcRoleSelect');
  if (roleSelect) {
    roleSelect.addEventListener('change', function () {
      state.selectedRoleId = parseInt(this.value, 10) || null;
      clearFieldError('hcRoleError');
    });
  }
}

// Expose globals needed by inline onclick handlers
window.nextStep          = nextStep;
window.prevStep          = prevStep;
window.sendOTP           = sendOTP;
window.verifyOTP         = verifyOTP;
window.togglePwd         = togglePwd;
window.on2FAToggle       = on2FAToggle;
window.on2FAMethodSelect = on2FAMethodSelect;
window.onFileChange      = onFileChange;
window.submitRegistration = submitRegistration;
window.submitLogin       = submitLogin;
