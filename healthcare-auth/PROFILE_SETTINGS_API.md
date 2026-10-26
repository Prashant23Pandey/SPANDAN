# Account & Profile Settings (Multi‑Role)

This module is implemented in the existing RBAC dashboard (`healthcare-auth/rbac/rbac-dashboard.html#account`) with a universal UI, plus a Node/Express REST API for safe updates.

## Frontend entry

- UI screen: `healthcare-auth/rbac/rbac-dashboard.html#account`
- Behavior: `healthcare-auth/rbac/profile-settings.js`
- Styles: `healthcare-auth/rbac/profile-settings.css`

## Authentication bridge (PHP session → JWT)

The RBAC dashboard currently runs in **PHP session mode** (see `healthcare-auth/php/api/me.php`).  
To call Node’s JWT‑protected APIs from the same UI, a session bridge endpoint mints a short‑lived token:

- `GET /BELLYBAND/healthcare-auth/php/api/jwt.php`
  - Returns: `{ success, accessToken, expiresInSeconds }`
  - Requirement: PHP session must be active (`$_SESSION['hc_user_id']` present)

Keep `JWT_SECRET` aligned between:
- Node: `healthcare-auth/server/.env`
- PHP: environment variable `JWT_SECRET` (used by `php/api/jwt.php`)

## Database additions

The extended settings fields are stored outside `hc_users` to avoid schema bloat.

- `hc_user_profiles`
  - Universal fields (preferred name, pronouns, avatar path)
  - `role_data` JSON for role‑specific attributes
  - `notification_prefs` JSON for notification toggles
- `hc_email_otp_log`
  - OTP records for email change verification

See `healthcare-auth/healthcare_db.sql` (sections “TABLE 3B” and “TABLE 6B”).

## REST API

Base URL (local): `http://localhost:3001/api/v1/user`

### GET `/profile`

Returns the merged profile for the authenticated user.

**Response**
```json
{
  "success": true,
  "profile": {
    "userId": 1,
    "userRole": "ROLE_DOCTOR",
    "status": "verified",
    "email": "admin@bellyband.health",
    "fullName": "Dr. Admin User",
    "preferredName": null,
    "gender": null,
    "pronouns": null,
    "phone": "+919876543210",
    "avatarPath": "/uploads/profile/avatar_1_1690000000000.webp",
    "twoFaEnabled": true,
    "twoFaMethod": "authenticator",
    "licenseNumber": "ABC123",
    "facilityName": "BellyBand HQ",
    "roleData": {},
    "notificationPrefs": { "email": true, "sms": false, "criticalOnly": false }
  }
}
```

### PUT `/profile`

Updates universal + role‑specific profile data.

**Request**
```json
{
  "fullName": "Dr. Priya Mehta",
  "preferredName": "Priya",
  "pronouns": "she/her",
  "phone": "+919000000000",
  "twoFaEnabled": true,
  "twoFaMethod": "sms",
  "avatarDataUrl": "data:image/webp;base64,...",   // optional; set null to delete
  "signatureDataUrl": null,                       // optional; set null to delete
  "roleData": {
    "specialty": "OB-GYN",
    "yearsExperience": 8,
    "teleAvailability": { "start": "10:00", "end": "16:00" }
  },
  "notificationPrefs": { "email": true, "sms": true, "criticalOnly": false }
}
```

**Rules**
- Role‑specific keys are **whitelisted** server‑side based on `userRole`:
  - Clinical: `specialty`, `yearsExperience`, `teleAvailability`, `signaturePath`
  - Allied/Field: `subSpecialty`, `regions`, `languages`
  - Admin: `adminDesignation`, `escalationContact`, `facilityAccessId` (read‑only)
  - Patient/Family: `bloodGroup`, `primaryDoctorId`, `emergencyContacts`
- Avatar/signature uploads are client‑side processed and sent as data URLs (JPEG/PNG/WebP, max 5MB).

### PUT `/password`

Updates password (requires current password).

**Request**
```json
{ "currentPassword": "OldPass...", "newPassword": "NewPass@Healthcare1" }
```

### Email change (OTP)

Email change is split into two calls:

1. `POST /email/request-otp`
   - Body: `{ "newEmail": "new@email.com" }`
2. `POST /email/verify-otp`
   - Body: `{ "newEmail": "new@email.com", "otp": "123456" }`

In non‑production environments the server returns `devOtp` in the request‑otp response for testing.

