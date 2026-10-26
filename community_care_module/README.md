# 🏥 MaaCare / BellyBand: Collaborative Community & Care Team Module
### Architectural Blueprint, Multi-Role RBAC & Full-Stack Tele-Health Implementation

---

## 📌 1. System Topology & Architecture
The **Collaborative Community & Care Team Module** provides an offline-ready, human-first maternal care ecosystem connecting **Pregnant Mothers, Partners, Gynecologists, Nutritionists, ASHA Workers, and Hospital Desks**.

```
                           ┌──────────────────────────────┐
                           │      MaaCare API & Gateway   │
                           │   (Node.js / Express / WS)   │
                           └──────────────┬───────────────┘
                                          │
            ┌─────────────────────────────┼─────────────────────────────┐
            ▼                             ▼                             ▼
   ┌─────────────────┐           ┌─────────────────┐           ┌─────────────────┐
   │  Peer Community │           │   LiveKit WebRTC│           │   One-Touch SOS │
   │ & Verified Q&A  │           │ Tele-Consults   │           │ Auto-Escalation │
   │ (Open Forums)   │           │ (2G/3G Adaptive)│           │ (Multi-Party)   │
   └─────────────────┘           └────────┬────────┘           └────────┬────────┘
                                          │                             │
                                 ┌────────┴────────┐           ┌────────┴────────┐
                                 │ Real-Time BLE   │           │ Hospital Bed    │
                                 │ Vitals Stream   │           │ & Ambulance     │
                                 │ (FHR / BP / O2) │           │ Dispatch Desk   │
                                 └─────────────────┘           └─────────────────┘
```

---

## 🔒 2. Multi-Role RBAC & Data Isolation (DISHA / HIPAA)

| Role | Access Scope | Video / Voice | Real-Time Vitals | Special Action |
|---|---|---|---|---|
| **Pregnant Mother** | Personal Care Team & Peer Forums | High Priority | Stream BLE Telemetry | **One-Touch SOS Trigger** |
| **Partner** | Synced Care Team & Emergency Bridge | Multi-Party Join | Read-Only | Emergency Audio Bridge |
| **Gynecologist (MD)** | Clinical Channels & Consults | Room Admin | **Real-Time Side Drawer** | Issue Digital e-Prescriptions |
| **Clinical Nutritionist** | Dietary Channels & Group Q&A | Standard | Dietary logs & Glucose | Custom Trimester Meal Plans |
| **ASHA Worker (NGO)** | Field Patient Care Channels | VoIP Audio | Basic Vitals | Welfare Support & Dispatch |
| **Hospital Admin** | Hospital Triage & Inbound SOS | Desk Audio | Inbound Triage Metrics | Bed Allocation & OT Prep |

---

## 📡 3. Real-Time WebSocket Event Contracts

### 💬 Chat & Translation
- `channel:join` — `{ channelId: string }`
- `message:send` — `{ channelId, messageType, encryptedPayload, ivNonce, originalLanguage }`
- `message:received` — Broadcasts message with auto-translated text for Indian regional languages (`hi`, `bn`, `te`, `ta`, `kn`).

### 🩺 Real-Time BLE Patient Vitals Stream
- `vitals:stream_ble_packet` — Mother app streams BLE Fetal Doppler Heart Rate, Blood Pressure, and SpO2.
- `vitals:telemetry_update` — Broadcasts into the **Gynecologist's Live Tele-Consult Side Drawer**.
- `vitals:critical_alert` — Triggered when FHR < 110 or Systolic BP ≥ 140 mmHg.

### 🚨 Emergency SOS Escalation Sequence
1. Mother presses **🚨 SOS**.
2. WebSocket emits `sos:alarm_triggered` with GPS coordinates.
3. VoIP push to Partner (`sos:partner_bridge_call`).
4. Auto-bridge to On-Call Gynecologist (`sos:clinician_override_call`).
5. Dispatch to Hospital Desk (`sos:hospital_inbound_triage`) & ASHA Field Coordinator.

---

## 📦 4. Codebase Structure

```
community_care_module/
├── schemas/
│   └── schema.sql                  # PostgreSQL DISHA/HIPAA DDL schema
├── server/
│   └── src/
│       ├── types/index.ts          # TypeScript RBAC, Vitals & Payload types
│       ├── middleware/rbac.ts      # Role-gating & channel isolation middleware
│       ├── services/
│       │   ├── livekitService.ts   # WebRTC token generator & 2G/3G QoS adaptation
│       │   └── sosEmergencyService.ts # One-touch SOS auto-escalation state machine
│       └── socket/
│           └── chatAndVitalsGateway.ts # Real-time chat & BLE vitals stream gateway
└── mobile/
    ├── CommunityHub.tsx            # Multi-Tab Community (Forums, Q&A, Care Team)
    ├── TeleConsultScreen.tsx       # WebRTC Video + Clinician Vitals Side-Drawer
    └── RoleGatedChat.tsx           # Verified Role Badges, Voice Notes & E2EE Chat
```
