# Agri Platform — QA Testing Guide

Fully enumerated test plan for all components: backend API, AI service, mobile app, frontend web, and IoT.

---

# Table of Contents

1. [Prerequisites & Environment](#1-prerequisites--environment)
2. [Backend API Tests](#2-backend-api-tests)
   - 2.1 Health
   - 2.2 Auth
   - 2.3 Sensors
   - 2.4 AI
   - 2.5 Marketplace
   - 2.6 Transactions
3. [AI Service Tests](#3-ai-service-tests)
   - 3.1 Health
   - 3.2 Grading
   - 3.3 Diagnosis
   - 3.4 LLM Insight
4. [Mobile App Tests](#4-mobile-app-tests)
   - 4.1 Auth Flow
   - 4.2 Navigation
   - 4.3 Camera & Diagnosis
   - 4.4 Dashboard
   - 4.5 Sensor Monitoring
5. [Frontend Web Tests](#5-frontend-web-tests)
   - 5.1 Auth Flow
   - 5.2 Dashboard
   - 5.3 Marketplace
   - 5.4 Transactions
6. [IoT Integration Tests](#6-iot-integration-tests)
7. [Security Tests](#7-security-tests)
8. [Regression Test Matrix](#8-regression-test-matrix)

---

# 1. Prerequisites & Environment

## 1.1 Required Services Running

| Service | Port | How to Start |
|---------|------|-------------|
| Backend API | 8000 | `uvicorn app.main:app --reload` (from `backend/`) |
| AI Service | 8001 | `uvicorn ai.api.inference_server:app --port 8001 --reload` (from repo root) |
| Frontend Web | 3000 | `npm run dev` (from `frontend-web/`) |
| Mobile Expo | 8081 | `npx expo start -c` (from `mobile/`) |

Backend and AI service must be running for all API tests and mobile/web integration tests.

## 1.2 Test Accounts

| Role | Email | Password | Created By |
|------|-------|----------|------------|
| Farmer | `farmer@test.com` | `test123` | TC-AUTH-01 |
| Buyer | `buyer@test.com` | `test123` | TC-AUTH-01 |
| Admin | `admin@test.com` | `test123` | TC-AUTH-01 |

## 1.3 Test Data Files

- Healthy leaf: `ai/test_images/Tomato___healthy.jpg`
- Diseased leaf: `ai/test_images/Tomato___Late_blight.jpg`
- Grading test: `ai/test_images/Tomato___Early_blight.jpg`

## 1.4 Test Tools

- Backend: curl, httpie, or Python requests
- Mobile: Expo Go on physical device or emulator
- Frontend: any modern browser
- IoT: serial monitor or MQTT client (mosquitto_pub)

---

# 2. Backend API Tests

All endpoints are prefixed with `/api/v1`. Base URL: `http://localhost:8000`

## 2.1 Health

### TC-HEALTH-01: Basic health check
```
GET /health
→ 200 {"status":"ok"}
```

### TC-HEALTH-02: Health with services down
Stop the AI service, then:
```
GET /health
→ 200 {"status":"ok"}    (backend health is independent of AI)
```

---

## 2.2 Auth

### TC-AUTH-01: Register as farmer
```
POST /api/v1/auth/register
{
  "email": "farmer@test.com",
  "password": "test123",
  "full_name": "Petani Surya",
  "role": "farmer"
}
→ 201 TokenResponse {access_token, refresh_token, user{role:"farmer"}}
```
Verify: access_token is a valid JWT (3 base64 segments)

### TC-AUTH-02: Register as buyer
```
POST /api/v1/auth/register
{
  "email": "buyer@test.com",
  "password": "test123",
  "full_name": "Pembeli Dewi",
  "role": "buyer"
}
→ 201 TokenResponse {user{role:"buyer"}}
```

### TC-AUTH-03: Register as admin
```
POST /api/v1/auth/register
{
  "email": "admin@test.com",
  "password": "test123",
  "full_name": "Admin Satu",
  "role": "admin"
}
→ 201 TokenResponse {user{role:"admin"}}
```

### TC-AUTH-04: Register duplicate email
```
POST /api/v1/auth/register
{
  "email": "farmer@test.com",
  "password": "test123",
  "full_name": "Petani Dua",
  "role": "farmer"
}
→ 409 {"detail":"Email already registered"}
```

### TC-AUTH-05: Login valid credentials
```
POST /api/v1/auth/login
{
  "email": "farmer@test.com",
  "password": "test123"
}
→ 200 TokenResponse {access_token, refresh_token, user{email:"farmer@test.com"}}
```

### TC-AUTH-06: Login wrong password
```
POST /api/v1/auth/login
{
  "email": "farmer@test.com",
  "password": "wrongpass"
}
→ 401 {"detail":"Invalid credentials"}
```

### TC-AUTH-07: Login non-existent user
```
POST /api/v1/auth/login
{
  "email": "nobody@test.com",
  "password": "test123"
}
→ 401 {"detail":"Invalid credentials"}
```

### TC-AUTH-08: Login missing fields
```
POST /api/v1/auth/login
{}
→ 422 Validation error (FastAPI auto-validation)
```

### TC-AUTH-09: Get current user (valid token)
```
GET /api/v1/auth/me
Authorization: Bearer <farmer_token>
→ 200 UserResponse {email:"farmer@test.com", role:"farmer"}
```

### TC-AUTH-10: Get current user (no token)
```
GET /api/v1/auth/me
→ 403 {"detail":"Not authenticated"}
```

### TC-AUTH-11: Get current user (expired token)
```
GET /api/v1/auth/me
Authorization: Bearer <jwt_with_past_exp>
→ 401 {"detail":"Invalid token"}
```

### TC-AUTH-12: Update profile
```
PATCH /api/v1/auth/me
Authorization: Bearer <farmer_token>
{
  "full_name": "Petani Surya Updated",
  "phone": "08123456789"
}
→ 200 UserResponse {full_name:"Petani Surya Updated", phone:"08123456789"}
```

### TC-AUTH-13: Update profile partial
```
PATCH /api/v1/auth/me
Authorization: Bearer <farmer_token>
{
  "bank_account": "1234567890",
  "bank_name": "Bank BRI"
}
→ 200 UserResponse {bank_account:"1234567890", bank_name:"Bank BRI"}
```
Verify: other fields (full_name, phone) unchanged from previous value.

---

## 2.3 Sensors

### TC-SENSOR-01: Register sensor node (farmer)
```
POST /api/v1/sensors/nodes
Authorization: Bearer <farmer_token>
{
  "device_id": "esp32-lab-a",
  "name": "Lahan Cabai A",
  "location": "Bandung"
}
→ 201 SensorNodeResponse {device_id:"esp32-lab-a", name:"Lahan Cabai A", is_active:true}
```
Save the returned `id` for subsequent tests.

### TC-SENSOR-02: Register sensor node (buyer — forbidden)
```
POST /api/v1/sensors/nodes
Authorization: Bearer <buyer_token>
{
  "device_id": "esp32-lab-b",
  "name": "Lahan B",
  "location": "Jakarta"
}
→ 403 {"detail":"Insufficient permissions"}
```

### TC-SENSOR-03: Register sensor node (admin)
```
POST /api/v1/sensors/nodes
Authorization: Bearer <admin_token>
{
  "device_id": "esp32-lab-c",
  "name": "Lahan Admin",
  "location": "Bogor"
}
→ 201 SensorNodeResponse
```

### TC-SENSOR-04: List sensor nodes (farmer sees own)
```
GET /api/v1/sensors/nodes
Authorization: Bearer <farmer_token>
→ 200 [SensorNodeResponse]
```
Verify: only returns nodes owned by farmer (device_id: "esp32-lab-a").
Does NOT return admin's node (device_id: "esp32-lab-c").

### TC-SENSOR-05: List sensor nodes (buyer — empty)
```
GET /api/v1/sensors/nodes
Authorization: Bearer <buyer_token>
→ 200 []
```
Buyer has no sensor nodes, returns empty list.

### TC-SENSOR-06: List sensor nodes (no auth)
```
GET /api/v1/sensors/nodes
→ 403 {"detail":"Not authenticated"}
```

### TC-SENSOR-07: Ingest sensor reading (no auth required — IoT endpoint)
```
POST /api/v1/sensors/ingest
{
  "device_id": "esp32-lab-a",
  "temperature": 28.5,
  "humidity": 65.0,
  "soil_moisture": 45.0,
  "ph": 6.2
}
→ 204 (No Content)
```

### TC-SENSOR-08: Ingest reading for unknown device
```
POST /api/v1/sensors/ingest
{
  "device_id": "nonexistent-device",
  "temperature": 30.0
}
→ 204 (No Content)
```
Logs warning but returns 204 (silently dropped).

### TC-SENSOR-09: Ingest reading partial data
```
POST /api/v1/sensors/ingest
{
  "device_id": "esp32-lab-a",
  "temperature": 35.5
}
→ 204
```
Verify: reading stored with temperature=35.5, other fields null.

### TC-SENSOR-10: Ingest anomaly detection
```
POST /api/v1/sensors/ingest
{
  "device_id": "esp32-lab-a",
  "temperature": 42.0,
  "humidity": 95.0
}
→ 204
```
Verify: reading stored with is_anomaly=true, anomaly_description contains warning.

### TC-SENSOR-11: Ingest reading invalid body
```
POST /api/v1/sensors/ingest
{
  "device_id": "esp32-lab-a",
  "temperature": "not-a-number"
}
→ 422 Validation error
```

### TC-SENSOR-12: Get readings for own node
```
GET /api/v1/sensors/nodes/{node_id}/readings?limit=10
Authorization: Bearer <farmer_token>
→ 200 [SensorReadingResponse, ...]
```
Verify: returns readings ordered by recorded_at DESC.
Verify: each reading has node_id matching requested node.

### TC-SENSOR-13: Get readings with default limit
```
GET /api/v1/sensors/nodes/{node_id}/readings
Authorization: Bearer <farmer_token>
→ 200 [...]
```
Verify: returns up to 50 readings (default limit).

### TC-SENSOR-14: Get readings for another user's node
```
GET /api/v1/sensors/nodes/{admin_node_id}/readings
Authorization: Bearer <farmer_token>
→ 404 {"detail":"Node not found"}
```

### TC-SENSOR-15: Get readings for non-existent node
```
GET /api/v1/sensors/nodes/00000000-0000-0000-0000-000000000000/readings
Authorization: Bearer <farmer_token>
→ 404 {"detail":"Node not found"}
```

---

## 2.4 AI

### TC-AI-01: Diagnose healthy leaf (farmer)
```
POST /api/v1/ai/diagnose
Authorization: Bearer <farmer_token>
Content-Type: multipart/form-data
file: Tomato___healthy.jpg
→ 200 DiagnosisResult
{
  "disease_name": "Healthy",
  "confidence": 0.99-1.0,
  "recommendation": "Tanaman dalam kondisi sehat...",
  "is_healthy": true
}
```

### TC-AI-02: Diagnose diseased leaf
```
POST /api/v1/ai/diagnose
Authorization: Bearer <farmer_token>
Content-Type: multipart/form-data
file: Tomato___Late_blight.jpg
→ 200 DiagnosisResult
{
  "disease_name": "Late Blight (Tomat)",
  "confidence": > 0.5,
  "recommendation": includes "fungisida",
  "is_healthy": false
}
```

### TC-AI-03: Diagnose as buyer (should work — any auth user)
```
POST /api/v1/ai/diagnose
Authorization: Bearer <buyer_token>
Content-Type: multipart/form-data
file: Tomato___healthy.jpg
→ 200 DiagnosisResult
```
Verify: buyer can diagnose. Response same as farmer.

### TC-AI-04: Diagnose without auth
```
POST /api/v1/ai/diagnose
Content-Type: multipart/form-data
file: Tomato___healthy.jpg
→ 403 {"detail":"Not authenticated"}
```

### TC-AI-05: Diagnose without file
```
POST /api/v1/ai/diagnose
Authorization: Bearer <farmer_token>
→ 422 Validation error (missing file field)
```

### TC-AI-06: Diagnose invalid file type
```
POST /api/v1/ai/diagnose
Authorization: Bearer <farmer_token>
Content-Type: multipart/form-data
file: test.txt (text file)
→ 500 or error (AI service expects image)
```
Verify: backend returns 503 "Layanan AI tidak tersedia saat ini."

### TC-AI-07: Grade crop (farmer)
```
POST /api/v1/ai/grade/{crop_id}
Authorization: Bearer <farmer_token>
Content-Type: multipart/form-data
file: Tomato___healthy.jpg
→ 200 GradingResult
{
  "crop_id": "...",
  "grade": "A" | "B" | "C",
  "confidence": float,
  "grade_a_prob": float,
  "grade_b_prob": float,
  "grade_c_prob": float
}
```

### TC-AI-08: Grade crop not owned by user
```
POST /api/v1/ai/grade/{crop_id_belonging_to_other_user}
Authorization: Bearer <farmer_token>
Content-Type: multipart/form-data
file: Tomato___healthy.jpg
→ 404 {"detail":"Crop not found"}
```

### TC-AI-09: Grade crop non-existent crop_id
```
POST /api/v1/ai/grade/00000000-0000-0000-0000-000000000000
Authorization: Bearer <farmer_token>
Content-Type: multipart/form-data
file: Tomato___healthy.jpg
→ 404 {"detail":"Crop not found"}
```

### TC-AI-10: Grade crop as buyer (forbidden)
```
POST /api/v1/ai/grade/{crop_id}
Authorization: Bearer <buyer_token>
→ 403 {"detail":"Insufficient permissions"}
```

### TC-AI-11: Disease LLM insight
```
POST /api/v1/ai/insight/disease
Authorization: Bearer <farmer_token>
{
  "disease_name": "Late Blight (Tomat)",
  "confidence": 0.87,
  "is_healthy": false,
  "sensor_data": {"temperature": 28.0, "humidity": 72.0}
}
→ 200 InsightResponse {insight: string}
```
Verify: insight is non-empty, in Bahasa Indonesia.
Without GEMINI_API_KEY: returns static fallback.

### TC-AI-12: Grading LLM insight
```
POST /api/v1/ai/insight/grading
Authorization: Bearer <farmer_token>
{
  "grade": "A",
  "confidence": 0.92,
  "grade_a_prob": 0.92,
  "grade_b_prob": 0.05,
  "grade_c_prob": 0.03
}
→ 200 InsightResponse {insight: string}
```

### TC-AI-13: Sensor LLM insight
```
POST /api/v1/ai/insight/sensor
Authorization: Bearer <farmer_token>
{
  "temperature": 32.0,
  "humidity": 85.0,
  "soil_moisture": 60.0,
  "ph": 6.5
}
→ 200 InsightResponse {insight: string}
```
Verify: for high temperature + high humidity, insight mentions risk of fungal disease.

---

## 2.5 Marketplace

### TC-MKT-01: Create crop listing (farmer)
```
POST /api/v1/marketplace/crops
Authorization: Bearer <farmer_token>
{
  "name": "Tomat Cerry",
  "variety": "Cherry",
  "quantity_kg": 100,
  "price_per_kg": 15000,
  "description": "Tomat cerry segar dari Bandung"
}
→ 201 CropResponse
{
  "name": "Tomat Cerry",
  "quantity_kg": 100,
  "price_per_kg": 15000,
  "grade": "ungraded",
  "is_available": true
}
```
Save returned `id`.

### TC-MKT-02: Create crop as buyer (forbidden)
```
POST /api/v1/marketplace/crops
Authorization: Bearer <buyer_token>
{...}
→ 403 {"detail":"Insufficient permissions"}
```

### TC-MKT-03: Create crop missing required fields
```
POST /api/v1/marketplace/crops
Authorization: Bearer <farmer_token>
{
  "name": "Test"
}
→ 422 Validation error (quantity_kg and price_per_kg required)
```

### TC-MKT-04: List all available crops
```
GET /api/v1/marketplace/crops?available_only=true
Authorization: Bearer <farmer_token>
→ 200 [CropResponse, ...]
```
Verify: only crops with is_available=true returned.

### TC-MKT-05: List all crops (including unavailable)
```
GET /api/v1/marketplace/crops?available_only=false
Authorization: Bearer <farmer_token>
→ 200 [CropResponse, ...]
```
Verify: includes both available and unavailable crops.

### TC-MKT-06: Get single crop
```
GET /api/v1/marketplace/crops/{crop_id}
Authorization: Bearer <farmer_token>
→ 200 CropResponse {id, name, ...}
```

### TC-MKT-07: Get non-existent crop
```
GET /api/v1/marketplace/crops/00000000-0000-0000-0000-000000000000
Authorization: Bearer <farmer_token>
→ 404 {"detail":"Crop not found"}
```

### TC-MKT-08: Update crop listing
```
PATCH /api/v1/marketplace/crops/{crop_id}
Authorization: Bearer <farmer_token>
{
  "price_per_kg": 18000,
  "quantity_kg": 80
}
→ 200 CropResponse {price_per_kg:18000, quantity_kg:80}
```

### TC-MKT-09: Update crop not owned by user
```
PATCH /api/v1/marketplace/crops/{other_farmers_crop_id}
Authorization: Bearer <farmer_token>
{
  "price_per_kg": 9999
}
→ 404 {"detail":"Crop not found"}
```

### TC-MKT-10: Get commodity prices
```
GET /api/v1/marketplace/prices
Authorization: Bearer <farmer_token>
→ 200 {
  "status": "fallback" | "ok",
  "prices": [
    {"commodity": "Tomat", "price_per_kg": 12000, "unit": "Rp/kg"},
    ...
  ]
}
```
Verify: returns fallback data if external API is down.

---

## 2.6 Transactions

### TC-TXN-01: Create order (buyer)
```
POST /api/v1/transactions/orders
Authorization: Bearer <buyer_token>
Idempotency-Key: uuid-unique-001
{
  "crop_id": "{crop_id_from_TC-MKT-01}",
  "quantity_kg": 10,
  "notes": "Pesan untuk minggu ini"
}
→ 201 OrderResponse
{
  "crop_id": "...",
  "quantity_kg": 10,
  "total_amount": 180000,
  "status": "pending"
}
```
Verify: total_amount = quantity_kg * price_per_kg (10 * 18000 = 180000).

### TC-TXN-02: Create order as farmer (forbidden)
```
POST /api/v1/transactions/orders
Authorization: Bearer <farmer_token>
Idempotency-Key: uuid-unique-002
{...}
→ 403 {"detail":"Insufficient permissions"}
```
Buyers-only endpoint.

### TC-TXN-03: Idempotent order creation (same Idempotency-Key)
```
POST /api/v1/transactions/orders
Authorization: Bearer <buyer_token>
Idempotency-Key: uuid-unique-001    ← same key
{
  "crop_id": "{same_crop_id}",
  "quantity_kg": 999
}
→ 200 OrderResponse (NOT 201)
```
Verify: returns existing order, does NOT create duplicate.

### TC-TXN-04: Order with insufficient stock
```
POST /api/v1/transactions/orders
Authorization: Bearer <buyer_token>
Idempotency-Key: uuid-unique-003
{
  "crop_id": "{crop_id}",
  "quantity_kg": 99999
}
→ 400 {"detail":"Insufficient stock"}
```

### TC-TXN-05: Order for unavailable crop
First mark crop as unavailable:
```
PATCH /api/v1/marketplace/crops/{crop_id}
Authorization: Bearer <farmer_token>
{"is_available": false}
```
Then:
```
POST /api/v1/transactions/orders
Authorization: Bearer <buyer_token>
Idempotency-Key: uuid-unique-004
{
  "crop_id": "{crop_id}",
  "quantity_kg": 5
}
→ 404 {"detail":"Crop not available"}
```
Restore availability for subsequent tests:
```
PATCH /api/v1/marketplace/crops/{crop_id}
Authorization: Bearer <farmer_token>
{"is_available": true}
```

### TC-TXN-06: List orders (buyer sees own purchases)
```
GET /api/v1/transactions/orders
Authorization: Bearer <buyer_token>
→ 200 [OrderResponse]
```
Verify: each order has buyer_id matching current user.

### TC-TXN-07: List orders (farmer sees own sales)
```
GET /api/v1/transactions/orders
Authorization: Bearer <farmer_token>
→ 200 [OrderResponse]
```
Verify: each order has seller_id matching current user.

### TC-TXN-08: List orders (admin sees all)
```
GET /api/v1/transactions/orders
Authorization: Bearer <admin_token>
→ 200 [OrderResponse]
```
Verify: returns ALL orders across all users.

### TC-TXN-09: Update order status (farmer)
```
PATCH /api/v1/transactions/orders/{order_id}/status?new_status=confirmed
Authorization: Bearer <farmer_token>
→ 200 OrderResponse {status:"confirmed"}
```

### TC-TXN-10: Update order status full lifecycle
```
PATCH /.../status?new_status=confirmed  → 200
PATCH /.../status?new_status=processing → 200
PATCH /.../status?new_status=completed  → 200
PATCH /.../status?new_status=cancelled  → 200 (if still pending)
```
Verify: status transitions work correctly.

### TC-TXN-11: Update order status as buyer (forbidden)
```
PATCH /api/v1/transactions/orders/{order_id}/status?new_status=confirmed
Authorization: Bearer <buyer_token>
→ 403 {"detail":"Insufficient permissions"}
```

### TC-TXN-12: Update non-existent order
```
PATCH /api/v1/transactions/orders/00000000-0000-0000-0000-000000000000/status?new_status=completed
Authorization: Bearer <farmer_token>
→ 404 {"detail":"Order not found"}
```

### TC-TXN-13: Order without Idempotency-Key header
```
POST /api/v1/transactions/orders
Authorization: Bearer <buyer_token>
{
  "crop_id": "{crop_id}",
  "quantity_kg": 1
}
→ 422 Validation error (missing required header)
```

---

# 3. AI Service Tests

Direct AI service calls (bypassing backend). Base URL: `http://localhost:8001`

## 3.1 Health

### TC-AIHEALTH-01: AI service health
```
GET http://localhost:8001/health
→ 200 {
  "status": "ok",
  "grading_model": "loaded" | "unavailable",
  "disease_model": "loaded" | "unavailable"
}
```

### TC-AIHEALTH-02: Models loading state
If running for first time, verify models download and load.
Expected: both models show "loaded" after startup completes.

---

## 3.2 Grading

### TC-AIGRADE-01: Grade healthy tomato
```
POST http://localhost:8001/grade
Content-Type: multipart/form-data
file: Tomato___healthy.jpg
crop_id: "00000000-0000-0000-0000-000000000000"
→ 200
{
  "crop_id": "00000000-0000-0000-0000-000000000000",
  "grade": "A" | "B" | "C",
  "confidence": float,
  "grade_a_prob": float,
  "grade_b_prob": float,
  "grade_c_prob": float
}
```

### TC-AIGRADE-02: Grade with missing file
```
POST http://localhost:8001/grade
→ 422 Validation error
```

---

## 3.3 Diagnosis

### TC-AIDIAG-01: Diagnose healthy leaf
```
POST http://localhost:8001/diagnose
Content-Type: multipart/form-data
file: Tomato___healthy.jpg
→ 200
{
  "disease_name": "Healthy",
  "confidence": 0.99-1.0,
  "recommendation": string,
  "is_healthy": true
}
```

### TC-AIDIAG-02: Diagnose diseased leaf
```
POST http://localhost:8001/diagnose
Content-Type: multipart/form-data
file: Tomato___Late_blight.jpg
→ 200
{
  "disease_name": "Late Blight (Tomat)",
  "confidence": > 0.5,
  "is_healthy": false
}
```
Verify: confidence is reasonable (> 0.5).
Verify: recommendation is non-empty and in Indonesian.

### TC-AIDIAG-03: Diagnose pepper leaf
```
POST http://localhost:8001/diagnose
Content-Type: multipart/form-data
file: Pepper_bell___Bacterial_spot.jpg
→ 200
```
Verify: disease_name contains "Bacterial Spot".

### TC-AIDIAG-04: Diagnose healthy pepper
```
POST http://localhost:8001/diagnose
Content-Type: multipart/form-data
file: Pepper_bell___healthy.jpg
→ 200
```
Verify: is_healthy = true.

### TC-AIDIAG-05: Diagnose early blight
```
POST http://localhost:8001/diagnose
Content-Type: multipart/form-data
file: Tomato___Early_blight.jpg
→ 200
```
Verify: disease_name contains "Early Blight".

### TC-AIDIAG-06: Diagnose leaf mold
```
POST http://localhost:8001/diagnose
Content-Type: multipart/form-data
file: Tomato___Leaf_Mold.jpg
→ 200
```
Verify: disease_name contains "Leaf Mold".

---

## 3.4 LLM Insight

### TC-AILLM-01: Disease insight (with sensor data)
```
POST http://localhost:8001/insight/disease
{
  "disease_name": "Late Blight (Tomat)",
  "confidence": 0.87,
  "is_healthy": false,
  "sensor_data": {"temperature": 28.0, "humidity": 85.0}
}
→ 200 {"insight": "..."}
```
Verify: insight is non-empty.
Verify: mentions the disease name and environmental conditions.
Note: without GEMINI_API_KEY, returns static fallback in Indonesian.

### TC-AILLM-02: Disease insight (healthy)
```
POST http://localhost:8001/insight/disease
{
  "disease_name": "Healthy",
  "confidence": 0.99,
  "is_healthy": true
}
→ 200 {"insight": "..."}
```
Verify: insight suggests maintaining current conditions.

### TC-AILLM-03: Grading insight (Grade A)
```
POST http://localhost:8001/insight/grading
{
  "grade": "A",
  "confidence": 0.92,
  "grade_a_prob": 0.92,
  "grade_b_prob": 0.05,
  "grade_c_prob": 0.03
}
→ 200 {"insight": "..."}
```
Verify: insight mentions premium quality.

### TC-AILLM-04: Grading insight (Grade C)
```
POST http://localhost:8001/insight/grading
{
  "grade": "C",
  "confidence": 0.65,
  "grade_a_prob": 0.1,
  "grade_b_prob": 0.25,
  "grade_c_prob": 0.65
}
→ 200 {"insight": "..."}
```
Verify: insight mentions evaluation/recommendation for improvement.

### TC-AILLM-05: Sensor insight (normal conditions)
```
POST http://localhost:8001/insight/sensor
{
  "temperature": 25.0,
  "humidity": 60.0,
  "soil_moisture": 50.0,
  "ph": 6.5
}
→ 200 {"insight": "..."}
```
Verify: insight confirms optimal conditions.

### TC-AILLM-06: Sensor insight (extreme conditions)
```
POST http://localhost:8001/insight/sensor
{
  "temperature": 38.0,
  "humidity": 95.0,
  "soil_moisture": 10.0,
  "ph": 4.5
}
→ 200 {"insight": "..."}
```
Verify: insight warns about each out-of-range parameter.

---

# 4. Mobile App Tests

Test on physical device via Expo Go. App loads from `http://<PC_IP>:8081`.

## 4.1 Auth Flow

### TC-MOB-AUTH-01: First launch shows login screen
**Steps:**
1. Clear app data (Settings → Apps → Agri → Clear data)
2. Launch app
**Expected:** Login screen displayed with "Masuk ke Akun" title.
**Verify:** No automatic navigation to main screen.

### TC-MOB-AUTH-02: Navigate to register
**Steps:**
1. On login screen, tap "Daftar Sekarang" link
**Expected:** Register screen displayed with "Buat Akun Baru" title.
**Verify:** Role selector has "Petani" and "Pembeli B2B" options.

### TC-MOB-AUTH-03: Register as farmer
**Steps:**
1. Select "Petani" role
2. Fill: Nama Lengkap, Email, Password (min 8 chars), Konfirmasi Password
3. Tap "Daftar Sekarang"
**Expected:** Navigates to main dashboard. Console shows token saved.

### TC-MOB-AUTH-04: Register validation
**Steps:**
1. Tap "Daftar Sekarang" with empty fields
**Expected:** Validation errors shown for required fields.
2. Enter password < 8 characters
**Expected:** "Password minimal 8 karakter" shown.
3. Enter mismatching confirm password
**Expected:** "Konfirmasi password tidak cocok" shown.
4. Enter invalid email format
**Expected:** Validation error or API returns error.

### TC-MOB-AUTH-05: Login valid credentials
**Steps:**
1. Navigate to login screen
2. Enter registered email + password
3. Tap "Masuk"
**Expected:** Navigates to main dashboard.
**Verify console:** `🔧 [LoginScreen] Login successful — calling onLogin`

### TC-MOB-AUTH-06: Login invalid credentials
**Steps:**
1. Enter wrong email or password
2. Tap "Masuk"
**Expected:** Error message "Email atau password salah. Silakan coba lagi."

### TC-MOB-AUTH-07: Login empty fields
**Steps:**
1. Tap "Masuk" with empty email and password
**Expected:** "Email dan password wajib diisi." shown.

### TC-MOB-AUTH-08: Logout
**Steps:**
1. Tap logout icon (top-right of bottom navbar, rotated icon)
2. Tap "Keluar" in confirmation dialog
**Expected:** Returns to login screen.
**Verify console:** `🔧 [AuthContext] logout() called`

### TC-MOB-AUTH-09: Auto-login with stored token
**Steps:**
1. Login successfully
2. Close and reopen app (or reload Expo)
**Expected:** App shows main screen (not login), because token is in SecureStore.
**Verify console:** `🔧 [AuthContext] Checking auth — token found: true`

### TC-MOB-AUTH-10: No token shows login
**Steps:**
1. Logout (clears token)
2. Reload app
**Expected:** Login screen shown.
**Verify console:** `🔧 [AuthContext] Checking auth — token found: false`

---

## 4.2 Navigation

### TC-MOB-NAV-01: Bottom tab navigation
**Steps:**
1. After login, tap each tab icon: Dashboard, Notifications, Diagnosis, Monitor
**Expected:** Each tab shows its respective screen.

### TC-MOB-NAV-02: Camera button
**Steps:**
1. Tap center camera button in navbar
**Expected:** Camera screen opens with viewfinder overlay.

### TC-MOB-NAV-03: Back navigation
**Steps:**
1. Open camera
2. Tap back arrow
**Expected:** Returns to previous screen.

---

## 4.3 Camera & Diagnosis

### TC-MOB-CAM-01: Camera permissions
**Steps:**
1. Open camera screen
2. If permission not granted, allow camera access
**Expected:** Camera viewfinder appears.
**Verify console:** `🔧 [CameraScreen] Permission status: {"granted":true}`

### TC-MOB-CAM-02: Take photo
**Steps:**
1. Point camera at any object
2. Tap shutter button
**Expected:** Photo captured, navigates to preview screen.
**Verify console:** `🔧 [CameraScreen] ✅ Photo captured. Full photo object: {uri, width, height}`

### TC-MOB-CAM-03: Photo preview screen
**Steps:**
1. After taking photo, verify photo displays correctly
**Expected:** Image preview takes most of the screen.
**Verify console:** `🔧 [CameraPreview] Route params: {uri, mode}`

### TC-MOB-CAM-04: Analyze photo (diagnosis)
**Steps:**
1. Take a photo of a plant leaf
2. Tap checkmark button
**Expected:** Loading indicator appears, then navigates to DiagnosisDetail.
**Verify console:** 
```
🔧 [CameraPreview] DIAGNOSE mode — calling aiApi.diagnose
🔧 [api.ts] Request: POST /ai/diagnose
🔧 [aiApi.diagnose] Success — status: 200
🔧 [aiApi.diagnose] Result: {disease_name, confidence, recommendation, is_healthy}
```

### TC-MOB-CAM-05: Analyze failure (no token)
**Steps:**
1. Logout → clear token
2. Take a photo
3. Tap checkmark
**Expected:** "Analisis tidak dapat dilakukan. Periksa koneksi dan coba lagi." alert.
**Verify console:** `🔧 [api.ts]   Has token in SecureStore: false`

### TC-MOB-CAM-06: Delete photo
**Steps:**
1. Take a photo
2. Tap trash icon
**Expected:** Returns to camera screen.

### TC-MOB-CAM-07: Retake photo
**Steps:**
1. Take a photo
2. Tap camera icon
**Expected:** Returns to camera viewfinder.

### TC-MOB-CAM-08: Diagnosis result details
**Steps:**
1. Complete a diagnosis (healthy or diseased leaf)
2. View DiagnosisDetail screen
**Expected:** Shows:
   - Disease name (e.g., "Healthy" or "Late Blight (Tomat)")
   - Confidence percentage
   - Recommendation text in Indonesian
   - Sensor data cards (temperature, pH, humidity)
**Verify console:** `🔧 [DiagnosisDetail] Route params: {result, mode, imageUri, insight, sensorData}`

---

## 4.4 Dashboard

### TC-MOB-DASH-01: Dashboard loads
**Steps:**
1. Login and tap Dashboard tab
**Expected:** Dashboard displays with:
   - Greeting text
   - Balance card
   - Sensor readings (or "Belum ada data sensor")
   - Commodity price dropdown
   - Price chart

### TC-MOB-DASH-02: Commodity selector
**Steps:**
1. Tap the commodity dropdown
**Expected:** Modal shows list of commodities.
2. Select a commodity
**Expected:** Price chart updates for selected commodity.

---

## 4.5 Sensor Monitoring

### TC-MOB-MON-01: Monitor screen loads
**Steps:**
1. Tap Monitor tab
**Expected:** Monitor screen displays sensor data interface.

---

# 5. Frontend Web Tests

Test in a browser. Base URL: `http://localhost:3000`

### TC-WEB-01: Landing page loads
**Steps:**
1. Open `http://localhost:3000`
**Expected:** Landing page with "Agri" heading, "Masuk" and "Lihat Marketplace" buttons.

### TC-WEB-02: Navigation to login
**Steps:**
1. Click "Masuk"
**Expected:** Login page with email/password form.

### TC-WEB-03: Navigation to register
**Steps:**
1. Click register link from login page
**Expected:** Register form with name, email, password, role fields.

### TC-WEB-04: Dashboard page
**Steps:**
1. Navigate to `/dashboard`
**Expected:** Static dashboard with stat cards and mock data.

### TC-WEB-05: Marketplace page
**Steps:**
1. Navigate to `/marketplace`
**Expected:** Product listing grid with mock product data.

### TC-WEB-06: All routes accessible
Navigate to each of:
- `/`
- `/login`
- `/register`
- `/dashboard`
- `/marketplace`
- `/katalog-dagangan`
- `/katalog-detail`
- `/kelola-produk`
- `/keranjang`
- `/status-pesanan`
- `/keuangan`

**Expected:** Each page renders without crashing. 404 pages for non-existent routes.

---

# 6. IoT Integration Tests

### TC-IOT-01: MQTT connection (if Mosquitto running)
**Steps:**
1. Start Mosquitto broker on port 1883
2. Ensure backend MQTT listener is running
3. Publish test message:
```bash
mosquitto_pub -h localhost -p 1883 -t "agri/sensor/ESP32_NODE_001" \
  -m '{"device_id":"ESP32_NODE_001","temperature":25.0,"humidity":60.0,"soil_moisture":50.0,"ph":6.5}'
```
**Expected:** Backend logs "MQTT subscribed to agri/sensor/#"
**Verify:** Reading stored via `GET /api/v1/sensors/nodes/{node_id}/readings`

### TC-IOT-02: Ingest known sensor node MQTT
Same as TC-IOT-01 but with a device_id that matches a registered sensor node.
**Expected:** Reading processed and stored under that node.

### TC-IOT-03: Ingest unknown device MQTT
```
mosquitto_pub ... -m '{"device_id":"unknown-device","temperature":25.0}'
```
**Expected:** Backend logs warning "Unknown device_id: unknown-device". No crash.

### TC-IOT-04: JSON parsing error MQTT
```
mosquitto_pub ... -m 'not-valid-json'
```
**Expected:** Backend logs error "Error processing MQTT message". No crash.

### TC-IOT-05: ESP32 offline storage
**Steps:**
1. ESP32 cannot connect to WiFi
**Expected:** ESP32 stores readings in LittleFS.
2. WiFi reconnects
**Expected:** Stored readings published via MQTT.

---

# 7. Security Tests

### TC-SEC-01: No hardcoded secrets
Search codebase for:
```bash
grep -r "api_key\|secret\|password\|token" --include="*.py" --include="*.ts" --include="*.tsx" \
  --exclude-dir=node_modules --exclude-dir=.venv \
  | grep -v ".env.example\|env\|settings\|import\|config\|test" \
  | grep -E "=['\"][^'\"]{8,}['\"]"
```
**Expected:** No secrets found. Config values reference env vars, not hardcoded strings.

### TC-SEC-02: SQL injection resistance
```python
# Verify all DB queries use parameterized statements:
grep -r "execute(f" backend/app/  # Should find nothing
grep -r "\.format.*SELECT\|\.format.*INSERT\|\.format.*DELETE" backend/app/  # Should find nothing
grep -r "execute(" backend/app/models/ backend/app/services/ backend/app/routers/ | grep -v "await db.execute" | grep -v "session.execute"
```
**Expected:** All SQL queries use SQLAlchemy ORM or parameterized statements.

### TC-SEC-03: Auth header required for protected endpoints
**Steps:**
Test each protected endpoint without Authorization header:
```bash
for endpoint in "GET /sensors/nodes" "GET /marketplace/crops" "POST /ai/diagnose"; do
  echo "Testing $endpoint without auth..."
  # Each should return 403
done
```
**Expected:** All protected endpoints return 403 without token.

### TC-SEC-04: Role enforcement
**Steps:**
Test each role-restricted endpoint with wrong role:
- Farmer endpoints with buyer token → 403
- Buyer endpoints with farmer token → 403
- Admin endpoints with farmer token → 403 (if admin-only)

### TC-SEC-05: Token expiry
**Steps:**
1. Generate token with `ACCESS_TOKEN_EXPIRE_MINUTES=1`
2. Wait 1+ minutes
3. Use expired token for authenticated request
**Expected:** 401 "Invalid token"

### TC-SEC-06: JWT tampering
**Steps:**
1. Modify a valid JWT (change one character in payload segment)
2. Send request with tampered token
**Expected:** 401 "Invalid token"

### TC-SEC-07: CORS headers
```
curl -I -X OPTIONS http://localhost:8000/health \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET"
→ 200
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: *
Access-Control-Allow-Headers: *
```

### TC-SEC-08: Input validation (XSS)
```
POST /api/v1/auth/register
{
  "email": "<script>alert(1)</script>@test.com",
  "password": "test123",
  "full_name": "<img src=x onerror=alert(1)>",
  "role": "farmer"
}
→ 422 or stored with HTML escaped
```
If 201: fetch the user and verify the stored full_name does NOT execute as HTML.

### TC-SEC-09: Input validation (SQL special chars)
```
POST /api/v1/sensors/nodes
Authorization: Bearer <farmer_token>
{
  "device_id": "'; DROP TABLE users; --",
  "name": "SQL Injection Test"
}
→ 201 (successful creation) or 422
```
Verify: tables not dropped. GET /health still returns 200.

---

# 8. Regression Test Matrix

Use this matrix to verify no regressions after any code change.

## Core Data Flow

| ID | Flow | Depends On | Expected |
|----|------|-----------|----------|
| R01 | Register → Login → Get Me | TC-AUTH-01, 05, 09 | Full auth cycle works |
| R02 | Register Node → Ingest → Get Readings | TC-SENSOR-01, 07, 12 | End-to-end sensor pipeline |
| R03 | Create Crop → Grade → Verify Grade | TC-MKT-01, TC-AI-07, GET crop | AI grading updates crop record |
| R04 | Create Crop → List Marketplace | TC-MKT-01, TC-MKT-04 | Crop visible to buyers |
| R05 | Create Crop → Create Order → Check Status | TC-MKT-01, TC-TXN-01, TC-TXN-09 | Full buy transaction cycle |
| R06 | Diagnose → Get Insight → View Detail | TC-AI-01, TC-AI-11 | AI → LLM pipeline |
| R07 | Mobile Photo → Diagnose → View Result | TC-MOB-CAM-02, 04, 08 | Full mobile → backend → AI pipeline |

## Quick Smoke Test (single script)

```bash
#!/bin/bash
# Quick smoke test — run all core endpoints

BASE="http://localhost:8000/api/v1"

# 1. Register
echo "=== Register ==="
curl -s -X POST "$BASE/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@test.com","password":"test123","full_name":"Smoke Test","role":"farmer"}'
echo

# 2. Login (get token)
TOKEN=$(curl -s -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@test.com","password":"test123"}' | python -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

echo "=== Health ==="
curl -s "$BASE/../health"
echo

echo "=== Sensor Nodes ==="
curl -s "$BASE/sensors/nodes" -H "Authorization: Bearer $TOKEN"
echo

echo "=== Marketplace Crops ==="
curl -s "$BASE/marketplace/crops" -H "Authorization: Bearer $TOKEN"
echo

echo "=== AI Health ==="
curl -s "http://localhost:8001/health"
echo
```

## Test Environment Cleanup

To reset test data:
```bash
# Stop backend, delete SQLite DB, restart
rm backend/agri_dev.db
# Backend auto-creates fresh DB on next startup
```

## Reporting Test Results

For each test case, record:
```
TC-XXX-XX: [PASS | FAIL | BLOCKED]
Notes: any observations
Bug: link to issue if failed
```

Run priority: **P0** (critical path) → **P1** (major features) → **P2** (edge cases)
