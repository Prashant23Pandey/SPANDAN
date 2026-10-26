/**
 * ============================================================================
 * BELLYBAND — ALLIED HEALTH & WELLNESS DASHBOARD VIEW (/dashboard/allied)
 * File: view-allied.js
 *
 * Features:
 * - Trimester-specific Diet & Lifestyle Plan Builder (T1, T2, T3 macro targets & meal slots)
 * - Patient Async Chat & Prenatal Mental Health / Anxiety Tracker
 * - Wellness Webinar Scheduler & Maternal Workshop Hub
 * ============================================================================
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AlliedHealthDashboardView = factory();
  }
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  let dietPlans = [
    { id: 'DP-01', patient: 'Ananya Sharma', week: 'W28 (Trimester 2)', calories: '2,350 kcal', protein: '78g', iron: '30mg', calcium: '1,200mg', focus: 'Iron & Folic Acid Repletion', status: 'Active' },
    { id: 'DP-02', patient: 'Kavya Reddy', week: 'W36 (Trimester 3)', calories: '2,500 kcal', protein: '85g', iron: '35mg', calcium: '1,400mg', focus: 'Lactation Readiness & High Protein', status: 'Active' },
    { id: 'DP-03', patient: 'Sunita Roy', week: 'W10 (Trimester 1)', calories: '1,950 kcal', protein: '65g', iron: '27mg', calcium: '1,000mg', focus: 'Nausea Control & Organogenesis', status: 'Active' },
  ];

  let webinars = [
    { id: 'WEB-1', title: 'Breastfeeding Fundamentals & Latching for First-Time Mothers', host: 'Kavya Singh, RD', dateTime: 'Aug 29, 2026 • 03:00 PM', registered: 42, max: 50, status: 'Open' },
    { id: 'WEB-2', title: 'Managing Prenatal Anxiety: Mindfulness & Pelvic Breathing', host: 'Dr. Neha Verma (Psychologist)', dateTime: 'Sep 02, 2026 • 05:00 PM', registered: 28, max: 40, status: 'Open' },
    { id: 'WEB-3', title: 'Third Trimester Nutrition: Preventing Gestational Anemia', host: 'Kavya Singh, RD', dateTime: 'Sep 06, 2026 • 04:00 PM', registered: 35, max: 50, status: 'Open' },
  ];

  let chatMessages = [
    { sender: 'patient', name: 'Ananya Sharma', text: 'Hi Kavya! I felt mild heartburn after eating oats in the morning. Should I switch to almond milk?', time: '11:15 AM' },
    { sender: 'therapist', name: 'Kavya Singh (You)', text: 'Hello Ananya! Yes, let us replace regular milk with warm unsweetened almond milk and add a pinch of crushed chia seeds.', time: '11:18 AM' },
    { sender: 'patient', name: 'Ananya Sharma', text: 'Thank you! Also my iron supplements make me a bit constipated. Any dietary tips?', time: '11:22 AM' }
  ];

  function render(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <!-- View Header -->
      <div class="view-header-row">
        <div class="view-heading-group">
          <div class="view-eyebrow" style="color:var(--c-allied);">🧘 Maternal Wellness, Nutrition & Therapy</div>
          <h1 class="view-main-title">Allied Health & Nutrition Console</h1>
          <p class="view-description">Trimester macro-nutrition planning, prenatal emotional health tracking, async care messaging, and wellness webinars.</p>
        </div>
        <div class="view-actions-group">
          <button class="btn-core btn-secondary" id="btnNewWebinar">🎥 Schedule Webinar</button>
          <button class="btn-core btn-primary-role" style="--role-color:var(--c-allied);" id="btnCreateDietPlan">🥗 Create Diet Plan</button>
        </div>
      </div>

      <!-- KPI Grid -->
      <div class="kpi-cards-grid">
        <div class="kpi-stat-card">
          <div class="kpi-card-glow-edge" style="background:linear-gradient(90deg, transparent, var(--c-allied), transparent);"></div>
          <div class="kpi-top-row">
            <div class="kpi-icon-pill" style="--role-color:var(--c-allied); --role-bg:var(--c-allied-bg);">🥗</div>
            <span class="kpi-trend-pill kpi-trend-up">100% Customized</span>
          </div>
          <div class="kpi-stat-value" id="statDietCount">${dietPlans.length}</div>
          <div class="kpi-stat-label">Active Trimester Diet Plans</div>
        </div>

        <div class="kpi-stat-card">
          <div class="kpi-card-glow-edge" style="background:linear-gradient(90deg, transparent, var(--c-allied), transparent);"></div>
          <div class="kpi-top-row">
            <div class="kpi-icon-pill" style="--role-color:var(--c-allied); --role-bg:var(--c-allied-bg);">💬</div>
            <span class="kpi-trend-pill kpi-trend-warn">1 Unread</span>
          </div>
          <div class="kpi-stat-value">14</div>
          <div class="kpi-stat-label">Async Patient Consultations</div>
        </div>

        <div class="kpi-stat-card">
          <div class="kpi-card-glow-edge" style="background:linear-gradient(90deg, transparent, var(--c-allied), transparent);"></div>
          <div class="kpi-top-row">
            <div class="kpi-icon-pill" style="--role-color:var(--c-allied); --role-bg:var(--c-allied-bg);">🧠</div>
            <span class="kpi-trend-pill kpi-trend-up">EPDS Validated</span>
          </div>
          <div class="kpi-stat-value">8.2 / 10</div>
          <div class="kpi-stat-label">Mean Wellness Resilience Index</div>
        </div>

        <div class="kpi-stat-card">
          <div class="kpi-card-glow-edge" style="background:linear-gradient(90deg, transparent, var(--c-allied), transparent);"></div>
          <div class="kpi-top-row">
            <div class="kpi-icon-pill" style="--role-color:var(--c-allied); --role-bg:var(--c-allied-bg);">🎥</div>
            <span class="kpi-trend-pill kpi-trend-up">105 Enrolled</span>
          </div>
          <div class="kpi-stat-value">3</div>
          <div class="kpi-stat-label">Upcoming Live Webinars</div>
        </div>
      </div>

      <!-- Main Layout Grid -->
      <div class="dashboard-grid-layout">
        <!-- Trimester Diet Plan Builder Table -->
        <div class="col-span-8 dashboard-panel">
          <div class="panel-header-bar">
            <div class="panel-title-group">
              <span class="panel-main-title">🥗 Trimester Nutrition & Diet Protocol Builder</span>
            </div>
            <span class="panel-badge">Clinical RDA Targets</span>
          </div>
          <div class="panel-content-body no-padding">
            <div class="data-table-wrapper">
              <table class="custom-data-table" id="dietPlanTable">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Trimester / Stage</th>
                    <th>Calories & Protein</th>
                    <th>Micronutrients</th>
                    <th>Clinical Focus</th>
                    <th style="text-align:right;">Actions</th>
                  </tr>
                </thead>
                <tbody id="dietTableBody">
                  <!-- Rendered dynamically -->
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Prenatal Mental Health & Emotional Wellbeing Tracker -->
        <div class="col-span-4 dashboard-panel">
          <div class="panel-header-bar">
            <div class="panel-title-group">
              <span class="panel-main-title">🧠 Emotional Health Tracker</span>
            </div>
            <span class="status-pill active">EPDS Screening</span>
          </div>
          <div class="panel-content-body">
            <div class="capacity-progress-stack">
              <div class="capacity-item-row">
                <div class="capacity-label-line">
                  <span>Ananya Sharma (Anxiety Score)</span>
                  <strong style="color:#10B981;">3 / 10 (Low)</strong>
                </div>
                <div class="capacity-track-bar"><div class="capacity-fill-bar good" style="width:30%;"></div></div>
              </div>
              <div class="capacity-item-row">
                <div class="capacity-label-line">
                  <span>Meera Patel (Post-Diagnosis Stress)</span>
                  <strong style="color:#F59E0B;">6 / 10 (Moderate)</strong>
                </div>
                <div class="capacity-track-bar"><div class="capacity-fill-bar warn" style="width:60%;"></div></div>
              </div>
              <div class="capacity-item-row">
                <div class="capacity-label-line">
                  <span>Sunita Roy (First Trimester Fatigue)</span>
                  <strong style="color:#10B981;">4 / 10 (Normal)</strong>
                </div>
                <div class="capacity-track-bar"><div class="capacity-fill-bar good" style="width:40%;"></div></div>
              </div>
            </div>

            <div style="margin-top:16px; padding:10px; background:var(--bg-glass-card); border-radius:var(--radius-md); border:1px solid var(--border-glass); font-size:12px; color:var(--text-secondary);">
              💡 <strong>Therapy Note:</strong> Meera Patel prescribed 10 mins of binaural guided relaxation before sleep to support BP regulation.
            </div>
          </div>
        </div>

        <!-- Patient Async Care Chat -->
        <div class="col-span-6 dashboard-panel">
          <div class="panel-header-bar">
            <div class="panel-title-group">
              <span class="panel-main-title">💬 Patient Async Chat (Ananya Sharma)</span>
            </div>
            <span class="status-pill active">● Online</span>
          </div>
          <div class="panel-content-body" style="display:flex; flex-direction:column; height:320px;">
            <div style="flex:1; overflow-y:auto; display:flex; flex-direction:column; gap:10px; padding-right:6px;" id="chatThreadBox">
              <!-- Rendered dynamically -->
            </div>
            <form id="chatReplyForm" style="display:flex; gap:8px; margin-top:12px;">
              <input type="text" id="chatInputText" placeholder="Type dietary advice or reassurance..." class="form-control-input" style="flex:1;" required />
              <button type="submit" class="btn-core btn-primary-role btn-sm" style="--role-color:var(--c-allied);">Send</button>
            </form>
          </div>
        </div>

        <!-- Wellness Webinar Scheduler -->
        <div class="col-span-6 dashboard-panel">
          <div class="panel-header-bar">
            <div class="panel-title-group">
              <span class="panel-main-title">🎥 Live Prenatal Webinar Scheduler</span>
            </div>
            <span class="panel-badge">Maternal Education</span>
          </div>
          <div class="panel-content-body no-padding">
            <div class="data-table-wrapper">
              <table class="custom-data-table" id="webinarTable">
                <thead>
                  <tr>
                    <th>Webinar Topic</th>
                    <th>Presenter</th>
                    <th>Schedule</th>
                    <th>Seats</th>
                    <th style="text-align:right;">Actions</th>
                  </tr>
                </thead>
                <tbody id="webinarTableBody">
                  <!-- Rendered dynamically -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    renderDietTable();
    renderChatThread();
    renderWebinarTable();
    attachEvents();
  }

  function renderDietTable() {
    const tbody = document.getElementById('dietTableBody');
    if (!tbody) return;

    tbody.innerHTML = dietPlans.map(plan => `
      <tr>
        <td>
          <div style="font-weight:700; color:var(--text-primary);">${plan.patient}</div>
          <div style="font-size:11.5px; color:var(--text-muted);">${plan.id}</div>
        </td>
        <td><span class="status-pill active" style="font-size:11px;">${plan.week}</span></td>
        <td>
          <strong>${plan.calories}</strong>
          <div style="font-size:11px; color:var(--text-secondary);">Protein: ${plan.protein}</div>
        </td>
        <td>
          <div style="font-size:12px; color:var(--c-allied);">Iron: ${plan.iron}</div>
          <div style="font-size:11px; color:var(--text-muted);">Calcium: ${plan.calcium}</div>
        </td>
        <td><span style="font-size:12.5px;">${plan.focus}</span></td>
        <td style="text-align:right;">
          <button class="btn-core btn-secondary btn-sm" onclick="AlliedHealthDashboardView.inspectDietPlan('${plan.id}')">View Meal Plan</button>
        </td>
      </tr>
    `).join('');
  }

  function renderChatThread() {
    const box = document.getElementById('chatThreadBox');
    if (!box) return;

    box.innerHTML = chatMessages.map(msg => `
      <div style="align-self:${msg.sender === 'therapist' ? 'flex-end' : 'flex-start'}; max-width:85%; background:${msg.sender === 'therapist' ? 'var(--c-allied-bg)' : 'var(--bg-glass-card)'}; border:1px solid ${msg.sender === 'therapist' ? 'var(--c-allied)' : 'var(--border-glass)'}; border-radius:var(--radius-md); padding:10px 14px;">
        <div style="font-size:11px; font-weight:700; color:${msg.sender === 'therapist' ? '#6EE7B7' : '#38BDF8'}; margin-bottom:2px;">${msg.name} • ${msg.time}</div>
        <div style="font-size:13px; color:var(--text-primary);">${msg.text}</div>
      </div>
    `).join('');
    box.scrollTop = box.scrollHeight;
  }

  function renderWebinarTable() {
    const tbody = document.getElementById('webinarTableBody');
    if (!tbody) return;

    tbody.innerHTML = webinars.map(web => `
      <tr>
        <td>
          <div style="font-weight:700; color:var(--text-primary);">${web.title}</div>
        </td>
        <td><span style="color:var(--text-secondary); font-size:12px;">${web.host}</span></td>
        <td><span style="font-family:var(--font-mono); font-size:11.5px;">${web.dateTime}</span></td>
        <td><strong>${web.registered} / ${web.max}</strong></td>
        <td style="text-align:right;">
          <button class="btn-core btn-secondary btn-sm" onclick="AlliedHealthDashboardView.manageWebinar('${web.id}')">Manage</button>
        </td>
      </tr>
    `).join('');
  }

  function attachEvents() {
    const chatForm = document.getElementById('chatReplyForm');
    if (chatForm) {
      chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('chatInputText');
        const text = input.value.trim();
        if (!text) return;

        chatMessages.push({
          sender: 'therapist',
          name: 'Kavya Singh (You)',
          text: text,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        input.value = '';
        renderChatThread();
      });
    }

    const newDietBtn = document.getElementById('btnCreateDietPlan');
    if (newDietBtn) {
      newDietBtn.addEventListener('click', () => {
        if (window.BellyBandLayout) {
          window.BellyBandLayout.showModal({
            title: '🥗 Build Trimester-Specific Diet Plan',
            body: `
              <form id="newDietForm">
                <div class="form-input-group">
                  <label class="form-input-label">Select Patient</label>
                  <input type="text" id="dietPatient" class="form-control-input" placeholder="e.g. Pooja Bhatt (Week 16)" required />
                </div>
                <div class="form-input-group">
                  <label class="form-input-label">Trimester Stage</label>
                  <select id="dietStage" class="form-control-select">
                    <option value="Trimester 1 (Weeks 1–12)">Trimester 1 (Folic Acid & Morning Sickness Mitigation)</option>
                    <option value="Trimester 2 (Weeks 13–27)">Trimester 2 (Iron, Calcium & Skeletal Growth)</option>
                    <option value="Trimester 3 (Weeks 28–40)">Trimester 3 (DHA, Protein & Lactation Prep)</option>
                  </select>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                  <div class="form-input-group">
                    <label class="form-input-label">Daily Calorie Target</label>
                    <input type="text" id="dietCalories" class="form-control-input" value="2,400 kcal" />
                  </div>
                  <div class="form-input-group">
                    <label class="form-input-label">Daily Protein Target</label>
                    <input type="text" id="dietProtein" class="form-control-input" value="80g" />
                  </div>
                </div>
                <div class="form-input-group">
                  <label class="form-input-label">Clinical Dietary Focus</label>
                  <input type="text" id="dietFocus" class="form-control-input" value="Gestational Diabetes Prevention & High Fiber" />
                </div>
              </form>
            `,
            confirmText: 'Generate & Publish Plan',
            onConfirm: () => {
              const patient = document.getElementById('dietPatient')?.value.trim();
              const stage = document.getElementById('dietStage')?.value;
              const cal = document.getElementById('dietCalories')?.value;
              const prot = document.getElementById('dietProtein')?.value;
              const focus = document.getElementById('dietFocus')?.value;
              if (!patient) return false;

              dietPlans.unshift({
                id: `DP-${Math.floor(10 + Math.random() * 80)}`,
                patient,
                week: stage,
                calories: cal,
                protein: prot,
                iron: '32mg',
                calcium: '1,200mg',
                focus,
                status: 'Active'
              });
              renderDietTable();
              window.BellyBandLayout.showToast(`✅ Customized diet protocol published for ${patient}.`);
              return true;
            }
          });
        }
      });
    }

    const webinarBtn = document.getElementById('btnNewWebinar');
    if (webinarBtn) {
      webinarBtn.addEventListener('click', () => {
        if (window.BellyBandLayout) {
          window.BellyBandLayout.showModal({
            title: '🎥 Schedule Prenatal Wellness Webinar',
            body: `
              <div class="form-input-group">
                <label class="form-input-label">Webinar Title</label>
                <input type="text" id="webTitle" class="form-control-input" placeholder="e.g. Labor Comfort & Partner Support Masterclass" required />
              </div>
              <div class="form-input-group">
                <label class="form-input-label">Lead Presenter</label>
                <input type="text" id="webHost" class="form-control-input" value="Kavya Singh, RD (Lead Nutritionist)" required />
              </div>
              <div class="form-input-group">
                <label class="form-input-label">Date & Time</label>
                <input type="text" id="webDate" class="form-control-input" value="Sep 10, 2026 • 04:00 PM" required />
              </div>
            `,
            confirmText: 'Publish Webinar',
            onConfirm: () => {
              const title = document.getElementById('webTitle')?.value.trim();
              const host = document.getElementById('webHost')?.value.trim();
              const date = document.getElementById('webDate')?.value.trim();
              if (!title) return false;
              webinars.unshift({
                id: `WEB-${Math.floor(4 + Math.random() * 20)}`,
                title,
                host,
                dateTime: date,
                registered: 0,
                max: 50,
                status: 'Open'
              });
              renderWebinarTable();
              window.BellyBandLayout.showToast(`✅ Webinar "${title}" published to patient mobile applications.`);
              return true;
            }
          });
        }
      });
    }
  }

  function inspectDietPlan(id) {
    const p = dietPlans.find(d => d.id === id);
    if (!p || !window.BellyBandLayout) return;

    window.BellyBandLayout.showModal({
      title: `🥗 Meal Protocol: ${p.patient}`,
      body: `
        <div style="font-size:13px; line-height:1.7;">
          <div style="margin-bottom:12px; padding:12px; background:var(--bg-glass-card); border-radius:var(--radius-md); border:1px solid var(--border-glass);">
            <strong>Daily Target:</strong> ${p.calories} | <strong>Protein:</strong> ${p.protein} | <strong>Iron:</strong> ${p.iron} | <strong>Calcium:</strong> ${p.calcium}
          </div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <div style="padding:8px 12px; background:rgba(255,255,255,0.03); border-radius:6px;"><strong>🌅 Breakfast (08:30 AM):</strong> Ragi porridge with crushed almonds + 1 boiled egg or paneer toast.</div>
            <div style="padding:8px 12px; background:rgba(255,255,255,0.03); border-radius:6px;"><strong>☀️ Mid-Morning (11:00 AM):</strong> Fresh tender coconut water + roasted pumpkin & flax seeds.</div>
            <div style="padding:8px 12px; background:rgba(255,255,255,0.03); border-radius:6px;"><strong>🍲 Lunch (01:30 PM):</strong> Brown rice, spinach dal (iron-rich), mixed cucumber curd salad, sauteed beans.</div>
            <div style="padding:8px 12px; background:rgba(255,255,255,0.03); border-radius:6px;"><strong>🌙 Dinner (08:00 PM):</strong> 2 Multigrain rotis, grilled paneer/tofu with methi sabzi, light bottle gourd soup.</div>
          </div>
        </div>
      `,
      confirmText: 'Close',
      onConfirm: () => true
    });
  }

  function manageWebinar(id) {
    if (window.BellyBandLayout) {
      window.BellyBandLayout.showToast(`🎥 Launching Webinar broadcast control room for ${id}...`);
    }
  }

  return {
    render,
    inspectDietPlan,
    manageWebinar
  };
});
