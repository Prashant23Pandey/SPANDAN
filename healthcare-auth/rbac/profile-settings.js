/* ============================================================================
   File: healthcare-auth/rbac/profile-settings.js
   Account & Profile Settings (Universal, multi-role)
   - Tabs/left-nav
   - Avatar upload + client-side crop/compress + preview
   - Conditional role sections
   - Dirty-state warning + router navigation guard
   - REST calls:
       GET/PUT  http://localhost:3001/api/v1/user/profile
       PUT      http://localhost:3001/api/v1/user/password
       POST     http://localhost:3001/api/v1/user/email/request-otp
       POST     http://localhost:3001/api/v1/user/email/verify-otp
   ========================================================================== */

'use strict';

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------
const PROFILE_API_BASE = 'http://localhost:3001/api/v1/user';
const PHP_JWT_ENDPOINT = '/BELLYBAND/healthcare-auth/php/api/jwt.php';

const ROLE_GROUPS = {
  clinical:      ['ROLE_DOCTOR'],
  allied_field:  ['ROLE_ALLIED_HEALTH', 'ROLE_ASHA_NGO'],
  admin:         ['ROLE_SUPER_ADMIN', 'ROLE_HOSPITAL_ADMIN'],
  patient:       ['ROLE_USER_PATIENT', 'ROLE_USER_PARTNER'],
};

const DOCTOR_SPECIALTIES = [
  'OB-GYN',
  'General Physician',
  'Maternal-Fetal Medicine',
  'Neonatology',
  'Pediatrics',
  'Anesthesiology',
  'Radiology',
  'Emergency Medicine',
];

// -----------------------------------------------------------------------------
// State
// -----------------------------------------------------------------------------
const state = {
  token: null,
  identity: null, // from PHP /me.php via rbac-router.js
  profile: null,  // from Node GET /user/profile
  dirty: false,
  pendingAvatar: null,      // dataUrl or null (delete)
  pendingSignature: null,   // dataUrl or null (delete)
  emergencyContacts: [],    // UI model
  roleData: {},             // role-specific data
  notificationPrefs: { email: false, sms: false, criticalOnly: false },
  saving: false,
};

// -----------------------------------------------------------------------------
// DOM Helpers
// -----------------------------------------------------------------------------
function $(id) { return document.getElementById(id); }
function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function setHint(el, msg, kind = 'info') {
  if (!el) return;
  el.textContent = msg || '';
  el.style.color = kind === 'error' ? '#FCA5A5' : kind === 'success' ? '#86EFAC' : 'var(--text-muted)';
}

function setDirty(next) {
  state.dirty = !!next;
  const bar = $('profileDirtyBar');
  if (bar) bar.style.display = state.dirty ? 'flex' : 'none';
}

function markDirtyOnInput() {
  // Lightweight: any edit makes the form dirty; Discard resets from server snapshot.
  if (!state.dirty) setDirty(true);
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${state.token}`,
  };
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${PROFILE_API_BASE}${path}`, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    const msg = json?.message || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    err.payload = json;
    throw err;
  }
  return json;
}

// -----------------------------------------------------------------------------
// Identity + Token bootstrap
// -----------------------------------------------------------------------------
async function waitForIdentity(timeoutMs = 6000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (window._rbacGuard?.user) return window._rbacGuard.user;
    await new Promise(r => setTimeout(r, 80));
  }
  return null;
}

async function fetchJwtFromPhp() {
  const res = await fetch(PHP_JWT_ENDPOINT, { credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!data.success || !data.accessToken) throw new Error('Failed to obtain API token.');
  return data.accessToken;
}

// -----------------------------------------------------------------------------
// Tabs / role conditional rendering
// -----------------------------------------------------------------------------
function activateTab(tabKey) {
  qsa('.settings-nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabKey);
  });
  qsa('[data-tab-panel]').forEach(panel => {
    panel.classList.toggle('hidden', panel.getAttribute('data-tab-panel') !== tabKey);
  });
}

function applyRoleVisibility(userRole) {
  // Hide professional tab for patient/family
  const showProfessional = !ROLE_GROUPS.patient.includes(userRole);
  const tabBtn = $('tabProfessional');
  if (tabBtn) tabBtn.style.display = showProfessional ? '' : 'none';

  // Show only matching blocks inside professional panel
  qsa('[data-role-group]').forEach(block => {
    const group = block.getAttribute('data-role-group');
    const allowed = ROLE_GROUPS[group] || [];
    block.style.display = allowed.includes(userRole) ? '' : 'none';
  });
}

// -----------------------------------------------------------------------------
// Avatar crop + compression (no external libs)
// -----------------------------------------------------------------------------
function buildCropModal() {
  if ($('avatarCropModal')) return;

  const modal = document.createElement('div');
  modal.id = 'avatarCropModal';
  modal.className = 'ps-modal hidden';
  modal.innerHTML = `
    <div class="ps-modal-backdrop" data-close="1"></div>
    <div class="ps-modal-card" role="dialog" aria-modal="true" aria-label="Crop image">
      <div class="ps-modal-head">
        <div class="ps-modal-title">Crop &amp; Preview</div>
        <button type="button" class="ps-icon-btn" data-close="1">✕</button>
      </div>
      <div class="ps-modal-body">
        <div class="ps-crop-wrap">
          <div class="ps-crop-frame" id="psCropFrame">
            <img id="psCropImg" alt="Crop preview" />
          </div>
          <div class="ps-crop-controls">
            <label class="ps-small-label">Zoom</label>
            <input type="range" id="psCropZoom" min="1" max="3" step="0.01" value="1" />
            <div class="ps-hint">Drag inside the square to position.</div>
          </div>
        </div>
      </div>
      <div class="ps-modal-foot">
        <button type="button" class="btn-secondary-role" id="psCropCancel">Cancel</button>
        <button type="button" class="btn-primary-role" id="psCropApply">Apply</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function openCropModal(dataUrl) {
  buildCropModal();
  const modal = $('avatarCropModal');
  const img = $('psCropImg');
  const zoom = $('psCropZoom');
  const frame = $('psCropFrame');

  modal.classList.remove('hidden');
  img.src = dataUrl;
  zoom.value = '1';

  const cropState = { dx: 0, dy: 0, zoom: 1, dragging: false, sx: 0, sy: 0 };

  function render() {
    const z = parseFloat(zoom.value || '1');
    cropState.zoom = z;
    img.style.transform = `translate(${cropState.dx}px, ${cropState.dy}px) scale(${z})`;
  }

  zoom.oninput = () => render();

  function pointerDown(e) {
    cropState.dragging = true;
    cropState.sx = e.clientX;
    cropState.sy = e.clientY;
    frame.setPointerCapture(e.pointerId);
  }
  function pointerMove(e) {
    if (!cropState.dragging) return;
    const nx = e.clientX;
    const ny = e.clientY;
    cropState.dx += (nx - cropState.sx);
    cropState.dy += (ny - cropState.sy);
    cropState.sx = nx;
    cropState.sy = ny;
    render();
  }
  function pointerUp() { cropState.dragging = false; }

  frame.onpointerdown = pointerDown;
  frame.onpointermove = pointerMove;
  frame.onpointerup = pointerUp;
  frame.onpointercancel = pointerUp;

  // Close handlers
  qsa('[data-close="1"]', modal).forEach(el => el.onclick = () => close());
  $('psCropCancel').onclick = () => close();

  function close() {
    modal.classList.add('hidden');
    frame.onpointerdown = frame.onpointermove = frame.onpointerup = frame.onpointercancel = null;
    zoom.oninput = null;
  }

  return new Promise((resolve) => {
    $('psCropApply').onclick = async () => {
      try {
        const outDataUrl = await cropToSquareDataUrl(img, cropState, 256);
        close();
        resolve(outDataUrl);
      } catch (err) {
        close();
        resolve(null);
      }
    };
    render();
  });
}

async function cropToSquareDataUrl(imgEl, cropState, outSize) {
  // Wait for image natural size
  if (!imgEl.complete) {
    await new Promise((resolve) => (imgEl.onload = resolve));
  }

  const frameSize = 260; // must match CSS .ps-crop-frame
  const iw = imgEl.naturalWidth || 1;
  const ih = imgEl.naturalHeight || 1;
  const baseScale = Math.max(frameSize / iw, frameSize / ih);
  const scale = baseScale * (cropState.zoom || 1);

  const drawW = iw * scale;
  const drawH = ih * scale;
  const dx = (frameSize - drawW) / 2 + (cropState.dx || 0);
  const dy = (frameSize - drawH) / 2 + (cropState.dy || 0);

  // Map crop frame rect into source image coordinates
  let sx = (0 - dx) / scale;
  let sy = (0 - dy) / scale;
  let sw = frameSize / scale;
  let sh = frameSize / scale;

  // Clamp
  sx = Math.max(0, Math.min(iw - 1, sx));
  sy = Math.max(0, Math.min(ih - 1, sy));
  sw = Math.max(1, Math.min(iw - sx, sw));
  sh = Math.max(1, Math.min(ih - sy, sh));

  const canvas = document.createElement('canvas');
  canvas.width = outSize;
  canvas.height = outSize;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(imgEl, sx, sy, sw, sh, 0, 0, outSize, outSize);

  // Prefer WebP for size, fallback to JPEG if not supported
  const preferred = 'image/webp';
  const dataUrl = await canvasToDataUrlWithLimit(canvas, preferred, 0.92, 900 * 1024);
  return dataUrl;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function canvasToDataUrlWithLimit(canvas, mime, quality, targetBytes) {
  let q = quality;
  let blob = await canvasToBlob(canvas, mime, q);
  if (!blob) {
    // Fallback for browsers without requested mime
    mime = 'image/jpeg';
    q = 0.9;
    blob = await canvasToBlob(canvas, mime, q);
  }

  while (blob && blob.size > targetBytes && q > 0.6) {
    q = Math.max(0.6, q - 0.08);
    blob = await canvasToBlob(canvas, mime, q);
  }

  return await blobToDataUrl(blob);
}

function blobToDataUrl(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(blob);
  });
}

async function readFileAsDataUrl(file) {
  return await blobToDataUrl(file);
}

function validateImageFile(file) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) return 'Only JPEG, PNG, or WebP images are allowed.';
  if (file.size > 5 * 1024 * 1024) return 'File size must not exceed 5MB.';
  return null;
}

// -----------------------------------------------------------------------------
// Emergency contacts editor
// -----------------------------------------------------------------------------
function renderEmergencyContacts() {
  const wrap = $('emergencyContacts');
  if (!wrap) return;
  wrap.innerHTML = '';

  state.emergencyContacts.forEach((c, idx) => {
    const row = document.createElement('div');
    row.className = 'ps-ec-row';
    row.innerHTML = `
      <div class="ps-ec-grid">
        <div class="field">
          <label class="field-label">Name</label>
          <input class="field-input" data-ec="name" data-idx="${idx}" value="${escapeHtml(c.name || '')}" />
        </div>
        <div class="field">
          <label class="field-label">Relation</label>
          <input class="field-input" data-ec="relation" data-idx="${idx}" value="${escapeHtml(c.relation || '')}" />
        </div>
        <div class="field">
          <label class="field-label">Phone</label>
          <input class="field-input" data-ec="phone" data-idx="${idx}" value="${escapeHtml(c.phone || '')}" />
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end;margin-top:8px;">
        <button type="button" class="btn-secondary-role" data-remove-ec="${idx}">Remove</button>
      </div>
    `;
    wrap.appendChild(row);
  });

  qsa('[data-ec]').forEach(input => {
    input.addEventListener('input', (e) => {
      const el = e.target;
      const idx = parseInt(el.dataset.idx, 10);
      const key = el.dataset.ec;
      state.emergencyContacts[idx][key] = el.value;
      markDirtyOnInput();
    });
  });

  qsa('[data-remove-ec]').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.getAttribute('data-remove-ec'), 10);
      state.emergencyContacts.splice(idx, 1);
      renderEmergencyContacts();
      markDirtyOnInput();
    };
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}

// -----------------------------------------------------------------------------
// Form population / extraction
// -----------------------------------------------------------------------------
function populateSpecialtyOptions() {
  const sel = $('specialty');
  if (!sel) return;
  sel.innerHTML = '<option value="">Select specialty</option>';
  DOCTOR_SPECIALTIES.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    sel.appendChild(opt);
  });
}

function populateFromProfile(profile) {
  state.profile = profile;
  setDirty(false);

  // General identity
  if ($('avatarPreview')) {
    $('avatarPreview').innerHTML = profile.avatarPath
      ? `<img src="${profile.avatarPath}" alt="Avatar" />`
      : (profile.fullName?.trim()?.[0] || 'U');
  }
  $('fullName').value = profile.fullName || '';
  $('preferredName').value = profile.preferredName || '';
  $('pronouns').value = profile.pronouns || '';
  $('phone').value = profile.phone || '';
  $('email').value = profile.email || '';

  // Security
  $('twoFaEnabled').checked = !!profile.twoFaEnabled;
  $('twoFaMethod').value = profile.twoFaMethod || '';

  // Role info (read-only field behaviors)
  $('licenseNo').value = profile.licenseNumber || '';
  $('facilityAccessId').value = (profile.roleData?.facilityAccessId || '') + '';

  // Role data
  state.roleData = profile.roleData || {};

  // Clinical
  populateSpecialtyOptions();
  $('specialty').value = state.roleData.specialty || '';
  $('yearsExperience').value = (state.roleData.yearsExperience ?? '') + '';
  $('teleStart').value = state.roleData.teleAvailability?.start || '';
  $('teleEnd').value = state.roleData.teleAvailability?.end || '';
  setHint($('signatureHint'), state.roleData.signaturePath ? 'Signature uploaded.' : '');

  // Allied/Field
  $('subSpecialty').value = state.roleData.subSpecialty || '';
  $('regions').value = Array.isArray(state.roleData.regions) ? state.roleData.regions.join(', ') : '';
  $('languages').value = Array.isArray(state.roleData.languages) ? state.roleData.languages.join(', ') : '';

  // Admin
  $('adminDesignation').value = state.roleData.adminDesignation || '';
  $('escalationContact').value = state.roleData.escalationContact || '';

  // Patient
  $('bloodGroup').value = state.roleData.bloodGroup || '';
  $('primaryDoctor').value = state.roleData.primaryDoctorId || '';
  state.emergencyContacts = Array.isArray(state.roleData.emergencyContacts) ? state.roleData.emergencyContacts : [];
  renderEmergencyContacts();

  // Notifications
  state.notificationPrefs = profile.notificationPrefs || state.notificationPrefs;
  $('notifEmail').checked = !!state.notificationPrefs.email;
  $('notifSms').checked = !!state.notificationPrefs.sms;
  $('notifCriticalOnly').checked = !!state.notificationPrefs.criticalOnly;

  // License field read-only if verified
  const verified = ['verified', 'active'].includes(profile.status);
  $('licenseNo').disabled = verified;
  if ($('licenseHint')) $('licenseHint').textContent = verified ? 'Read-only once verified.' : 'You can edit until verification.';

  // Clear pending media state
  state.pendingAvatar = undefined;
  state.pendingSignature = undefined;
}

function collectPayloadForSave() {
  // Role data aggregation based on visible role group
  const rd = { ...(state.roleData || {}) };
  const role = state.identity?.userRole || state.profile?.userRole;

  // Universal profile
  const payload = {
    fullName: $('fullName').value.trim(),
    preferredName: $('preferredName').value.trim() || null,
    pronouns: $('pronouns').value.trim() || null,
    phone: $('phone').value.trim(),
    twoFaEnabled: $('twoFaEnabled').checked,
    twoFaMethod: $('twoFaEnabled').checked ? ($('twoFaMethod').value || null) : null,
    notificationPrefs: {
      email: $('notifEmail').checked,
      sms: $('notifSms').checked,
      criticalOnly: $('notifCriticalOnly').checked,
    },
    roleData: rd,
  };

  // Media
  if (state.pendingAvatar !== undefined) payload.avatarDataUrl = state.pendingAvatar; // string or null
  if (state.pendingSignature !== undefined) payload.signatureDataUrl = state.pendingSignature;

  // Role blocks
  if (ROLE_GROUPS.clinical.includes(role)) {
    rd.specialty = $('specialty').value || '';
    rd.yearsExperience = $('yearsExperience').value ? parseInt($('yearsExperience').value, 10) : null;
    const ts = $('teleStart').value || '';
    const te = $('teleEnd').value || '';
    rd.teleAvailability = (ts && te) ? { start: ts, end: te } : null;
  }

  if (ROLE_GROUPS.allied_field.includes(role)) {
    rd.subSpecialty = $('subSpecialty').value.trim() || '';
    rd.regions = splitCsv($('regions').value);
    rd.languages = splitCsv($('languages').value);
  }

  if (ROLE_GROUPS.admin.includes(role)) {
    rd.adminDesignation = $('adminDesignation').value.trim() || '';
    rd.escalationContact = $('escalationContact').value.trim() || '';
  }

  if (ROLE_GROUPS.patient.includes(role)) {
    rd.bloodGroup = $('bloodGroup').value || '';
    rd.primaryDoctorId = $('primaryDoctor').value || null;
    rd.emergencyContacts = state.emergencyContacts;
  }

  return payload;
}

function splitCsv(raw) {
  return String(raw || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

// -----------------------------------------------------------------------------
// Password strength meter (simple)
// -----------------------------------------------------------------------------
function getPwdRules(val) {
  return [
    { pass: val.length >= 12, label: '12+ chars' },
    { pass: /[A-Z]/.test(val), label: 'Uppercase' },
    { pass: /[a-z]/.test(val), label: 'Lowercase' },
    { pass: /[0-9]/.test(val), label: 'Number' },
    { pass: /[^A-Za-z0-9]/.test(val), label: 'Symbol' },
  ];
}

function onNewPasswordInput() {
  const val = $('newPassword').value || '';
  const score = getPwdRules(val).filter(r => r.pass).length; // 0..5
  const pct = Math.min(100, (score / 5) * 100);
  const bar = $('pwdStrengthBar');
  const label = $('pwdStrengthLabel');
  if (bar) {
    const colors = ['#A8A29E', '#FCA5A5', '#FDBA74', '#FDE68A', '#86EFAC', '#34D399'];
    bar.style.setProperty('--pct', `${pct}%`);
    bar.style.setProperty('--color', colors[Math.max(0, score)]);
  }
  if (label) {
    const labels = ['', 'Very weak', 'Weak', 'Good', 'Strong', 'Excellent'];
    label.textContent = val ? labels[Math.max(1, score)] : '';
  }
}

// -----------------------------------------------------------------------------
// Bind events
// -----------------------------------------------------------------------------
function bindBaseEvents() {
  // Tabs
  qsa('.settings-nav-item').forEach(btn => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
  });

  // Dirty tracking for all inputs/selects
  qsa('#profileForm input, #profileForm select').forEach(el => {
    el.addEventListener('input', markDirtyOnInput);
    el.addEventListener('change', markDirtyOnInput);
  });

  // Save / Discard
  const doDiscard = () => state.profile && populateFromProfile(state.profile);
  $('profileDiscardBtn').onclick = doDiscard;
  $('dirtyDiscardBtn').onclick = doDiscard;

  const doSave = () => saveProfile();
  $('profileSaveBtn').onclick = doSave;
  $('dirtySaveBtn').onclick = doSave;

  // Router guard (hash navigation)
  window.__rbacBeforeNavigate = function(fromView, toView) {
    if (!state.dirty) return true;
    if ((fromView || '').startsWith('account') && !(toView || '').startsWith('account')) {
      return confirm('You have unsaved changes. Leave without saving?');
    }
    return true;
  };

  // Browser unload guard
  window.addEventListener('beforeunload', (e) => {
    if (!state.dirty) return;
    e.preventDefault();
    e.returnValue = '';
  });

  // Password meter
  $('newPassword').addEventListener('input', onNewPasswordInput);

  // Password update
  $('updatePasswordBtn').onclick = () => updatePassword();

  // Email OTP
  $('requestEmailOtpBtn').onclick = () => requestEmailOtp();
  $('verifyEmailOtpBtn').onclick = () => verifyEmailOtp();

  // 2FA method enable/disable UX
  $('twoFaEnabled').addEventListener('change', () => {
    const enabled = $('twoFaEnabled').checked;
    $('twoFaMethod').disabled = !enabled;
    markDirtyOnInput();
  });

  // Emergency contacts
  $('addEmergencyContactBtn').onclick = () => {
    state.emergencyContacts.push({ name: '', relation: '', phone: '' });
    renderEmergencyContacts();
    markDirtyOnInput();
  };
}

function bindAvatarEvents() {
  const zone = $('avatarDropzone');
  const input = $('avatarFile');
  if (!zone || !input) return;

  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    if (e.dataTransfer?.files?.length) {
      input.files = e.dataTransfer.files;
      onAvatarFileSelected();
    }
  });

  input.addEventListener('change', onAvatarFileSelected);
  $('avatarUploadBtn').onclick = () => onAvatarFileSelected(true);
  $('avatarDeleteBtn').onclick = () => {
    state.pendingAvatar = null;
    if ($('avatarPreview')) $('avatarPreview').innerHTML = (state.profile?.fullName?.trim()?.[0] || 'U');
    setHint($('avatarHint'), 'Avatar will be removed when you save.', 'info');
    markDirtyOnInput();
  };
}

async function onAvatarFileSelected(forceOpen = false) {
  const input = $('avatarFile');
  const file = input?.files?.[0];
  if (!file) {
    if (forceOpen) setHint($('avatarHint'), 'Select an image first.', 'error');
    return;
  }

  const err = validateImageFile(file);
  if (err) { setHint($('avatarHint'), err, 'error'); return; }

  setHint($('avatarHint'), 'Preparing preview…');
  const dataUrl = await readFileAsDataUrl(file);
  const cropped = await openCropModal(dataUrl);
  if (!cropped) { setHint($('avatarHint'), 'Crop cancelled.', 'info'); return; }

  state.pendingAvatar = cropped;
  $('avatarPreview').innerHTML = `<img src="${cropped}" alt="Avatar preview" />`;
  setHint($('avatarHint'), 'Avatar ready. Click Save Changes to upload.', 'success');
  markDirtyOnInput();
}

function bindSignatureEvents() {
  const zone = $('signatureDropzone');
  const input = $('signatureFile');
  if (!zone || !input) return;

  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    if (e.dataTransfer?.files?.length) {
      input.files = e.dataTransfer.files;
    }
  });

  $('signatureUploadBtn').onclick = async () => {
    const file = input?.files?.[0];
    if (!file) { setHint($('signatureHint'), 'Select a signature image first.', 'error'); return; }
    const err = validateImageFile(file);
    if (err) { setHint($('signatureHint'), err, 'error'); return; }

    const dataUrl = await compressSignatureToDataUrl(file);
    state.pendingSignature = dataUrl;
    setHint($('signatureHint'), 'Signature ready. Click Save Changes to upload.', 'success');
    markDirtyOnInput();
  };

  $('signatureDeleteBtn').onclick = () => {
    state.pendingSignature = null;
    setHint($('signatureHint'), 'Signature will be removed when you save.', 'info');
    markDirtyOnInput();
  };
}

async function compressSignatureToDataUrl(file) {
  const dataUrl = await readFileAsDataUrl(file);
  const img = new Image();
  img.src = dataUrl;
  await new Promise((r) => (img.onload = r));

  const maxW = 900;
  const scale = Math.min(1, maxW / (img.naturalWidth || maxW));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);

  return await canvasToDataUrlWithLimit(canvas, 'image/webp', 0.92, 500 * 1024);
}

// -----------------------------------------------------------------------------
// API actions
// -----------------------------------------------------------------------------
async function loadProfile() {
  const hint = $('avatarHint');
  try {
    setHint(hint, 'Loading profile…');
    const json = await apiFetch('/profile', { method: 'GET' });
    populateFromProfile(json.profile);
    setHint(hint, '');
  } catch (err) {
    console.error(err);
    setHint(hint, err.message || 'Failed to load profile.', 'error');
  }
}

async function saveProfile() {
  if (state.saving) return;
  state.saving = true;
  try {
    const payload = collectPayloadForSave();
    await apiFetch('/profile', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });
    setDirty(false);
    setHint($('avatarHint'), 'Saved.', 'success');
    await loadProfile(); // refresh snapshot (and media paths)
  } catch (err) {
    console.error(err);
    setHint($('avatarHint'), err.message || 'Save failed.', 'error');
  } finally {
    state.saving = false;
  }
}

async function updatePassword() {
  const hint = $('passwordHint');
  setHint(hint, '');

  const currentPassword = $('currentPassword').value || '';
  const newPassword = $('newPassword').value || '';
  const confirmPassword = $('confirmPassword').value || '';

  if (!currentPassword) return setHint(hint, 'Current password is required.', 'error');
  if (!newPassword) return setHint(hint, 'New password is required.', 'error');
  if (newPassword !== confirmPassword) return setHint(hint, 'Passwords do not match.', 'error');

  const score = getPwdRules(newPassword).filter(r => r.pass).length;
  if (score < 5) return setHint(hint, 'New password must be ≥12 chars with upper, lower, number and symbol.', 'error');

  try {
    await apiFetch('/password', {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    $('currentPassword').value = '';
    $('newPassword').value = '';
    $('confirmPassword').value = '';
    onNewPasswordInput();
    setHint(hint, 'Password updated.', 'success');
  } catch (err) {
    setHint(hint, err.message || 'Password update failed.', 'error');
  }
}

async function requestEmailOtp() {
  const hint = $('emailOtpHint');
  const newEmail = $('newEmail').value.trim();
  if (!newEmail) return setHint(hint, 'Enter a new email first.', 'error');
  try {
    const res = await apiFetch('/email/request-otp', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ newEmail }),
    });
    const devOtp = res.devOtp ? ` (DEV OTP: ${res.devOtp})` : '';
    setHint(hint, `OTP sent.${devOtp}`, 'success');
  } catch (err) {
    setHint(hint, err.message || 'Failed to send OTP.', 'error');
  }
}

async function verifyEmailOtp() {
  const hint = $('emailOtpHint');
  const newEmail = $('newEmail').value.trim();
  const otp = $('emailOtp').value.trim();
  if (!newEmail) return setHint(hint, 'Enter a new email first.', 'error');
  if (!otp) return setHint(hint, 'Enter the OTP.', 'error');
  try {
    await apiFetch('/email/verify-otp', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ newEmail, otp }),
    });
    setHint(hint, 'Email updated. Reloading…', 'success');
    await loadProfile();
    $('newEmail').value = '';
    $('emailOtp').value = '';
  } catch (err) {
    setHint(hint, err.message || 'Failed to verify OTP.', 'error');
  }
}

// -----------------------------------------------------------------------------
// Init
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  bindBaseEvents();
  bindAvatarEvents();
  bindSignatureEvents();
  activateTab('general');

  // Bootstrap identity (from RBAC router /me.php)
  state.identity = await waitForIdentity();
  if (!state.identity) {
    setHint($('avatarHint'), 'Unable to load user identity. Please refresh.', 'error');
    return;
  }

  applyRoleVisibility(state.identity.userRole);

  try {
    state.token = await fetchJwtFromPhp();
  } catch (err) {
    setHint($('avatarHint'), err.message || 'Auth token error.', 'error');
    return;
  }

  await loadProfile();
});

