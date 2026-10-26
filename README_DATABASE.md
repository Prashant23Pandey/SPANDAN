# 🗄️ BellyBand Database Setup Guide (MySQL + PHP)

## 📌 Database Overview
The **BellyBand** database is pre-configured with UTF-8 (`utf8mb4`) multi-language support (English, Hindi, Bengali, Telugu, Tamil, Kannada) and handles complete user onboarding, authentication, and pregnancy/family tracking.

### 📋 Database Tables:
1. **`users`** — User registration, hashed passwords, roles (`wife_mother`, `husband_father`), life stages (`pregnant`, `mother`, `already_parent`), delivery dates, and current pregnancy week.
2. **`user_sessions`** — Session authentication tokens and remember-me persistence.
3. **`password_resets`** — Secure password recovery tokens with expiration timestamps.
4. **`kick_logs`** — Daily fetal movement and kick counting entries.
5. **`water_logs`** — Daily hydration tracking (glasses logged vs. target).
6. **`symptom_logs`** — Mood and physical pregnancy/postpartum symptoms journal.
7. **`appointments`** — Doctor visits, anomaly scans, and vaccination reminders.

---

## 🚀 Quick Import Instructions

### Option 1: Using phpMyAdmin (XAMPP / WAMP / cPanel)
1. Open your browser and navigate to `http://localhost/phpmyadmin`.
2. Click on the **Import** tab in the top navigation bar.
3. Click **Choose File** and select `database.sql` from your project folder:
   ```
   c:\Users\prash\OneDrive\Desktop\BELLYBAND\database.sql
   ```
4. Click **Go / Import** at the bottom of the page.
5. The `bellyband_db` database and all 7 tables with seed data will be created automatically!

---

### Option 2: Using MySQL Command Line (CLI)
Open your terminal / PowerShell and run:
```bash
mysql -u root -p < database.sql
```
*(Press Enter if you have no root password by default on XAMPP).*

---

## ⚙️ Connecting PHP to MySQL
The database connection configuration is located in:
[`config/db.php`](file:///c:/Users/prash/OneDrive/Desktop/BELLYBAND/config/db.php)

```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'bellyband_db');
define('DB_USER', 'root');      // Your MySQL username
define('DB_PASS', '');          // Your MySQL password
```

---

## 🔑 Pre-Seeded Test Accounts

| Full Name | Email | Default Password | Role | Life Stage | Week |
|---|---|---|---|---|---|
| **Sarah Jenkins** | `sarah@example.com` | `password` | Wife \| Mother | Pregnant | Week 24 |
| **David Jenkins** | `david@example.com` | `password` | Husband \| Father | Partner Sync | Week 24 |

*(Passwords are encrypted using secure PHP `PASSWORD_BCRYPT` hashing).*
