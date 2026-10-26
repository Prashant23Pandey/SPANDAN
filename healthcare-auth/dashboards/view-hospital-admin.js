/**
 * ============================================================================
 * BELLYBAND — HOSPITAL & NGO ADMIN DASHBOARD VIEW (/dashboard/hospital-admin)
 * File: view-hospital-admin.js
 *
 * Features:
 * - Staff Management Board (Doctors, Nurses, Allied Health onboarding & caseloads)
 * - Patient Allocation Matrix (Caseload balancing across High Risk / Normal / Post-Op)
 * - Bed & ICU Capacity Tracker (Maternity, NICU, Recovery, OPD with live capacity updater)
 * - Hospital Facility Operations Analytics
 * ============================================================================
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.HospitalAdminDashboardView = factory();
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  let staffList = [
    { id: 'STF-101', name: 'Dr. Priya Mehta', role: 'Senior OB-GYN', dept: 'Clinical Services', patients: 28, status: 'Active', phone: '+91 98110 44210' },
    { id: 'STF-102', name: 'Dr. Arjun Rao', role: 'Neonatologist & Pediatrician', dept: 'Clinical Services', patients: 16, status: 'Active', phone: '+91 98220 55190' },
    { id: 'STF-103', name: 'Dr. Sunita Joshi', role: 'Maternal-Fetal Medicine Specialist', dept: 'Clinical Services', patients: 24, status: 'Active', phone: '+91 98330 66320' },
    { id: 'STF-104', name: 'Kavya Singh', role: 'Maternal Nutritionist / Dietitian', dept: 'Allied Health', patients: 32, status: 'Active', phone: '+91 98440 77410' },
    { id: 'STF-105', name: 'Anjali Sharma', role: 'Senior Labor & Delivery Nurse', dept: 'Nursing Operations', patients: 40, status: 'Active', phone: '+91 98550 88520' },
    { id: 'STF-106', name: 'Ravi Kumar', role: 'Field Liaison & Community Lead', dept: 'Community Outreach', patients: 48, status: 'On Leave', phone: '+91 98660 99630' }
  ];

  let bedCapacity = {
    maternity: { label: 'Maternity Ward (LDRP)', occupied: 28, total: 36, type: 'warn' },
    icu:       { label: 'NICU / Maternal High Dependency Unit', occupied: 12, total: 20, type: 'good' },
    recovery:  { label: 'Post-Cesarean Recovery Suite', occupied: 18, total: 20, type: 'crit' },
    opd:       { label: 'OPD Consultation Chambers', occupied: 6, total: 15, type: 'good' }
  };

  let doctorMatrix = [
    { name: 'Dr. Priya Mehta', specialty: 'High-Risk OB-GYN', highRisk: 10, normal: 14, postOp: 4, total: 28, maxCap: 30 },
    { name: 'Dr. Arjun Rao', specialty: 'Neonatology / Pre-term Care', highRisk: 7, normal: 6, postOp: 3, total: 16, maxCap: 25 },
    { name: 'Dr. Sunita Joshi', specialty: 'Maternal-Fetal Medicine', highRisk: 14, normal: 8, postOp: 2, total: 24, maxCap: 28 },
  ];

  function render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <!-- View Header -->
      <div class="view-header-row">
        <div class="view-heading-group">
          <div class="view-eyebrow" style="color:var(--c-hospital);">🏥 Institutional Operations & Staff Governance</div>
          <h1 class="view-main-title">Facility Administration Console</h1>
          <p class="view-description">Staff credentialing & onboarding, clinical caseload load-balancing, and inpatient bed occupancy telemetry.</p>
        </div>
        <div class="view-actions-group">
          <button class="btn-core btn-secondary" id="btnUpdateBedOccupancy">🛏️ Update Bed Status</button>
          <button class="btn-core btn-primary-role" style="--role-color:var(--c-hospital);" id="btnOnboardStaff">➕ Onboard Healthcare Staff</button>
        </div>
      </div>

      <!-- KPI Grid -->
      <div class="kpi-cards-grid">
        <div class="kpi-stat-card">
          <div class="kpi-card-glow-edge" style="background:linear-gradient(90deg, transparent, var(--c-hospital), transparent);"></div>
          <div class="kpi-top-row">
            <div class="kpi-icon-pill" style="--role-color:var(--c-hospital); --role-bg:var(--c-hospital-bg);">👨‍⚕️</div>
            <span class="kpi-trend-pill kpi-trend-up">6 Departments</span>
          </div>
          <div class="kpi-stat-value" id="statStaffCount">${staffList.length}</div>
          <div class="kpi-stat-label">Active Clinical & Allied Staff</div>
        </div>

        <div class="kpi-stat-card">
          <div class="kpi-card-glow-edge" style="background:linear-gradient(90deg, transparent, var(--c-hospital), transparent);"></div>
          <div class="kpi-top-row">
            <div class="kpi-icon-pill" style="--role-color:var(--c-hospital); --role-bg:var(--c-hospital-bg);">🤝</div>
            <span class="kpi-trend-pill kpi-trend-up">100% Assigned</span>
          </div>
          <div class="kpi-stat-value">68</div>
          <div class="kpi-stat-label">Allocated Inpatients</div>
        </div>

        <div class="kpi-stat-card">
          <div class="kpi-card-glow-edge" style="background:linear-gradient(90deg, transparent, var(--c-hospital), transparent);"></div>
          <div class="kpi-top-row">
            <div class="kpi-icon-pill" style="--role-color:var(--c-hospital); --role-bg:var(--c-hospital-bg);">🛏️</div>
            <span class="kpi-trend-pill kpi-trend-warn">70.3% Occupancy</span>
          </div>
          <div class="kpi-stat-value" id="statBedOccupancy">64 / 91</div>
          <div class="kpi-stat-label">Total Beds Occupied</div>
        </div>

        <div class="kpi-stat-card">
          <div class="kpi-card-glow-edge" style="background:linear-gradient(90deg, transparent, var(--c-hospital), transparent);"></div>
          <div class="kpi-top-row">
            <div class="kpi-icon-pill" style="--role-color:var(--c-hospital); --role-bg:var(--c-hospital-bg);">🏥</div>
            <span class="kpi-trend-pill kpi-trend-up">8 Open</span>
          </div>
          <div class="kpi-stat-value">8</div>
          <div class="kpi-stat-label">Available NICU / HDU Beds</div>
        </div>
      </div>

      <!-- Main Layout Grid -->
      <div class="dashboard-grid-layout">
        <!-- Bed & ICU Availability Tracker -->
        <div class="col-span-5 dashboard-panel">
          <div class="panel-header-bar">
            <div class="panel-title-group">
              <span class="panel-main-title">🛏️ Bed & ICU Live Availability</span>
            </div>
            <span class="status-pill active">Real-Time Sync</span>
          </div>
          <div class="panel-content-body">
            <div class="capacity-progress-stack" id="bedCapacityStack">
              <!-- Rendered dynamically -->
            </div>

            <div style="margin-top:20px; padding:12px; background:rgba(245, 158, 11, 0.08); border-radius:var(--radius-md); border:1px solid rgba(245, 158, 11, 0.3);">
              <div style="display:flex; align-items:center; gap:6px; font-weight:700; color:#FBBF24; font-size:12px;">
                <span>⚠️</span> Capacity Alert: Post-Op Suite at 90%
              </div>
              <p style="font-size:11.5px; color:var(--text-secondary); margin-top:4px;">
                2 pending discharges scheduled for 15:00. Recommend shifting stabilized patients to general step-down ward.
              </p>
            </div>
          </div>
        </div>

        <!-- Staff Management Board -->
        <div class="col-span-7 dashboard-panel">
          <div class="panel-header-bar">
            <div class="panel-title-group">
              <span class="panel-main-title">👨‍⚕️ Clinical & Allied Staff Directory</span>
            </div>
            <span class="panel-badge" id="staffRosterCount">${staffList.length} Members</span>
          </div>
          <div class="panel-content-body no-padding">
            <div class="data-table-wrapper">
              <table class="custom-data-table" id="staffTable">
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Role & Dept</th>
                    <th>Active Load</th>
                    <th>Status</th>
                    <th style="text-align:right;">Actions</th>
                  </tr>
                </thead>
                <tbody id="staffTableBody">
                  <!-- Rendered dynamically -->
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Patient Allocation Matrix -->
        <div class="col-span-12 dashboard-panel">
          <div class="panel-header-bar">
            <div class="panel-title-group">
              <span class="panel-main-title">🔗 Doctor–Patient Allocation & Caseload Matrix</span>
              <span class="panel-badge">Clinical Workload Distribution</span>
            </div>
            <button class="btn-core btn-secondary btn-sm" id="btnBalanceCaseload">⚖️ Rebalance Caseload</button>
          </div>
          <div class="panel-content-body no-padding">
            <div class="data-table-wrapper">
              <table class="custom-data-table" id="matrixTable">
                <thead>
                  <tr>
                    <th>Practitioner</th>
                    <th>Clinical Specialty</th>
                    <th>High Risk Patients</th>
                    <th>Normal Care</th>
                    <th>Post-Op Recovery</th>
                    <th>Total Load / Capacity</th>
                    <th>Caseload Safety</th>
                  </tr>
                </thead>
                <tbody id="matrixTableBody">
                  <!-- Rendered dynamically -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    renderBedCapacity();
    renderStaffTable();
    renderMatrixTable();
    attachEvents();
  }

  function renderBedCapacity() {
    const container = document.getElementById('bedCapacityStack');
    if (!container) return;

    container.innerHTML = Object.values(bedCapacity).map(item => {
      const pct = Math.round((item.occupied / item.total) * 100);
      const fillClass = pct > 85 ? 'crit' : pct > 65 ? 'warn' : 'good';
      return `
        <div class="capacity-item-row">
          <div class="capacity-label-line">
            <span>${item.label}</span>
            <strong style="font-family:var(--font-mono);">${item.occupied} / ${item.total} beds (${pct}%)</strong>
          </div>
          <div class="capacity-track-bar">
            <div class="capacity-fill-bar ${fillClass}" style="width:${pct}%;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderStaffTable() {
    const tbody = document.getElementById('staffTableBody');
    if (!tbody) return;

    tbody.innerHTML = staffList.map(stf => `
      <tr>
        <td>
          <div style="font-weight:700; color:var(--text-primary);">${stf.name}</div>
          <div style="font-size:11.5px; color:var(--text-muted);">${stf.phone}</div>
        </td>
        <td>
          <div style="font-weight:600; color:var(--c-hospital); font-size:12.5px;">${stf.role}</div>
          <div style="font-size:11.5px; color:var(--text-secondary);">${stf.dept}</div>
        </td>
        <td>
          <strong style="font-family:var(--font-mono);">${stf.patients}</strong> <span style="font-size:11.5px; color:var(--text-muted);">mothers</span>
        </td>
        <td>
          ${stf.status === 'Active'
            ? `<span class="status-pill active">● Active</span>`
            : `<span class="status-pill offline">○ ${stf.status}</span>`
          }
        </td>
        <td style="text-align:right;">
          <button class="btn-core btn-secondary btn-sm" onclick="HospitalAdminDashboardView.toggleStaffStatus('${stf.id}')">
            ${stf.status === 'Active' ? 'Mark Leave' : 'Activate'}
          </button>
        </td>
      </tr>
    `).join('');
  }

  function renderMatrixTable() {
    const tbody = document.getElementById('matrixTableBody');
    if (!tbody) return;

    tbody.innerHTML = doctorMatrix.map(doc => {
      const pct = Math.round((doc.total / doc.maxCap) * 100);
      const isHigh = pct >= 90;
      return `
        <tr>
          <td><strong>${doc.name}</strong></td>
          <td><span style="color:var(--text-secondary);">${doc.specialty}</span></td>
          <td><span class="status-pill critical" style="font-size:11px;">⚠️ ${doc.highRisk} Critical</span></td>
          <td><span style="color:var(--text-primary);">${doc.normal}</span></td>
          <td><span style="color:var(--text-primary);">${doc.postOp}</span></td>
          <td>
            <strong style="font-family:var(--font-mono);">${doc.total} / ${doc.maxCap}</strong>
            <span style="font-size:11px; color:var(--text-muted);">(${pct}%)</span>
          </td>
          <td>
            ${isHigh
              ? `<span class="status-pill critical">🚨 Near Max Load</span>`
              : `<span class="status-pill active">✓ Balanced</span>`
            }
          </td>
        </tr>
      `;
    }).join('');
  }

  function attachEvents() {
    const onboardBtn = document.getElementById('btnOnboardStaff');
    if (onboardBtn) {
      onboardBtn.addEventListener('click', () => {
        if (window.BellyBandLayout) {
          window.BellyBandLayout.showModal({
            title: '👨‍⚕️ Onboard Healthcare Professional',
            body: `
              <form id="onboardStaffForm">
                <div class="form-input-group">
                  <label class="form-input-label">Full Name & Title</label>
                  <input type="text" id="newStaffName" class="form-control-input" placeholder="e.g. Dr. Ramesh Gupta, MS" required />
                </div>
                <div class="form-input-group">
                  <label class="form-input-label">Clinical Role / Designation</label>
                  <input type="text" id="newStaffRole" class="form-control-input" placeholder="e.g. Consultant OB-GYN" required />
                </div>
                <div class="form-input-group">
                  <label class="form-input-label">Department</label>
                  <select id="newStaffDept" class="form-control-select">
                    <option value="Clinical Services">Clinical Services (Obstetrics & Gynecology)</option>
                    <option value="Allied Health">Allied Health & Nutrition</option>
                    <option value="Nursing Operations">Nursing & Inpatient Care</option>
                    <option value="Community Outreach">Community Outreach & Field Services</option>
                  </select>
                </div>
                <div class="form-input-group">
                  <label class="form-input-label">Contact Phone / Emergency</label>
                  <input type="tel" id="newStaffPhone" class="form-control-input" placeholder="+91 98000 11223" />
                </div>
              </form>
            `,
            confirmText: 'Complete Staff Onboarding',
            onConfirm: () => {
              const name = document.getElementById('newStaffName')?.value.trim();
              const role = document.getElementById('newStaffRole')?.value.trim();
              const dept = document.getElementById('newStaffDept')?.value;
              const phone = document.getElementById('newStaffPhone')?.value.trim();
              if (!name || !role) {
                alert('Please enter name and role.');
                return false;
              }
              const newMember = {
                id: `STF-${Math.floor(110 + Math.random() * 200)}`,
                name,
                role,
                dept,
                patients: 0,
                status: 'Active',
                phone: phone || '+91 98000 00000'
              };
              staffList.unshift(newMember);
              renderStaffTable();
              window.BellyBandLayout.showToast(`✅ Healthcare staff "${name}" onboarded successfully.`);
              return true;
            }
          });
        }
      });
    }

    const updateBedBtn = document.getElementById('btnUpdateBedOccupancy');
    if (updateBedBtn) {
      updateBedBtn.addEventListener('click', () => {
        if (window.BellyBandLayout) {
          window.BellyBandLayout.showModal({
            title: '🛏️ Adjust Ward & ICU Occupancy',
            body: `
              <div style="display:flex; flex-direction:column; gap:12px;">
                <div class="form-input-group">
                  <label class="form-input-label">Maternity Ward Occupied (Max 36)</label>
                  <input type="number" id="bedMaternityInput" class="form-control-input" value="${bedCapacity.maternity.occupied}" min="0" max="36" />
                </div>
                <div class="form-input-group">
                  <label class="form-input-label">NICU / HDU Occupied (Max 20)</label>
                  <input type="number" id="bedIcuInput" class="form-control-input" value="${bedCapacity.icu.occupied}" min="0" max="20" />
                </div>
                <div class="form-input-group">
                  <label class="form-input-label">Post-Op Recovery Occupied (Max 20)</label>
                  <input type="number" id="bedRecoveryInput" class="form-control-input" value="${bedCapacity.recovery.occupied}" min="0" max="20" />
                </div>
              </div>
            `,
            confirmText: 'Save Bed Updates',
            onConfirm: () => {
              bedCapacity.maternity.occupied = parseInt(document.getElementById('bedMaternityInput').value, 10) || 0;
              bedCapacity.icu.occupied = parseInt(document.getElementById('bedIcuInput').value, 10) || 0;
              bedCapacity.recovery.occupied = parseInt(document.getElementById('bedRecoveryInput').value, 10) || 0;
              renderBedCapacity();
              window.BellyBandLayout.showToast('✅ Ward & ICU bed availability updated.');
              return true;
            }
          });
        }
      });
    }

    const balanceBtn = document.getElementById('btnBalanceCaseload');
    if (balanceBtn) {
      balanceBtn.addEventListener('click', () => {
        doctorMatrix[0].highRisk = 8;
        doctorMatrix[0].total = 26;
        doctorMatrix[1].highRisk = 9;
        doctorMatrix[1].total = 18;
        renderMatrixTable();
        if (window.BellyBandLayout) {
          window.BellyBandLayout.showToast('⚖️ Caseload auto-balanced across available OB-GYN specialists.');
        }
      });
    }
  }

  function toggleStaffStatus(id) {
    const stf = staffList.find(s => s.id === id);
    if (!stf) return;
    stf.status = stf.status === 'Active' ? 'On Leave' : 'Active';
    renderStaffTable();
    if (window.BellyBandLayout) {
      window.BellyBandLayout.showToast(`Updated status for ${stf.name} to "${stf.status}".`);
    }
  }

  return {
    render,
    toggleStaffStatus
  };
});
