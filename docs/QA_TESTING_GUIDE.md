# Agri Platform — Definitive QA Testing Guide

## Project Goal

Agri is an **Agriculture Intelligence of Things (AIoT)** platform connecting **three user groups**:

- **Farmers** (mobile app) — Monitor IoT sensor data, diagnose plant diseases via AI, grade crop quality, list products for sale
- **B2B Buyers** (web app) — Browse crops, place orders, track purchases
- **Admins** (web app) — Oversee all users, transactions, and system health

The platform integrates **ESP32 IoT sensors** (temperature, humidity, soil moisture, pH) with **AI/ML models** (EfficientNet-B0 for grading, MobileNetV2 for disease detection, Gemini LLM for farming insights) and a **marketplace** for B2B transactions.

---

## How to Use This Guide

| Icon | Meaning |
|------|---------|
| ✅ **AUTO** | Test is automated in `scripts/run_tests.py`. Run with: `cd backend && source .venv/Scripts/activate && python ../scripts/run_tests.py` |
| 📝 **MANUAL** | Test must be done by hand. Follow the instructions. |
| ⚠️ **PARTIAL** | Partially automated, needs manual verification |

---

# 1. PROJECT GOAL & FEATURE INVENTORY

## 1.1 Complete Component Map

```
┌──────────────────────────────────────────────────────────────────────┐
│                         AGRI PLATFORM                                │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────┐     ┌──────────────────────────┐          │
│  │  MOBILE APP (Expo)   │     │  WEB DASHBOARD (Next.js) │          │
│  │  Port 8081           │     │  Port 3000               │          │
│  │                      │     │                          │          │
│  │  Auth:               │     │  Auth:                   │          │
│  │   • Login/Register   │     │   • Login/Register       │          │
│  │   • JWT + SecureStore│     │   • JWT + localStorage   │          │
│  │   • Logout button    │     │                          │          │
│  │                      │     │  Features (mock data):   │          │
│  │  Features:           │     │   • Landing page         │          │
│  │   • Take photo       │     │   • Dashboard            │          │
│  │   • AI diagnosis     │     │   • Marketplace catalog  │          │
│  │   • AI grading       │     │   • Product detail       │          │
│  │   • LLM insights     │     │   • Shopping cart        │          │
│  │   • Live sensor data │     │   • Order status         │          │
│  │   • Price charts     │     │   • Financial reports    │          │
│  │   • Diagnosis history│     │   • Manage products      │          │
│  │   • Push notifs      │     │                          │          │
│  └──────────┬───────────┘     └──────────┬───────────────┘          │
│             │ HTTP                          │ HTTP                    │
│             ▼                               ▼                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              BACKEND API (FastAPI)                           │   │
│  │              Port 8000                                       │   │
│  │                                                              │   │
│  │  Endpoints:                                                  │   │
│  │  Auth: /auth/register, /auth/login, /auth/me, /auth/me(PATCH)│   │
│  │  Sensors: /sensors/nodes, /sensors/nodes/{id}/readings,      │   │
│  │           /sensors/ingest                                    │   │
│  │  AI: /ai/diagnose, /ai/grade/{crop_id}, /ai/insight/{disease│   │
│  │      /grading/sensor}                                        │   │
│  │  Marketplace: /marketplace/crops, /marketplace/prices        │   │
│  │  Transactions: /transactions/orders, /transactions/orders/   │   │
│  │               {id}/status                                    │   │
│  │  Health: /health                                             │   │
│  └──────────┬───────────────────────────────────────────────────┘   │
│             │ HTTP (httpx)           │ MQTT                        │
│             ▼                        ▼                             │
│  ┌──────────────────────┐  ┌────────────────────┐                 │
│  │  AI SERVICE (PyTorch)│  │  MQTT BROKER       │                 │
│  │  Port 8001           │  │  Port 1883         │                 │
│  │                      │  │                    │                 │
│  │  • Grading (Efficient │  │  ◄── ESP32 IoT    │                 │
│  │    Net-B0)           │  │      Node          │                 │
│  │  • Disease (MobileNet│  │      (DHT22, Soil, │                 │
│  │    V2, 38 classes)   │  │      pH)           │                 │
│  │  • LLM (Gemini)      │  │                    │                 │
│  └──────────────────────┘  └────────────────────┘                 │
│                                                                      │
│  DATABASE: SQLite (dev) / PostgreSQL 16 (Docker)                    │
│  Tables: users, sensor_nodes, sensor_readings, crops,               │
│          diagnosis_records, traceability_logs, transactions         │
└──────────────────────────────────────────────────────────────────────┘
```

---

# 2. AUTOMATED TESTS (61 tests, 100% pass rate)

All automated tests are in **`scripts/run_tests.py`**. They require:
- Backend running on `http://localhost:8000`
- AI service running on `http://localhost:8001`
- Test images in `ai/test_images/`

```bash
cd backend && source .venv/Scripts/activate
python ../scripts/run_tests.py
```

## 2.1 Health

| ID | Test | Automation | Command |
|----|------|-----------|---------|
| HEALTH-01 | Backend `/health` returns `{"status":"ok"}` | ✅ AUTO | `curl localhost:8000/health` |

## 2.2 Auth (10 tests)

| ID | Test | Expected | Automation |
|----|------|----------|-----------|
| AUTH-01 | Register farmer | 201 + JWT token | ✅ AUTO |
| AUTH-01 | Register buyer | 201 + JWT token | ✅ AUTO |
| AUTH-01 | Register admin | 201 + JWT token | ✅ AUTO |
| AUTH-04 | Register duplicate email | 409 Conflict | ✅ AUTO |
| AUTH-05 | Login valid credentials | 200 + JWT token | ✅ AUTO |
| AUTH-06 | Login wrong password | 401 Unauthorized | ✅ AUTO |
| AUTH-07 | Login non-existent user | 401 Unauthorized | ✅ AUTO |
| AUTH-08 | Login missing fields | 422 Validation error | ✅ AUTO |
| AUTH-09 | Get current user (valid token) | 200 + user email | ✅ AUTO |
| AUTH-10 | Get current user (no token) | 403 Not authenticated | ✅ AUTO |

**Manual supplement for AUTH:**

| ID | Test | Instructions |
|----|------|-------------|
| AUTH-11 | Register with invalid email | Send `{"email":"not-an-email","password":"123","full_name":"X","role":"farmer"}` → expect 422 |
| AUTH-12 | Update profile all fields | `PATCH /auth/me` with `full_name`, `phone`, `bank_account`, `bank_name`, `fcm_token` → verify all updated |

## 2.3 Sensors (13 tests)

| ID | Test | Expected | Automation |
|----|------|----------|-----------|
| SENSOR-01 | Register node (farmer) | 201 + node object | ✅ AUTO |
| SENSOR-02 | Register node (buyer — forbidden) | 403 | ✅ AUTO |
| SENSOR-04 | List nodes (farmer sees own) | 200 + non-empty list | ✅ AUTO |
| SENSOR-05 | List nodes (buyer — empty) | 200 + empty list `[]` | ✅ AUTO |
| SENSOR-06 | List nodes no auth | 403 | ✅ AUTO |
| SENSOR-07 | Ingest full reading | 204 | ✅ AUTO |
| SENSOR-08 | Ingest unknown device | 204 (silent drop) | ✅ AUTO |
| SENSOR-09 | Ingest partial (temp only) | 204 | ✅ AUTO |
| SENSOR-10 | Ingest anomaly (high temp) | 204 — `is_anomaly` set to true | ✅ AUTO |
| SENSOR-11 | Ingest invalid (temp="bad") | 422 | ✅ AUTO |
| SENSOR-12 | Get readings with limit | 200 + ordered list | ✅ AUTO |
| SENSOR-13 | Get readings default limit | 200 + ≤50 items | ✅ AUTO |
| SENSOR-14 | Get readings for other's node | 404 | ✅ AUTO |

**Manual supplement:**

| ID | Test | Instructions |
|----|------|-------------|
| SENSOR-15 | Register node with duplicate device_id | Register same `device_id` twice → expect 500/409 (unique constraint) |
| SENSOR-16 | Register node missing required fields | POST without `name` → expect 422 |
| SENSOR-17 | Get readings for non-existent node with valid UUID | `GET /sensors/nodes/{random-uuid}/readings` with valid auth → expect 404 |

## 2.4 AI — Diagnosis (7 tests)

| ID | Test | Expected | Automation |
|----|------|----------|-----------|
| AI-01 | Diagnose healthy tomato leaf | 200, `is_healthy: true`, `disease_name: "Healthy"` | ✅ AUTO |
| AI-02 | Diagnose late blight | 200, `is_healthy: false`, `disease_name` contains "Late Blight" | ✅ AUTO |
| AI-03 | Diagnose early blight | 200, `is_healthy: false`, `disease_name` contains "Early Blight" | ✅ AUTO |
| AI-04 | Diagnose pepper bacterial spot | 200, `disease_name` contains "Bacterial Spot" | ✅ AUTO |
| AI-05 | Diagnose as buyer (should work) | 200 (any auth user) | ✅ AUTO |
| AI-06 | Diagnose no auth | 403 | ✅ AUTO |
| AI-07 | Diagnose no file | 422 | ✅ AUTO |

**Manual supplement:**

| ID | Test | Instructions |
|----|------|-------------|
| AI-08 | Diagnose leaf mold | Upload `Tomato___Leaf_Mold.jpg` → verify `disease_name` contains "Leaf Mold" |
| AI-09 | Diagnose healthy pepper | Upload `Pepper_bell___healthy.jpg` → verify `is_healthy: true` |
| AI-10 | Diagnose blank image | Upload a solid-white/black JPEG → verify backend returns 503 gracefully |

## 2.5 AI — Grading (not in automated suite)

| ID | Test | Instructions |
|----|------|-------------|
| GRADE-01 | Grade crop as farmer | POST `/ai/grade/{crop_id}` with image → expect 200 + `{grade, confidence, grade_a/b/c_prob}` |
| GRADE-02 | Grade crop not owned by user | POST `/ai/grade/{other_farmer_crop_id}` → expect 404 |
| GRADE-03 | Grade as buyer | POST `/ai/grade/{crop_id}` with buyer token → expect 403 |
| GRADE-04 | Grade non-existent crop | POST `/ai/grade/{random-uuid}` → expect 404 |

**How to test manually:**
```bash
# 1. Login as farmer → get TOKEN
# 2. Create a crop → get CROP_ID
curl -s -X POST http://localhost:8000/api/v1/marketplace/crops \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Tomat Test","quantity_kg":10,"price_per_kg":5000}'

# 3. Grade it
curl -s -X POST "http://localhost:8000/api/v1/ai/grade/$CROP_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@ai/test_images/Tomato___healthy.jpg"
```

## 2.6 Marketplace (8 tests)

| ID | Test | Expected | Automation |
|----|------|----------|-----------|
| MKT-01 | Create crop (farmer) | 201 + crop object | ✅ AUTO |
| MKT-02 | Create crop (buyer — forbidden) | 403 | ✅ AUTO |
| MKT-03 | Create crop missing required fields | 422 | ✅ AUTO |
| MKT-04 | List available crops | 200 + list (available only) | ✅ AUTO |
| MKT-06 | Get single crop | 200 + matching crop | ✅ AUTO |
| MKT-08 | Update crop (price, quantity) | 200 + updated values | ✅ AUTO |
| MKT-07 | Get non-existent crop | 404 | ✅ AUTO |
| MKT-10 | Get commodity prices | 200 + `{status, prices[]}` | ✅ AUTO |

**Manual supplement:**

| ID | Test | Instructions |
|----|------|-------------|
| MKT-09 | Update crop not owned by user | Get another farmer's crop_id → PATCH with your token → expect 404 |
| MKT-11 | List all crops (including unavailable) | `GET /marketplace/crops?available_only=false` → verify unavailable crops appear |

## 2.7 Transactions (9 tests)

| ID | Test | Expected | Automation |
|----|------|----------|-----------|
| TXN-01 | Create order (buyer) | 201 + `status: "pending"` | ✅ AUTO |
| TXN-02 | Create order (farmer — forbidden) | 403 | ✅ AUTO |
| TXN-03 | Idempotent order (same Idempotency-Key) | 200/201 + same order ID | ✅ AUTO |
| TXN-04 | Insufficient stock | 400 | ✅ AUTO |
| TXN-06 | List orders (buyer sees purchases) | 200 + list | ✅ AUTO |
| TXN-07 | List orders (farmer sees sales) | 200 + list | ✅ AUTO |
| TXN-09 | Update order status (farmer) | 200 + `status: "confirmed"` | ✅ AUTO |
| TXN-11 | Update status (buyer — forbidden) | 403 | ✅ AUTO |
| TXN-13 | Missing Idempotency-Key header | 422 | ✅ AUTO |

**Manual supplement:**

| ID | Test | Instructions |
|----|------|-------------|
| TXN-10 | Full order lifecycle | Create order → confirmed → processing → completed. Verify each transition: `PATCH /transactions/orders/{id}/status?new_status={status}` |
| TXN-12 | Cancel order | Create order → PATCH with `?new_status=cancelled` → verify `status: "cancelled"` |
| TXN-14 | Create order for unavailable crop | First PATCH crop to `is_available: false`, then create order → expect 404 |

## 2.8 AI Service Direct (6 tests)

| ID | Test | Expected | Automation |
|----|------|----------|-----------|
| AIHEALTH-01 | AI service health | 200 + `{status:"ok", grading_model:"loaded", disease_model:"loaded"}` | ✅ AUTO |
| AIDIAG-01 | Direct diagnose (healthy) | 200 + `disease_name: "Healthy"` | ✅ AUTO |
| AIGRADE-01 | Direct grade | 200 + `{grade, confidence}` | ✅ AUTO |
| AILLM-01 | Disease LLM insight | 200 + non-empty `insight` | ✅ AUTO |
| AILLM-03 | Grading LLM insight | 200 + non-empty `insight` | ✅ AUTO |
| AILLM-05 | Sensor LLM insight | 200 + non-empty `insight` | ✅ AUTO |

**Manual supplement:**

| ID | Test | Instructions |
|----|------|-------------|
| AILLM-02 | Disease insight with sensor data | Include `sensor_data: {temperature:35, humidity:90}` — verify insight warns about conditions |
| AILLM-04 | Grade C insight | POST `{"grade":"C","confidence":0.6,...}` — verify insight mentions improvement |
| AILLM-06 | Extreme sensor insight | POST `{temperature:40, humidity:10, soil_moisture:5, ph:4.0}` — verify all warnings |

## 2.9 Security (4 tests)

| ID | Test | Expected | Automation |
|----|------|----------|-----------|
| SEC-07 | CORS preflight headers | 200 + `Access-Control-Allow-Origin: *` + `Access-Control-Allow-Methods: *` | ✅ AUTO |
| SEC-09 | SQL injection in device_id | 204 (safe, not 500) + DB still functional | ✅ AUTO |
| SEC-03a | `/sensors/nodes` requires auth | 403 | ✅ AUTO |
| SEC-03b | `/marketplace/crops` requires auth | 403 | ✅ AUTO |

**Manual supplement:**

| ID | Test | Instructions |
|----|------|-------------|
| SEC-01 | Hardcoded secrets scan | Run: `git diff main..HEAD \| grep "^+" \| grep -iE "(api_key|secret|password|token)\s*=\s*['\"][^'\"]{6,}['\"]"` — should find nothing |
| SEC-02 | SQL injection in crop name | Create crop with name `'; DELETE FROM crops; --` → verify no data loss |
| SEC-05 | Token expiry | Set `ACCESS_TOKEN_EXPIRE_MINUTES=1`, wait 70s, use token → expect 401 |
| SEC-06 | JWT tampering | Base64 decode JWT payload, modify `sub` to another user's ID, re-encode → expect 401 |
| SEC-08 | XSS in name | Register with `full_name: "<script>alert(1)</script>"` → verify stored safely (no script execution) |

---

# 3. MANUAL TESTS — Detailed Instructions

## 3.1 Mobile App — Auth Flow

### MOB-AUTH-01: First launch shows login
**Prerequisites:** App installed via Expo Go, no existing token
**Steps:**
1. Clear app data: Android Settings → Apps → Agri → Storage → Clear data
2. Launch app from Expo Go
3. ✅ **Verify:** Login screen displays with "Masuk ke Akun" title, email field, password field, "Masuk" button
4. ✅ **Verify:** "Daftar Sekarang" link visible below form

### MOB-AUTH-02: Register as farmer (happy path)
**Steps:**
1. On login screen, tap "Daftar Sekarang"
2. ✅ **Verify:** Register screen shows: role selector (Petani / Pembeli B2B), Nama Lengkap, Email, Nomor Telepon (opsional), Password, Konfirmasi Password fields
3. Select "Petani" role (should be default)
4. Fill all fields:
   - Nama: `Test Farmer`
   - Email: `test.farmer@example.com`
   - Password: `password123`
   - Confirm: `password123`
5. Tap "Daftar Sekarang"
6. ✅ **Verify:** Navigates to main dashboard. No error alerts.

### MOB-AUTH-03: Register form validation
**Steps:**
1. Tap "Daftar Sekarang" with all fields empty
2. ✅ **Verify:** Error shown: "Nama lengkap wajib diisi."
3. Fill name only, tap again → ✅ Verify: "Email wajib diisi."
4. Fill email, tap again → ✅ Verify: "Password wajib diisi."
5. Enter password of 3 chars → ✅ Verify: "Password minimal 8 karakter."
6. Enter mismatching confirm password → ✅ Verify: "Konfirmasi password tidak cocok."

### MOB-AUTH-04: Login valid
**Steps:**
1. Navigate to Login
2. Enter email + password of registered account
3. Tap "Masuk"
4. ✅ **Verify:** Navigates to main dashboard
5. ✅ **Verify (console):** `🔧 [LoginScreen] Login successful — calling onLogin`

### MOB-AUTH-05: Login invalid
**Steps:**
1. Enter wrong email or password
2. Tap "Masuk"
3. ✅ **Verify:** Error "Email atau password salah. Silakan coba lagi."

### MOB-AUTH-06: Empty login
**Steps:**
1. Tap "Masuk" with empty fields
2. ✅ **Verify:** "Email dan password wajib diisi."

### MOB-AUTH-07: Logout
**Steps:**
1. While logged in, find the logout icon in the bottom navbar (right side, small rotated icon)
2. Tap it
3. ✅ **Verify:** Confirmation dialog: "Apakah Anda yakin ingin keluar?" with "Batal" and "Keluar"
4. Tap "Keluar"
5. ✅ **Verify:** Returns to login screen
6. ✅ **Verify (console):** `🔧 [AuthContext] logout() called`

### MOB-AUTH-08: Auto-login with stored token
**Steps:**
1. Login successfully
2. Close the app (swipe away or press home)
3. Reopen the Expo QR and scan
4. ✅ **Verify:** App shows main screen (not login) — token persisted
5. ✅ **Verify (console):** `🔧 [AuthContext] Checking auth — token found: true`

### MOB-AUTH-09: No token → login screen
**Steps:**
1. Logout (clears token)
2. Reload app
3. ✅ **Verify:** Login screen shown
4. ✅ **Verify (console):** `🔧 [AuthContext] Checking auth — token found: false`

## 3.2 Mobile App — Navigation

### MOB-NAV-01: Bottom tab bar
**Prerequisites:** Logged in
**Steps:**
1. The bottom tab bar shows 5 elements: Dashboard, Notifications, [Camera button], Diagnosis, Monitor
2. ✅ **Verify:** Current tab is highlighted (Dashboard by default)
3. Tap each tab
4. ✅ **Verify:** Each screen renders without error

### MOB-NAV-02: Camera button
**Steps:**
1. Tap the center camera button
2. ✅ **Verify:** Camera viewfinder opens with transparent guide overlay
3. ✅ **Verify (console):** `🔧 [CameraScreen] Mounted`

### MOB-NAV-03: Back navigation
**Steps:**
1. From any non-home screen, tap the back arrow (top-left)
2. ✅ **Verify:** Returns to the screen you came from

## 3.3 Mobile App — Camera & Diagnosis

### MOB-CAM-01: Camera permissions
**Steps:**
1. Tap camera button
2. If prompted for camera permission, grant it
3. ✅ **Verify:** Camera view appears with green guide frame
4. ✅ **Verify (console):** `🔧 [CameraScreen] Permission status: {"granted":true}`

### MOB-CAM-02: Take photo
**Steps:**
1. Point camera at a plant leaf
2. Tap the large shutter button (center-bottom)
3. ✅ **Verify:** Brief capture, navigates to preview screen
4. ✅ **Verify:** Photo fills the preview area
5. ✅ **Verify (console):** `🔧 [CameraScreen] ✅ Photo captured. Full photo object: {uri, width, height}`

### MOB-CAM-03: Photo preview actions
**Steps:**
1. On preview screen, verify three action buttons at bottom:
   - **Trash** (left) — delete photo, return to camera
   - **Camera** (center) — retake photo, return to camera
   - **Checkmark** (right) — analyze photo
2. ✅ **Verify:** Tap trash → returns to camera
3. ✅ **Verify:** Take another photo → tap camera icon → returns to camera

### MOB-CAM-04: Analyze — Healthy plant
**Steps:**
1. Take photo of a healthy green leaf
2. Tap checkmark button
3. ✅ **Verify:** Loading indicator appears (spinner on button)
4. ✅ **Verify:** Navigates to DiagnosisDetail screen after ~2-5 seconds
5. ✅ **Verify:** Shows:
   - Disease name: "Healthy"
   - Confidence: ~99.98%
   - Recommendation in Indonesian
   - Sensor data cards (temperature, pH, humidity)
6. ✅ **Verify (console):**
   ```
   🔧 [aiApi.diagnose] Success — status: 200
   🔧 [aiApi.diagnose] Result: {disease_name:"Healthy", confidence:0.9998, ...}
   ```

### MOB-CAM-05: Analyze — Diseased plant
**Steps:**
1. Take photo showing leaf spots/discoloration (or use printed image of diseased leaf)
2. Tap checkmark
3. ✅ **Verify:** Returns diagnosis result with disease name, confidence, treatment recommendation in Indonesian

### MOB-CAM-06: Analyze failure (no token)
**Steps:**
1. Logout first
2. Take a photo
3. Tap checkmark
4. ✅ **Verify:** Alert: "Analisis tidak dapat dilakukan. Periksa koneksi dan coba lagi."
5. ✅ **Verify (console):** `🔧 [api.ts]   Has token in SecureStore: false`

### MOB-CAM-07: Analysis with AI service down
**Steps:**
1. Stop the AI service (`tskill <PID>` or Ctrl+C)
2. Take photo and analyze
3. ✅ **Verify:** Alert: "Analisis tidak dapat dilakukan. Periksa koneksi dan coba lagi."
4. ✅ **Verify (console):** Error response from backend (503)
5. Restart AI service after test

## 3.4 Mobile App — Diagnosis History

### MOB-DIAG-01: History screen loads
**Steps:**
1. Tap "Diagnosis" tab
2. ✅ **Verify:** Screen shows "Riwayat" title with filter button
3. ✅ **Verify:** Mock diagnosis cards displayed (Kangkung, Bayam, Tomat) with status badges

### MOB-DIAG-02: View completed diagnosis detail
**Steps:**
1. Tap a card with "Selesai" status badge
2. ✅ **Verify:** Navigates to DiagnosisDetail screen with full result

### MOB-DIAG-03: Treatment screen
**Steps:**
1. From DiagnosisDetail, navigate to Treatment (if available)
2. ✅ **Verify:** Treatment instructions screen renders

## 3.5 Mobile App — Dashboard

### MOB-DASH-01: Dashboard loads
**Steps:**
1. Tap "Dashboard" tab
2. ✅ **Verify:** Greeting text "Siang! Sobat Petani"
3. ✅ **Verify:** Balance card with "Rp20.140.340"
4. ✅ **Verify:** Sensor cards (Suhu, pH, Humidity)
5. ✅ **Verify:** Commodity price dropdown
6. ✅ **Verify:** Price chart area

### MOB-DASH-02: Commodity price chart
**Steps:**
1. Tap the commodity dropdown
2. ✅ **Verify:** Modal shows list of commodities
3. Select a commodity
4. ✅ **Verify:** Price chart updates with line graph

### MOB-DASH-03: Refresh on pull-down
**Steps:**
1. Pull down on dashboard (if implemented)
2. ✅ **Verify:** Refresh indicator appears

## 3.6 Mobile App — Sensor Monitoring

### MOB-MON-01: Monitor screen
**Steps:**
1. Tap "Monitor" tab
2. ✅ **Verify:** Screen renders without error
3. ✅ **Verify:** Shows sensor data interface

## 3.7 Mobile App — Notifications

### MOB-NOTIF-01: Notification screen
**Steps:**
1. Tap "Notifications" tab (locate — might be labeled "Notifikasi")
2. ✅ **Verify:** Screen renders without error

## 3.8 Mobile App — Treatment Screen

### MOB-TREAT-01: Treatment screen from diagnosis
**Steps:**
1. Complete a diagnosis
2. Navigate to Treatment screen
3. ✅ **Verify:** Shows:
   - Disease name
   - Temperature and pH sensor values
   - Treatment section with expandable items
   - Temperature, humidity, and pest action categories

## 3.9 Mobile App — Navigation Types

### MOB-NAV-04: Navigation parameter types
**Steps:**
1. Launch camera in "diagnosis" mode (from Diagnosis tab)
2. ✅ **Verify:** Route params contain `mode: "diagnosis"`
3. Launch camera in "grading" mode (from Dashboard → Grading Panen)
4. ✅ **Verify:** Route params contain `mode: "grading"`
5. Navigate to DiagnosisDetail with a result
6. ✅ **Verify:** All params (result, mode, imageUri, insight, sensorData) properly received

---

## 3.10 Frontend Web

### WEB-01: Landing page
**Steps:**
1. Open `http://localhost:3000`
2. ✅ **Verify:** "Agri" heading with green styling
3. ✅ **Verify:** Description: "Platform Agriculture Intelligence of Things — menghubungkan petani hortikultura dengan pembeli B2B"
4. ✅ **Verify:** "Masuk" button links to `/login`
5. ✅ **Verify:** "Lihat Marketplace" button links to `/marketplace`

### WEB-02: Navigation bar
**Steps:**
1. ✅ **Verify:** Top navbar with Agri logo, Beranda, Masuk/Daftar links
2. ✅ **Verify:** Navbar is sticky at top
3. ✅ **Verify:** Mobile hamburger menu works (resize browser < 768px)

### WEB-03: Auth pages
**Steps:**
1. Navigate to `/login`
2. ✅ **Verify:** Login form with email + password fields
3. Navigate to `/register`
4. ✅ **Verify:** Register form with name, email, password, role fields

### WEB-04: Dashboard (mock data)
**Steps:**
1. Navigate to `/dashboard`
2. ✅ **Verify:** Stat cards: Terjual (39), Pesanan Masuk (240), Barang Dikirim (225)
3. ✅ **Verify:** Money cards: Pemasukan (Rp20.000.000), Pengeluaran (Rp5.000.000)
4. ✅ **Verify:** Product cards with images, prices, grades

### WEB-05: Marketplace pages
**Steps:**
1. Navigate to `/marketplace`
2. ✅ **Verify:** Product grid layout with search and filter
3. Navigate to `/katalog-dagangan`
4. ✅ **Verify:** Product catalog grid
5. Navigate to `/katalog-detail`
6. ✅ **Verify:** Single product detail with quantity selector (±) and "Tambah ke Keranjang" button

### WEB-06: Cart and checkout
**Steps:**
1. Navigate to `/keranjang`
2. ✅ **Verify:** Cart items with remove (trash) button
3. ✅ **Verify:** Total amount summary

### WEB-07: Product management
**Steps:**
1. Navigate to `/kelola-produk`
2. ✅ **Verify:** Product edit form with fields: Nama Produk, Deskripsi, Harga, etc.

### WEB-08: Order status
**Steps:**
1. Navigate to `/status-pesanan`
2. ✅ **Verify:** Order timeline with status icons (Clock, Package, Truck, CheckCircle)

### WEB-09: Finance
**Steps:**
1. Navigate to `/keuangan`
2. ✅ **Verify:** Income/expense cards and transaction list

### WEB-10: 404 handling
**Steps:**
1. Navigate to `/nonexistent-page`
2. ✅ **Verify:** Next.js 404 page or falls through gracefully

---

# 4. IOT (ESP32) — Manual Tests

Requires physical ESP32 hardware, PlatformIO, and running Mosquitto broker + backend.

## 4.1 Hardware Setup

**Prerequisites:**
- ESP32 dev board
- DHT22 sensor (GPIO 4)
- Capacitive soil moisture sensor (GPIO 34)
- Analog pH sensor (GPIO 35)
- PlatformIO installed
- MQTT broker accessible from ESP32's network

### IOT-01: Flash firmware
**Steps:**
1. Edit `iot/src/config.h`:
   - Set `WIFI_SSID` and `WIFI_PASSWORD`
   - Set `MQTT_BROKER` to your broker's IP/hostname
   - Set `DEVICE_ID` to unique ID per ESP32
2. Run: `cd iot && pio run --target upload`
3. Open serial monitor: `pio device monitor`
4. ✅ **Verify:** ESP32 connects to WiFi (serial shows IP address)
5. ✅ **Verify:** ESP32 connects to MQTT broker
6. ✅ **Verify:** Sensor readings printed to serial every 10 seconds

### IOT-02: MQTT data flow
**Steps:**
1. Register a sensor node via backend API:
   ```bash
   curl -X POST http://localhost:8000/api/v1/sensors/nodes \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"device_id":"ESP32_NODE_001","name":"Test Node","location":"Lab"}'
   ```
2. Wait for ESP32 to publish data
3. ✅ **Verify:** Backend logs: `MQTT subscribed to agri/sensor/#`
4. ✅ **Verify:** Data appears in backend API:
   ```bash
   curl http://localhost:8000/api/v1/sensors/nodes/{node_id}/readings
   ```
5. ✅ **Verify:** Readings show temperature, humidity, soil_moisture, pH values

### IOT-03: Offline storage
**Steps:**
1. Disconnect WiFi (unplug router or move ESP32 out of range)
2. ✅ **Verify:** ESP32 continues reading sensors, stores in LittleFS
3. ✅ **Verify:** Serial shows: "WiFi disconnected. Storing offline..."
4. Reconnect WiFi
5. ✅ **Verify:** ESP32 publishes stored readings in sequence
6. ✅ **Verify:** Serial shows: "Publishing stored readings..."

### IOT-04: Anomaly detection
**Steps:**
1. Trigger an anomaly (e.g., heat the DHT22 or wet the soil sensor)
2. ✅ **Verify:** Backend detects anomaly based on thresholds
3. ✅ **Verify:** Reading stored with `is_anomaly: true`
4. ✅ **Verify:** `anomaly_description` contains human-readable warning in Indonesian

### IOT-05: Sensor failure handling
**Steps:**
1. Disconnect DHT22 sensor
2. ✅ **Verify:** ESP32 handles failed read gracefully (no crash)
3. ✅ **Verify:** Serial shows: "Failed to read DHT22 sensor"
4. Reconnect sensor

---

# 5. REGRESSION TEST MATRIX

Run these after ANY code change to verify core flows still work.

| Flow ID | Description | Automated | Manual Steps |
|---------|-------------|-----------|-------------|
| **R01** | Auth cycle: Register → Login → Get Me | ✅ AUTO | — |
| **R02** | Sensor pipeline: Register node → Ingest → Get readings | ✅ AUTO | — |
| **R03** | AI diagnosis: Upload image → Get result → Verify disease | ⚠️ PARTIAL | Test with all 6 test images |
| **R04** | Marketplace: Create crop → List → Verify visible | ✅ AUTO | — |
| **R05** | Full buy cycle: Create crop → Create order → Update status | ✅ AUTO | — |
| **R06** | AI + LLM: Diagnose → Get LLM insight | ⚠️ PARTIAL | Verify insight is coherent Indonesian |
| **R07** | Mobile: Camera → Preview → Analyze → Result | 📝 MANUAL | See MOB-CAM-04/05 |
| **R08** | IoT: ESP32 reads → MQTT publish → Backend stores | 📝 MANUAL | See IOT-01/02 |
| **R09** | Auth enforcement: All protected endpoints reject no-auth | ✅ AUTO | — |
| **R10** | CORS: Web app can access backend from different origin | ✅ AUTO | — |

---

# 6. RUN COMMANDS CHEAT SHEET

## Run automated tests
```bash
cd backend && source .venv/Scripts/activate
python ../scripts/run_tests.py          # Full suite (61 tests)
python ../scripts/run_tests.py --smoke-only  # Quick check (1 test)
```

## Start all services from scratch
```bash
# Terminal 1: Backend
cd backend && source .venv/Scripts/activate && rm -f agri_dev.db && uvicorn app.main:app --reload

# Terminal 2: AI Service (from repo root)
source ai/.venv/Scripts/activate && uvicorn ai.api.inference_server:app --port 8001 --reload

# Terminal 3: Frontend Web
cd frontend-web && npm run dev

# Terminal 4: Mobile (optional)
cd mobile && npx expo start -c
```

## Quick smoke test (any shell)
```bash
curl -s http://localhost:8000/health                    # Backend
curl -s http://localhost:8001/health                    # AI Service
curl -s http://localhost:3000 | head -c 100             # Frontend Web
```

## Clean up test data
```bash
rm -f backend/agri_dev.db    # Delete SQLite DB (auto-recreated on restart)
```

---

# 7. TEST ENVIRONMENT REFERENCE

| Resource | Default Value |
|----------|--------------|
| Backend URL | `http://localhost:8000` |
| API Base | `http://localhost:8000/api/v1` |
| AI Service | `http://localhost:8001` |
| Frontend Web | `http://localhost:3000` |
| Mobile Expo | `http://<PC_LAN_IP>:8081` |
| MQTT Broker | `localhost:1883` |
| PostgreSQL | `localhost:5432` (Docker only) |
| Test Images | `ai/test_images/` |
| Test DB | `backend/agri_dev.db` |
| Test User PW | `test123` (auto-generated emails) |
