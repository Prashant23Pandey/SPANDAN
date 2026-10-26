/**
 * ============================================================================
 * BELLYBAND — EMERGENCY & LOGISTICS DASHBOARD VIEW (/dashboard/emergency)
 * File: view-emergency.js
 *
 * Features:
 * - Live SOS Alert Feed with real-time GPS coordinates & urgency scoring
 * - Patient Rapid Emergency Card (Blood group, allergies, risk flags, quick print)
 * - Ambulance Dispatch Tracker (Unit-01, Unit-02, Unit-03 ETA countdown & GPS routes)
 * ============================================================================
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.EmergencyDashboardView = factory();
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  let sosAlerts = [
    {
      id: 'SOS-8821',
      patient: 'Savitri Devi',
      age: 24,
      week: 'W38',
      location: 'Rampur Village (25.3176° N, 82.9739° E)',
      distance: '4.2 km',
      severity: 'CRITICAL',
      trigger: 'Automated Wearable Hemorrhage & BP Spike (158/102 mmHg)',
      timeAgo: '3 mins ago',
      ambulanceAssigned: 'Unit-01',
      eta: '4 mins',
      status: 'En Route'
    },
    {
      id: 'SOS-8820',
      patient: 'Meera Patel',
      age: 29,
      week: 'W34',
      location: 'South Extension II (28.5684° N, 77.2215° E)',
      distance: '6.8 km',
      severity: 'HIGH',
      trigger: 'Pre-Eclampsia Symptom Alert (Severe Blurred Vision)',
      timeAgo: '12 mins ago',
      ambulanceAssigned: 'Unit-03',
      eta: '8 mins',
      status: 'Dispatched'
    },
    {
      id: 'SOS-8819',
      patient: 'Ananya Sharma',
      age: 27,
      week: 'W28',
      location: 'Indiranagar (12.9784° N, 77.6408° E)',
      distance: '2.1 km',
      severity: 'MODERATE',
      trigger: 'Manual SOS Trigger — Sudden severe abdominal cramps',
      timeAgo: '28 mins ago',
      ambulanceAssigned: 'Standby Unit',
      eta: '11 mins',
      status: 'Triage'
    }
  ];

  let rapidPatient = {
    name: 'Savitri Devi',
    regNo: 'REG-99120',
    bloodGroup: 'B Positive (B+)',
    gestationalAge: 'Week 38 (Term)',
    fetalHeartRate: '144 BPM (Stable)',
    allergies: 'Penicillin, Sulfa Drugs',
    highRiskFlags: 'Severe Preeclampsia, High BP (158/102), Pedal Edema',
    emergencyContact: '+91 98765 43210 (Husband: Ramesh)',
    assignedDoctor: 'Dr. Priya Mehta, MD (Apollo Maternity)',
    nearestHospital: 'Apollo Maternity & Neonatal Institute (4.2 km)'
  };

  let ambulanceUnits = [
    { id: 'Unit-01', type: 'Advanced Life Support (ALS) Maternal Van', driver: 'Vikram Singh', paramedic: 'Sujata Roy, RN', status: 'En Route → Rampur', eta: '4 min', gps: '25.3190° N, 82.9710° E' },
    { id: 'Unit-02', type: 'Basic Life Support (BLS) Outreach Unit', driver: 'Mahesh Sharma', paramedic: 'Kishore Pal', status: 'Stationed at Apollo HQ', eta: 'Available', gps: '28.5670° N, 77.2200° E' },
    { id: 'Unit-03', type: 'Advanced Life Support (ALS) Maternal Van', driver: 'Gurpreet Singh', paramedic: 'Archana Devi, RN', status: 'En Route → South Ext', eta: '8 min', gps: '28.5700° N, 77.2250° E' }
  ];

  function render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <!-- View Header -->
      <div class="view-header-row">
        <div class="view-heading-group">
          <div class="view-eyebrow" style="color:var(--c-emergency);">🚨 Tactical Emergency & Tactical Logistics Hub</div>
          <h1 class="view-main-title">Emergency Response Command</h1>
          <p class="view-description">Real-time SOS telemetry feed, Rapid Patient Emergency Cards, and GPS-guided maternal ambulance dispatch.</p>
        </div>
        <div class="view-actions-group">
          <button class="btn-core btn-danger" id="btnDeclareCodeRed" style="animation:alertBorderPulse 1.5s infinite alternate;">🆘 Declare Code Red</button>
        </div>
      </div>

      <!-- Active SOS Alert Banner -->
      <div class="sos-banner-card">
        <div class="sos-badge-icon">🆘</div>
        <div style="flex:1;">
          <div style="font-size:18px; font-weight:800; color:#fff;">3 Active SOS Maternal Alerts — Urgent Response Engaged</div>
          <div style="font-size:13px; color:rgba(255,255,255,0.85); margin-top:2px;">
            Critical alert from <strong>Savitri Devi (Rampur)</strong>. ALS Ambulance Unit-01 is 4 minutes away.
          </div>
        </div>
        <button class="btn-core btn-secondary" style="border-color:rgba(255,255,255,0.4); color:#fff; background:rgba(255,255,255,0.12);" id="btnFocusTopSOS">
          View Unit-01 Telemetry →
        </button>
      </div>

      <!-- KPI Grid -->
      <div class="kpi-cards-grid">
        <div class="kpi-stat-card">
          <div class="kpi-card-glow-edge" style="background:linear-gradient(90deg, transparent, var(--c-emergency), transparent);"></div>
          <div class="kpi-top-row">
            <div class="kpi-icon-pill" style="--role-color:var(--c-emergency); --role-bg:var(--c-emergency-bg);">🆘</div>
            <span class="kpi-trend-pill kpi-trend-crit">3 Live Alerts</span>
          </div>
          <div class="kpi-stat-value" style="color:#F87171;" id="statActiveSosCount">${sosAlerts.length}</div>
          <div class="kpi-stat-label">Active SOS Emergencies</div>
        </div>

        <div class="kpi-stat-card">
          <div class="kpi-card-glow-edge" style="background:linear-gradient(90deg, transparent, var(--c-emergency), transparent);"></div>
          <div class="kpi-top-row">
            <div class="kpi-icon-pill" style="--role-color:var(--c-emergency); --role-bg:var(--c-emergency-bg);">🚑</div>
            <span class="kpi-trend-pill kpi-trend-up">2 ALS In Transit</span>
          </div>
          <div class="kpi-stat-value">2</div>
          <div class="kpi-stat-label">Ambulances Currently Dispatched</div>
        </div>

        <div class="kpi-stat-card">
          <div class="kpi-card-glow-edge" style="background:linear-gradient(90deg, transparent, var(--c-emergency), transparent);"></div>
          <div class="kpi-top-row">
            <div class="kpi-icon-pill" style="--role-color:var(--c-emergency); --role-bg:var(--c-emergency-bg);">⏱️</div>
            <span class="kpi-trend-pill kpi-trend-up">↓ 2.4 min vs avg</span>
          </div>
          <div class="kpi-stat-value">6.8 min</div>
          <div class="kpi-stat-label">Average Response & Arrival Time</div>
        </div>

        <div class="kpi-stat-card">
          <div class="kpi-card-glow-edge" style="background:linear-gradient(90deg, transparent, var(--c-emergency), transparent);"></div>
          <div class="kpi-top-row">
            <div class="kpi-icon-pill" style="--role-color:var(--c-emergency); --role-bg:var(--c-emergency-bg);">✅</div>
            <span class="kpi-trend-pill kpi-trend-up">100% Success</span>
          </div>
          <div class="kpi-stat-value">14</div>
          <div class="kpi-stat-label">Mothers Safely Stabilized (24h)</div>
        </div>
      </div>

      <!-- Main Layout Grid -->
      <div class="dashboard-grid-layout">
        <!-- Live SOS Alert Feed -->
        <div class="col-span-6 dashboard-panel">
          <div class="panel-header-bar">
            <div class="panel-title-group">
              <span class="panel-main-title">🆘 Live Maternal SOS Alert Feed</span>
            </div>
            <span class="status-pill critical">● STREAMING ALERTS</span>
          </div>
          <div class="panel-content-body no-padding">
            <div class="data-table-wrapper">
              <table class="custom-data-table" id="sosTable">
                <thead>
                  <tr>
                    <th>Patient & Trigger</th>
                    <th>Location & Distance</th>
                    <th>Assigned Unit</th>
                    <th>Severity</th>
                    <th style="text-align:right;">Actions</th>
                  </tr>
                </thead>
                <tbody id="sosTableBody">
                  <!-- Rendered dynamically -->
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Ambulance Dispatch & Live GPS Tracker -->
        <div class="col-span-6 dashboard-panel">
          <div class="panel-header-bar">
            <div class="panel-title-group">
              <span class="panel-main-title">🗺️ Maternal Ambulance GPS Dispatch</span>
            </div>
            <span class="panel-badge">3 Fleet Units Active</span>
          </div>
          <div class="panel-content-body">
            <!-- Simulated GPS Map Interface -->
            <div style="height:150px; background:linear-gradient(135deg, #0B1329, #1E293B); border:1px solid var(--border-glass); border-radius:var(--radius-md); display:flex; flex-direction:column; align-items:center; justify-content:center; position:relative; overflow:hidden;">
              <div style="font-size:36px; margin-bottom:6px;">🗺️</div>
              <div style="font-weight:700; font-size:14px; color:#38BDF8;">Live GPS Fleet Tracking Map</div>
              <div style="font-size:11.5px; color:var(--text-muted);">Real-time telemetry overlay for Varanasi & Delhi NCR Hubs</div>
              <div style="position:absolute; top:10px; right:10px; font-size:11px; color:#10B981; font-weight:700;">● Live GPS Telemetry</div>
            </div>

            <!-- Ambulance Units List -->
            <div style="margin-top:14px; display:flex; flex-direction:column; gap:10px;" id="ambulanceListContainer">
              <!-- Rendered dynamically -->
            </div>
          </div>
        </div>

        <!-- Patient Rapid Emergency Card -->
        <div class="col-span-12 dashboard-panel">
          <div class="panel-header-bar">
            <div class="panel-title-group">
              <span class="panel-main-title">🪪 Patient Rapid Emergency Profile Card: <span id="rapidCardPatientName">${rapidPatient.name}</span></span>
            </div>
            <div style="display:flex; gap:8px;">
              <button class="btn-core btn-secondary btn-sm" id="btnPrintRapidCard">🖨️ Print Rapid Card</button>
              <button class="btn-core btn-primary-role btn-sm" style="--role-color:var(--c-emergency);" id="btnAlertReceivingHospital">🏥 Alert Trauma/OT Team</button>
            </div>
          </div>
          <div class="panel-content-body">
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:16px;">
              <div style="background:var(--bg-glass-card); border:1px solid var(--border-glass); padding:14px; border-radius:var(--radius-md);">
                <div class="vitals-title">Blood Group</div>
                <div style="font-size:22px; font-weight:800; color:#F87171; margin-top:4px;">${rapidPatient.bloodGroup}</div>
              </div>
              <div style="background:var(--bg-glass-card); border:1px solid var(--border-glass); padding:14px; border-radius:var(--radius-md);">
                <div class="vitals-title">Gestational Age</div>
                <div style="font-size:22px; font-weight:800; color:var(--text-primary); margin-top:4px;">${rapidPatient.gestationalAge}</div>
              </div>
              <div style="background:var(--bg-glass-card); border:1px solid var(--border-glass); padding:14px; border-radius:var(--radius-md);">
                <div class="vitals-title">Known Drug Allergies</div>
                <div style="font-size:14px; font-weight:700; color:#F87171; margin-top:6px;">⚠️ ${rapidPatient.allergies}</div>
              </div>
              <div style="background:var(--bg-glass-card); border:1px solid var(--border-glass); padding:14px; border-radius:var(--radius-md);">
                <div class="vitals-title">Emergency Contact (Family)</div>
                <div style="font-size:14px; font-weight:700; color:var(--text-primary); margin-top:6px;">${rapidPatient.emergencyContact}</div>
              </div>
              <div style="background:var(--bg-glass-card); border:1px solid var(--border-glass); padding:14px; border-radius:var(--radius-md); grid-column:span 2;">
                <div class="vitals-title">Critical High-Risk Flags & Clinical History</div>
                <div style="font-size:13px; font-weight:600; color:#FCA5A5; margin-top:6px;">${rapidPatient.highRiskFlags}</div>
              </div>
              <div style="background:var(--bg-glass-card); border:1px solid var(--border-glass); padding:14px; border-radius:var(--radius-md); grid-column:span 2;">
                <div class="vitals-title">Designated Receiving Facility & Attending Specialist</div>
                <div style="font-size:13px; font-weight:600; color:var(--text-primary); margin-top:6px;">${rapidPatient.nearestHospital} • ${rapidPatient.assignedDoctor}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    renderSOSTable();
    renderAmbulanceUnits();
    attachEvents();
  }

  function renderSOSTable() {
    const tbody = document.getElementById('sosTableBody');
    if (!tbody) return;

    tbody.innerHTML = sosAlerts.map(sos => `
      <tr>
        <td>
          <div style="font-weight:700; color:var(--text-primary);">${sos.patient} (${sos.week})</div>
          <div style="font-size:11.5px; color:#FCA5A5;">${sos.trigger}</div>
        </td>
        <td>
          <div style="font-size:12.5px;">${sos.location}</div>
          <div style="font-size:11px; color:var(--text-muted);">Distance: ${sos.distance}</div>
        </td>
        <td>
          <strong>${sos.ambulanceAssigned}</strong>
          <div style="font-size:11px; color:#10B981;">ETA: ${sos.eta}</div>
        </td>
        <td>
          ${sos.severity === 'CRITICAL'
            ? `<span class="status-pill critical" style="font-size:11px;">🚨 CRITICAL</span>`
            : `<span class="status-pill pending" style="font-size:11px;">⚠️ ${sos.severity}</span>`
          }
        </td>
        <td style="text-align:right;">
          <button class="btn-core btn-secondary btn-sm" onclick="EmergencyDashboardView.loadRapidCard('${sos.patient}')">Rapid Card</button>
        </td>
      </tr>
    `).join('');
  }

  function renderAmbulanceUnits() {
    const container = document.getElementById('ambulanceListContainer');
    if (!container) return;

    container.innerHTML = ambulanceUnits.map(unit => `
      <div style="padding:10px 14px; background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); border-radius:var(--radius-md); display:flex; align-items:center; justify-content:space-between;">
        <div>
          <div style="font-weight:700; color:var(--text-primary); font-size:13.5px;">🚑 ${unit.id} • ${unit.type}</div>
          <div style="font-size:11.5px; color:var(--text-muted);">Crew: Driver ${unit.driver} | ${unit.paramedic}</div>
        </div>
        <div style="text-align:right;">
          <span class="status-pill ${unit.eta === 'Available' ? 'active' : 'critical'}" style="font-size:11px;">
            ${unit.status} (${unit.eta})
          </span>
        </div>
      </div>
    `).join('');
  }

  function attachEvents() {
    const codeRedBtn = document.getElementById('btnDeclareCodeRed');
    if (codeRedBtn) {
      codeRedBtn.addEventListener('click', () => {
        if (window.BellyBandLayout) {
          window.BellyBandLayout.showModal({
            title: '🆘 Broadcast Mass Emergency (Code Red)',
            body: `
              <div style="padding:14px; background:rgba(239,68,68,0.15); border:1.5px solid rgba(239,68,68,0.4); border-radius:var(--radius-md); margin-bottom:14px;">
                <div style="font-weight:800; color:#F87171; font-size:14px;">HIGH-PRIORITY LOGISTICAL BROADCAST</div>
                <p style="font-size:12px; color:var(--text-secondary); margin-top:4px;">
                  Alerts all standby ALS ambulances, reserves maternal ICU suites at nearby hospitals, and activates blood bank matching protocols.
                </p>
              </div>
              <div class="form-input-group">
                <label class="form-input-label">Emergency Incident Details</label>
                <textarea id="codeRedNotes" class="form-control-textarea" rows="2" placeholder="e.g. Mass emergency triage required in Varanasi District. Multiple high-risk mothers in transit."></textarea>
              </div>
            `,
            confirmText: 'BROADCAST CODE RED',
            onConfirm: () => {
              window.BellyBandLayout.showToast('🚨 CODE RED BROADCASTED: All standby ambulances mobilized and ICU reserves locked.');
              return true;
            }
          });
        }
      });
    }

    const alertHospBtn = document.getElementById('btnAlertReceivingHospital');
    if (alertHospBtn) {
      alertHospBtn.addEventListener('click', () => {
        if (window.BellyBandLayout) {
          window.BellyBandLayout.showToast('🏥 Apollo Maternity Trauma & Delivery Suite prepared for Savitri Devi arrival.');
        }
      });
    }

    const printCardBtn = document.getElementById('btnPrintRapidCard');
    if (printCardBtn) {
      printCardBtn.addEventListener('click', () => {
        window.print();
      });
    }
  }

  function loadRapidCard(patientName) {
    const alert = sosAlerts.find(a => a.patient === patientName);
    if (!alert) return;
    rapidPatient.name = alert.patient;
    rapidPatient.gestationalAge = `${alert.week} (High Priority)`;
    rapidPatient.highRiskFlags = alert.trigger;

    const el = document.getElementById('rapidCardPatientName');
    if (el) el.textContent = alert.patient;
    if (window.BellyBandLayout) {
      window.BellyBandLayout.showToast(`🪪 Rapid Emergency Card loaded for ${alert.patient}.`);
    }
  }

  return {
    render,
    loadRapidCard
  };
});
