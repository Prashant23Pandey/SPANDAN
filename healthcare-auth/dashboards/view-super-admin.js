/**
 * ============================================================================
 * BELLYBAND — SUPER ADMIN DASHBOARD VIEW (/dashboard/super-admin)
 * File: view-super-admin.js
 *
 * Features:
 * - Global Telemetry KPIs (Hospitals, Patients, Sync Uptime 99.98%, Latency)
 * - Institutional Verification Queue with interactive Review, Approve & Reject actions
 * - System Audit Log with real-time filtering, search, and CSV export
 * - Global Role Overrides & System Telemetry Control Center
 * ============================================================================
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SuperAdminDashboardView = factory();
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  // Initial State for Verification Queue
  let pendingInstitutions = [
    {
      id: 'INST-401',
      name: 'Apollo Cradle & Maternity Center',
      city: 'New Delhi, DL',
      type: 'Tertiary Care Hospital',
      submittedDate: 'Aug 26, 2026',
      licenseNo: 'DL-MOH-2024-8849',
      beds: 120,
      documents: ['Medical Council Registration', 'NABH Accreditation Certificate', 'Fire & Safety NOC'],
      status: 'pending',
      contactPerson: 'Dr. S. K. Aggarwal'
    },
    {
      id: 'INST-402',
      name: 'Fortis Women Care & Fetal Health',
      city: 'Mumbai, MH',
      type: 'Specialized Maternity Hub',
      submittedDate: 'Aug 25, 2026',
      licenseNo: 'MH-MC-559021',
      beds: 85,
      documents: ['Clinical Establishment License', 'Biomedical Waste Disposal NOC'],
      status: 'pending',
      contactPerson: 'Dr. Anita Deshmukh'
    },
    {
      id: 'INST-403',
      name: 'AIIMS Regional Maternal Apex Unit',
      city: 'Rishikesh, UK',
      type: 'Government Apex Hospital',
      submittedDate: 'Aug 24, 2026',
      licenseNo: 'GOI-AIIMS-RK-04',
      beds: 240,
      documents: ['Ministry of Health Gazette Order', 'NIC High-Bandwidth Telemetry MoU'],
      status: 'pending',
      contactPerson: 'Prof. R. C. Nautiyal'
    },
    {
      id: 'INST-404',
      name: 'Narayana Mother & Child Care',
      city: 'Bangalore, KA',
      type: 'Multi-Specialty Trust',
      submittedDate: 'Aug 23, 2026',
      licenseNo: 'KA-DHS-99120',
      beds: 150,
      documents: ['State DHS License', 'NABH Gold Standard'],
      status: 'approved',
      contactPerson: 'Dr. V. Kurian'
    }
  ];

  // Initial State for Audit Logs
  let auditLogs = [
    { id: 'LOG-9921', time: '13:45:02', user: '23prashantpandey@bellyband.co.in', action: 'ROLE_OVERRIDE', resource: 'SYSTEM_ROLES', ip: '103.45.22.1', outcome: 'SUCCESS' },
    { id: 'LOG-9920', time: '13:38:14', user: '23prashantpandey@bellyband.co.in', action: 'LOGIN_AUTH', resource: 'SUPER_ADMIN_PORTAL', ip: '103.45.22.1', outcome: 'SUCCESS' },
    { id: 'LOG-9919', time: '13:31:50', user: 'dr.priya@bellyband.health', action: 'EHR_ACCESS', resource: 'PATIENT_REC_#4421', ip: '122.160.3.44', outcome: 'SUCCESS' },
    { id: 'LOG-9918', time: '13:20:11', user: 'emergency.dispatch@bellyband.health', action: 'SOS_AMBULANCE_DISPATCH', resource: 'UNIT_01_RAMPUR', ip: '49.36.88.12', outcome: 'SUCCESS' },
    { id: 'LOG-9917', time: '12:55:40', user: 'unknown@external-probe.net', action: 'LOGIN_ATTEMPT', resource: 'REST_API_V1', ip: '185.220.101.4', outcome: 'BLOCKED' },
    { id: 'LOG-9916', time: '12:40:19', user: 'hospital.admin@apollo.org', action: 'STAFF_ONBOARD', resource: 'STAFF_ID_#884', ip: '115.240.90.1', outcome: 'SUCCESS' },
  ];

  function render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <!-- View Header -->
      <div class="view-header-row">
        <div class="view-heading-group">
          <div class="view-eyebrow">👑 Platform Owner & Governance</div>
          <h1 class="view-main-title">Super Admin Command Center</h1>
          <p class="view-description">Global institutional oversight, real-time BLE band telemetry, hospital verification pipeline, and cryptographic audit trails.</p>
        </div>
        <div class="view-actions-group">
          <button class="btn-core btn-secondary" id="btnExportAuditCSV">📥 Export Audit Log</button>
          <button class="btn-core btn-primary-role" id="btnAddNewInstitution">➕ Onboard Institution</button>
        </div>
      </div>

      <!-- KPI Grid -->
      <div class="kpi-cards-grid">
        <div class="kpi-stat-card">
          <div class="kpi-card-glow-edge"></div>
          <div class="kpi-top-row">
            <div class="kpi-icon-pill">🏥</div>
            <span class="kpi-trend-pill kpi-trend-up">↑ +4 this month</span>
          </div>
          <div class="kpi-stat-value">248</div>
          <div class="kpi-stat-label">Affiliated Hospitals & NGOs</div>
        </div>

        <div class="kpi-stat-card">
          <div class="kpi-card-glow-edge"></div>
          <div class="kpi-top-row">
            <div class="kpi-icon-pill">🤱</div>
            <span class="kpi-trend-pill kpi-trend-up">↑ +14.2% MoM</span>
          </div>
          <div class="kpi-stat-value">48,920</div>
          <div class="kpi-stat-label">Active Monitored Mothers</div>
        </div>

        <div class="kpi-stat-card">
          <div class="kpi-card-glow-edge"></div>
          <div class="kpi-top-row">
            <div class="kpi-icon-pill">📶</div>
            <span class="kpi-trend-pill kpi-trend-up">99.98% SLA</span>
          </div>
          <div class="kpi-stat-value">99.98%</div>
          <div class="kpi-stat-label">Band Sync Uptime</div>
        </div>

        <div class="kpi-stat-card">
          <div class="kpi-card-glow-edge"></div>
          <div class="kpi-top-row">
            <div class="kpi-icon-pill">⚡</div>
            <span class="kpi-trend-pill kpi-trend-up">18ms</span>
          </div>
          <div class="kpi-stat-value">18 ms</div>
          <div class="kpi-stat-label">Mean BLE Telemetry Latency</div>
        </div>
      </div>

      <!-- Main Layout Grid -->
      <div class="dashboard-grid-layout">
        <!-- Institutional Verification Queue -->
        <div class="col-span-8 dashboard-panel">
          <div class="panel-header-bar">
            <div class="panel-title-group">
              <span class="panel-main-title">🏛️ Institutional Verification Queue</span>
              <span class="panel-badge" id="pendingQueueCount">${pendingInstitutions.filter(i => i.status === 'pending').length} Pending</span>
            </div>
            <div style="font-size:12px; color:var(--text-muted);">Real-time State Medical Council check</div>
          </div>
          <div class="panel-content-body no-padding">
            <div class="data-table-wrapper">
              <table class="custom-data-table" id="verificationQueueTable">
                <thead>
                  <tr>
                    <th>Hospital / Institution</th>
                    <th>Location</th>
                    <th>License / Reg</th>
                    <th>Status</th>
                    <th style="text-align:right;">Actions</th>
                  </tr>
                </thead>
                <tbody id="verificationTableBody">
                  <!-- Rendered dynamically -->
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Global Telemetry & Platform Engine Health -->
        <div class="col-span-4 dashboard-panel">
          <div class="panel-header-bar">
            <div class="panel-title-group">
              <span class="panel-main-title">🛰️ Telemetry Health</span>
            </div>
            <span class="status-pill active">● STREAMING</span>
          </div>
          <div class="panel-content-body">
            <div style="display:flex; flex-direction:column; gap:14px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color:var(--text-secondary); font-size:13px;">BLE Wearable Packets/sec</span>
                <strong style="color:var(--text-primary); font-family:var(--font-mono);">12,480 pps</strong>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color:var(--text-secondary); font-size:13px;">Kafka Telemetry Pipeline</span>
                <span class="status-pill active">0 Lag</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color:var(--text-secondary); font-size:13px;">Emergency SOS Broadcast Channel</span>
                <span class="status-pill active">Ready</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color:var(--text-secondary); font-size:13px;">Database Replication Sync</span>
                <strong style="color:#10B981; font-family:var(--font-mono);">0.04s delta</strong>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color:var(--text-secondary); font-size:13px;">Encrypted EHR Vault Storage</span>
                <strong style="color:var(--text-primary); font-family:var(--font-mono);">AES-256 GCM</strong>
              </div>
            </div>

            <div style="margin-top:20px; padding:12px; background:var(--bg-glass-card); border-radius:var(--radius-md); border:1px solid var(--border-glass);">
              <div style="font-size:11px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:6px;">SUPER ADMIN CAPABILITIES</div>
              <p style="font-size:12px; color:var(--text-secondary); line-height:1.5;">
                Hardcoded Identity: <code style="color:var(--c-super); font-family:var(--font-mono);">23prashantpandey@bellyband.co.in</code>. Universal read/write authority across all sub-systems, audit trails, and role overrides.
              </p>
            </div>
          </div>
        </div>

        <!-- System Audit Log -->
        <div class="col-span-12 dashboard-panel">
          <div class="panel-header-bar">
            <div class="panel-title-group">
              <span class="panel-main-title">📋 Immutable System Audit Trail</span>
              <span class="panel-badge">HIPAA & ISO-27001 Compliant</span>
            </div>
            <div style="display:flex; gap:10px; align-items:center;">
              <input type="text" id="auditSearchInput" placeholder="Filter by User, IP, or Action..." class="form-control-input" style="width:240px; padding:6px 12px; font-size:12px;" />
            </div>
          </div>
          <div class="panel-content-body no-padding">
            <div class="data-table-wrapper">
              <table class="custom-data-table" id="auditLogTable">
                <thead>
                  <tr>
                    <th>Log ID</th>
                    <th>Timestamp</th>
                    <th>Actor Identity</th>
                    <th>Action</th>
                    <th>Target Resource</th>
                    <th>Origin IP</th>
                    <th>Outcome</th>
                  </tr>
                </thead>
                <tbody id="auditTableBody">
                  <!-- Rendered dynamically -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    renderVerificationTable();
    renderAuditTable();
    attachEvents();
  }

  function renderVerificationTable() {
    const tbody = document.getElementById('verificationTableBody');
    if (!tbody) return;

    tbody.innerHTML = pendingInstitutions.map(inst => `
      <tr id="row-${inst.id}">
        <td>
          <div style="font-weight:700; color:var(--text-primary);">${inst.name}</div>
          <div style="font-size:11.5px; color:var(--text-muted);">${inst.type} • Contact: ${inst.contactPerson}</div>
        </td>
        <td>${inst.city}</td>
        <td><code style="font-family:var(--font-mono); font-size:11.5px; color:var(--c-doctor);">${inst.licenseNo}</code></td>
        <td>
          ${inst.status === 'approved'
            ? `<span class="status-pill approved">✅ Verified</span>`
            : inst.status === 'rejected'
            ? `<span class="status-pill critical">✗ Rejected</span>`
            : `<span class="status-pill pending">⏳ Pending Review</span>`
          }
        </td>
        <td style="text-align:right;">
          ${inst.status === 'pending' ? `
            <div style="display:inline-flex; gap:6px;">
              <button class="btn-core btn-secondary btn-sm" onclick="SuperAdminDashboardView.reviewDocs('${inst.id}')">📄 Inspect</button>
              <button class="btn-core btn-success btn-sm" onclick="SuperAdminDashboardView.approveInstitution('${inst.id}')">✓ Approve</button>
              <button class="btn-core btn-danger btn-sm" onclick="SuperAdminDashboardView.rejectInstitution('${inst.id}')">✗ Reject</button>
            </div>
          ` : `
            <button class="btn-core btn-secondary btn-sm" onclick="SuperAdminDashboardView.reviewDocs('${inst.id}')">View Details</button>
          `}
        </td>
      </tr>
    `).join('');

    const countEl = document.getElementById('pendingQueueCount');
    if (countEl) {
      countEl.textContent = `${pendingInstitutions.filter(i => i.status === 'pending').length} Pending`;
    }
  }

  function renderAuditTable(filterTerm = '') {
    const tbody = document.getElementById('auditTableBody');
    if (!tbody) return;

    const term = filterTerm.toLowerCase();
    const filtered = auditLogs.filter(log =>
      !term ||
      log.user.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      log.ip.toLowerCase().includes(term) ||
      log.resource.toLowerCase().includes(term)
    );

    tbody.innerHTML = filtered.map(log => `
      <tr>
        <td><code style="font-family:var(--font-mono); font-size:11.5px; color:var(--text-muted);">${log.id}</code></td>
        <td><span style="font-family:var(--font-mono); font-size:12px;">${log.time}</span></td>
        <td><strong>${log.user}</strong></td>
        <td><span class="status-pill" style="background:rgba(255,255,255,0.06); font-family:var(--font-mono); font-size:11px;">${log.action}</span></td>
        <td><code style="font-family:var(--font-mono); font-size:11.5px; color:var(--text-secondary);">${log.resource}</code></td>
        <td><span style="font-family:var(--font-mono); font-size:11.5px; color:var(--text-muted);">${log.ip}</span></td>
        <td>
          ${log.outcome === 'SUCCESS'
            ? `<span class="status-pill active" style="font-size:11px;">✅ OK</span>`
            : `<span class="status-pill critical" style="font-size:11px;">🚫 BLOCKED</span>`
          }
        </td>
      </tr>
    `).join('');
  }

  function attachEvents() {
    const searchInput = document.getElementById('auditSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => renderAuditTable(e.target.value));
    }

    const exportBtn = document.getElementById('btnExportAuditCSV');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        let csv = 'LogID,Timestamp,User,Action,Resource,IP,Outcome\n';
        auditLogs.forEach(l => {
          csv += `"${l.id}","${l.time}","${l.user}","${l.action}","${l.resource}","${l.ip}","${l.outcome}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bellyband_audit_trail_${Date.now()}.csv`;
        a.click();
        if (window.BellyBandLayout) {
          window.BellyBandLayout.showToast('✅ Audit log exported successfully as CSV.');
        }
      });
    }

    const addInstBtn = document.getElementById('btnAddNewInstitution');
    if (addInstBtn) {
      addInstBtn.addEventListener('click', () => {
        if (window.BellyBandLayout) {
          window.BellyBandLayout.showModal({
            title: '🏛️ Onboard New Healthcare Facility',
            body: `
              <form id="onboardInstForm">
                <div class="form-input-group">
                  <label class="form-input-label">Hospital / Institution Name</label>
                  <input type="text" id="newInstName" class="form-control-input" placeholder="e.g. Max Maternity & Child Hospital" required />
                </div>
                <div class="form-input-group">
                  <label class="form-input-label">City & State</label>
                  <input type="text" id="newInstCity" class="form-control-input" placeholder="e.g. Hyderabad, TS" required />
                </div>
                <div class="form-input-group">
                  <label class="form-input-label">Medical Council Registration / License No.</label>
                  <input type="text" id="newInstLicense" class="form-control-input" placeholder="e.g. TS-MCI-2026-991" required />
                </div>
                <div class="form-input-group">
                  <label class="form-input-label">Facility Category</label>
                  <select id="newInstType" class="form-control-select">
                    <option value="Tertiary Care Hospital">Tertiary Care Hospital</option>
                    <option value="Specialized Maternity Center">Specialized Maternity Center</option>
                    <option value="District Health Mission Unit">District Health Mission Unit</option>
                    <option value="NGO Rural Health Center">NGO Rural Health Center</option>
                  </select>
                </div>
              </form>
            `,
            confirmText: 'Submit Verification Entry',
            onConfirm: () => {
              const name = document.getElementById('newInstName')?.value.trim();
              const city = document.getElementById('newInstCity')?.value.trim();
              const lic = document.getElementById('newInstLicense')?.value.trim();
              const type = document.getElementById('newInstType')?.value;
              if (!name || !lic) {
                alert('Please enter facility name and license number.');
                return false;
              }
              const newInst = {
                id: `INST-${Math.floor(400 + Math.random() * 500)}`,
                name,
                city: city || 'New Delhi, DL',
                type,
                submittedDate: 'Just Now',
                licenseNo: lic,
                beds: 100,
                documents: ['MCI Reg Copy', 'NABH Affidavit'],
                status: 'pending',
                contactPerson: 'Lead Administrator'
              };
              pendingInstitutions.unshift(newInst);
              renderVerificationTable();
              window.BellyBandLayout.showToast(`✅ Facility "${name}" added to the institutional verification queue.`);
              return true;
            }
          });
        }
      });
    }
  }

  // Public Methods for Actions
  function approveInstitution(id) {
    const inst = pendingInstitutions.find(i => i.id === id);
    if (!inst) return;
    inst.status = 'approved';
    renderVerificationTable();
    auditLogs.unshift({
      id: `LOG-${Math.floor(9900 + Math.random() * 100)}`,
      time: new Date().toTimeString().split(' ')[0],
      user: '23prashantpandey@bellyband.co.in',
      action: 'APPROVE_INSTITUTION',
      resource: inst.name,
      ip: '103.45.22.1',
      outcome: 'SUCCESS'
    });
    renderAuditTable();
    if (window.BellyBandLayout) {
      window.BellyBandLayout.showToast(`✅ Approved: ${inst.name} is now verified and active.`);
    }
  }

  function rejectInstitution(id) {
    const inst = pendingInstitutions.find(i => i.id === id);
    if (!inst) return;
    inst.status = 'rejected';
    renderVerificationTable();
    auditLogs.unshift({
      id: `LOG-${Math.floor(9900 + Math.random() * 100)}`,
      time: new Date().toTimeString().split(' ')[0],
      user: '23prashantpandey@bellyband.co.in',
      action: 'REJECT_INSTITUTION',
      resource: inst.name,
      ip: '103.45.22.1',
      outcome: 'SUCCESS'
    });
    renderAuditTable();
    if (window.BellyBandLayout) {
      window.BellyBandLayout.showToast(`⚠️ Rejected: ${inst.name} verification was declined.`);
    }
  }

  function reviewDocs(id) {
    const inst = pendingInstitutions.find(i => i.id === id);
    if (!inst || !window.BellyBandLayout) return;

    window.BellyBandLayout.showModal({
      title: `📄 Inspection: ${inst.name}`,
      body: `
        <div style="font-size:13.5px; line-height:1.7;">
          <div style="margin-bottom:12px; padding:12px; background:var(--bg-glass-card); border-radius:var(--radius-md); border:1px solid var(--border-glass);">
            <div><strong>Location:</strong> ${inst.city}</div>
            <div><strong>Facility Type:</strong> ${inst.type}</div>
            <div><strong>License / Reg Code:</strong> <code style="color:var(--c-doctor);">${inst.licenseNo}</code></div>
            <div><strong>Bed Capacity:</strong> ${inst.beds} beds</div>
            <div><strong>Submitting Official:</strong> ${inst.contactPerson}</div>
          </div>
          <div style="font-weight:700; color:var(--text-primary); margin-bottom:8px;">Uploaded Verification Documents:</div>
          <ul style="list-style:none; display:flex; flex-direction:column; gap:8px;">
            ${inst.documents.map(d => `
              <li style="display:flex; align-items:center; gap:8px; padding:8px 12px; background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); border-radius:var(--radius-sm);">
                <span>📁</span>
                <span style="flex:1;">${d}</span>
                <span class="status-pill active" style="font-size:11px;">Validated Hash</span>
              </li>
            `).join('')}
          </ul>
        </div>
      `,
      confirmText: inst.status === 'pending' ? 'Approve Facility' : 'Close',
      onConfirm: () => {
        if (inst.status === 'pending') {
          approveInstitution(inst.id);
        }
        return true;
      }
    });
  }

  return {
    render,
    approveInstitution,
    rejectInstitution,
    reviewDocs
  };
});
