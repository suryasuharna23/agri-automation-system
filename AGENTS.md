# AGENTS.md — Agri AIoT Platform

This file guides AI coding agents working on the Agri Agriculture Intelligence of Things platform.

## Project Overview

Monorepo for an integrated horticulture platform combining IoT, AI, and B2B marketplace.
Target users: Indonesian horticulture farmers (mobile app) and B2B buyers/admins (web dashboard).

## Repository Structure

```
agri-automation-system/
├── backend/          # FastAPI + SQLAlchemy + aiomqtt — Python
├── frontend-web/     # Next.js 15 — dashboard for B2B buyers & admin
├── mobile/           # React Native + Expo SDK 54 — farmer mobile app
├── iot/              # ESP32 firmware (PlatformIO)
├── ai/               # PyTorch CNN inference service + Gemini LLM
├── infra/            # Mosquitto MQTT config
└── docker-compose.yml
```

## Tech Stack

| Component      | Technology                                           |
|----------------|------------------------------------------------------|
| Backend        | FastAPI, SQLAlchemy 2.0 async, aiomqtt, Pydantic v2  |
| Database       | SQLite (dev) / PostgreSQL 16 (Docker production)     |
| AI             | PyTorch, EfficientNet-B0, MobileNetV2 (HuggingFace)  |
| LLM            | Google Gemini Flash Lite (optional, free tier)       |
| Frontend Web   | Next.js 15, Tailwind CSS, TypeScript                 |
| Mobile         | React Native, Expo SDK 54, TypeScript                |
| IoT            | ESP32, PlatformIO, DHT22, PubSubClient, ArduinoJson  |
| Auth           | JWT (bcrypt + HS256), SecureStore (mobile)           |
| Messaging      | MQTT (Mosquitto broker), Firebase Cloud Messaging    |
| Infra          | Docker Compose (optional), Mosquitto MQTT            |

## Data Model (8 tables)

```
users ──┬── sensor_nodes ── sensor_readings
        ├── crops ──┬── traceability_logs
        │           └── diagnosis_records
        └── transactions (as seller / as buyer)
```

### users
- `id` (UUID, PK), `email` (unique), `hashed_password`, `full_name`
- `role`: enum `farmer | buyer | admin`, default `farmer`
- `fcm_token`: for push notifications via Firebase
- Relations: sensor_nodes, crops, transactions (seller+buyer)

### sensor_nodes
- `id` (UUID, PK), `device_id` (unique, ESP32 ID), `name`, `location`
- `owner_id` → FK to users

### sensor_readings
- `id` (UUID, PK), `node_id` → FK to sensor_nodes
- Data: `temperature`, `humidity`, `soil_moisture`, `ph` (all nullable)
- `is_anomaly`, `anomaly_description`

### crops
- `id` (UUID, PK), `farmer_id` → FK to users
- `name`, `variety`, `quantity_kg`, `price_per_kg`
- `grade`: enum `A | B | C | ungraded`
- `is_available` (boolean, for marketplace listing)

### diagnosis_records
- `id` (UUID, PK), `farmer_id` → FK to users
- `disease_name`, `confidence`, `recommendation`
- Created when a farmer uses the AI diagnose feature

### traceability_logs
- `id` (UUID, PK), `crop_id` → FK to crops
- `event_type`, `event_data` (JSON text)
- Supply chain tracking

### transactions (orders)
- `id` (UUID, PK), `seller_id` + `buyer_id` → FK to users
- `crop_id` → FK to crops, `quantity_kg`, `price_per_kg`, `total_amount`
- `status`: enum `pending | confirmed | processing | completed | cancelled`
- `idempotency_key` (unique): prevents duplicate order creation

## API Endpoints (all under `/api/v1/`)

### Auth — `/auth`
| Method | Path | Auth | Role | Notes |
|--------|------|------|------|-------|
| POST | `/register` | ❌ | - | Returns JWT tokens + user |
| POST | `/login` | ❌ | - | Returns JWT tokens + user |
| GET | `/me` | ✅ | any | Current user profile |
| PATCH | `/me` | ✅ | any | Update profile fields |

### Sensor/IoT — `/sensors`
| Method | Path | Auth | Role | Notes |
|--------|------|------|------|-------|
| POST | `/nodes` | ✅ | farmer/admin | Register ESP32 node |
| GET | `/nodes` | ✅ | any | Own nodes only |
| GET | `/nodes/{id}/readings` | ✅ | any | Own node only; query: `?limit=N` |
| POST | `/ingest` | ❌ | - | ESP32 HTTP fallback, no auth |

### AI — `/ai`
| Method | Path | Auth | Role | Notes |
|--------|------|------|------|-------|
| POST | `/grade/{crop_id}` | ✅ | farmer/admin | Multipart file upload |
| POST | `/diagnose` | ✅ | any | Multipart file upload |
| POST | `/insight/disease` | ✅ | any | Gemini LLM |
| POST | `/insight/grading` | ✅ | any | Gemini LLM |
| POST | `/insight/sensor` | ✅ | any | Gemini LLM |

### Marketplace — `/marketplace`
| Method | Path | Auth | Role | Notes |
|--------|------|------|------|-------|
| POST | `/crops` | ✅ | farmer/admin | List new crop |
| GET | `/crops` | ✅ | any | Query: `?available_only=true` |
| GET | `/crops/{id}` | ✅ | any | Single crop detail |
| PATCH | `/crops/{id}` | ✅ | farmer/admin | Update own crop |
| GET | `/prices` | ✅ | any | Fallback static data |

### Transactions — `/transactions`
| Method | Path | Auth | Role | Notes |
|--------|------|------|------|-------|
| POST | `/orders` | ✅ | buyer/admin | Requires `Idempotency-Key` header |
| GET | `/orders` | ✅ | any | Filtered by role (buyer sees own, farmer sees sells) |
| PATCH | `/orders/{id}/status` | ✅ | farmer/admin | Update order status |

### Health
| Method | Path | Notes |
|--------|------|-------|
| GET | `/health` | Returns `{"status":"ok"}` |

## Auth & Authorization

### JWT tokens
- Algorithm: HS256, secret from `SECRET_KEY` env var
- Access token: 60 min expiry, payload: `{sub: user_id, role: role, type: "access"}`
- Refresh token: 7 day expiry, payload: `{sub: user_id, type: "refresh"}`
- Password hashing: bcrypt (via `bcrypt` library, not passlib)

### Role-based access
- `HTTPBearer` auto-error: returns 403 if Authorization header missing
- `get_current_user`: decodes token, returns User or 401
- `require_role(farmer, admin)`: returns 403 if user role not in allowed list
- Endpoints use either `get_current_user` (any authenticated user) or `require_role`

### Mobile auth flow
- `AuthContext.tsx` reads token from `expo-secure-store` on startup
- `AppNavigator` conditionally renders AuthStack (Login/Register) or AppStack
- After login/register: `onLogin` callback flips `isAuthenticated` state
- Logout button in Navbar2 → confirmation dialog → clears token → shows login
- Every API call via axios interceptor adds `Authorization: Bearer <token>`

## AI Service

### Inference models
- **Grading model** (`ai/inference/grading_model.py`): EfficientNet-B0 from torchvision
  with custom 3-class classifier head. Falls back to color-based heuristic if no fine-tuned
  checkpoint is available.
- **Disease model** (`ai/inference/disease_model.py`): MobileNetV2 from HuggingFace
  (`Diginsa/Plant-Disease-Detection-Project`). 38 classes from PlantVillage dataset.
  Indonesian-language treatment recommendations built in. Falls back to "Model Unavailable".
- **LLM Insight** (`ai/inference/llm_insight.py`): Google Gemini Flash Lite via `google-genai`.
  Generates contextual farming advice in Indonesian. Requires `GEMINI_API_KEY` env var.
  Falls back to static Indonesian-language strings.

### Inference server endpoints
- `POST /grade`: multipart file upload, returns `{grade, confidence, crop_id, grade_a/b/c_prob}`
- `POST /diagnose`: multipart file upload, returns `{disease_name, confidence, recommendation, is_healthy}`
- `POST /insight/{disease|grading|sensor}`: JSON payload, returns `{insight: string}`

## IoT (ESP32)

- PlatformIO project, board: `esp32dev`
- Sensors: DHT22 (temp/humidity), capacitive soil moisture, analog pH
- Reads every 10 seconds, publishes JSON via MQTT to `agri/sensor/{DEVICE_ID}`
- Offline storage via LittleFS, syncs on reconnect
- Backend subscribes to `agri/sensor/#` via aiomqtt

### Anomaly thresholds (sensor_service.py)
| Parameter       | Min  | Max  |
|----------------|------|------|
| Temperature    | 15°C | 35°C |
| Humidity       | 40%  | 90%  |
| Soil Moisture  | 20%  | 80%  |
| pH             | 5.5  | 7.5  |

## Running Locally (Native, no Docker)

Windows 10 build 19044+ required for Docker Desktop. If unavailable or inconvenient,
run all services natively:

```bash
# Backend (Python 3.12 via uv)
cd backend
uv venv --python 3.12 .venv
source .venv/Scripts/activate
uv pip install -r requirements.txt
uvicorn app.main:app --reload          # http://localhost:8000

# AI Service (run from repo root, venv in ai/)
source ai/.venv/Scripts/activate
uvicorn ai.api.inference_server:app --port 8001 --reload   # http://localhost:8001

# Frontend Web
cd frontend-web
npm install && npm run dev              # http://localhost:3000

# Mobile (scan QR with Expo Go)
cd mobile
npm install
npx expo start -c                       # http://localhost:8081
```

### Docker (when available)
```bash
docker compose up -d
```

The compose file uses PostgreSQL + Mosquitto with password auth.
For native dev, the backend uses SQLite and Mosquitto is optional
(the MQTT listener retries forever on connection failure).

## Mobile App Structure

### Screens
| Screen | File | Purpose |
|--------|------|---------|
| LoginScreen | `screens/LoginScreen.tsx` | Email + password login |
| RegisterScreen | `screens/RegisterScreen.tsx` | Register as farmer/buyer |
| DashboardScreen | `screens/DashboardScreen.tsx` | Commodity price chart, sensor display |
| HomeScreen | `screens/HomeScreen.tsx` | (Unused in nav) |
| DiagnosisScreen | `screens/DiagnosisScreen.tsx` | Diagnosis history list |
| DiagnosisDetailScreen | `screens/DiagnosisDetailScreen.tsx` | Detailed diagnosis + treatment |
| TreatmentScreen | `screens/TreatmentScreen.tsx` | Treatment instructions |
| CameraScreen | `screens/CameraScreen.tsx` | Camera viewfinder with guide |
| CameraPreviewScreen | `screens/CameraPreviewScreen.tsx` | Photo preview + analyze button |
| MonitorScreen | `screens/MonitorScreen.tsx` | Live sensor data monitoring |
| NotificationScreen | `screens/NotificationScreen.tsx` | Push notification history |

### Navigation flow
```
AppNavigator (Stack)
├── [not authenticated] ── AuthStack
│   ├── Login
│   └── Register
└── [authenticated] ── AppStack
    ├── Main (Tab Navigator)
    │   ├── Dashboard
    │   ├── Notifications
    │   ├── Diagnosis
    │   └── Monitor
    ├── Camera
    ├── CameraPreview
    ├── DiagnosisDetail
    └── Treatment
```

### Debug logging
All API calls log with `🔧 [api.ts]` prefix. Camera flow logs with
`🔧 [CameraScreen]` and `🔧 [CameraPreview]`. Use Expo dev tools
or `adb logcat | grep "🔧"` to view.

## Frontend Web Structure

### Pages (Next.js App Router)
| Path | File | Purpose |
|------|------|---------|
| `/` | `page.tsx` | Landing page |
| `/login` | `(auth)/login/page.tsx` | Login form |
| `/register` | `(auth)/register/page.tsx` | Registration form |
| `/dashboard` | `dashboard/page.tsx` | Farmer dashboard |
| `/marketplace` | `marketplace/page.tsx` | Crop catalog |
| `/katalog-dagangan` | `katalog-dagangan/page.tsx` | Product catalog |
| `/katalog-detail` | `katalog-detail/page.tsx` | Product detail |
| `/kelola-produk` | `kelola-produk/page.tsx` | Manage products |
| `/keranjang` | `keranjang/page.tsx` | Shopping cart |
| `/status-pesanan` | `status-pesanan/page.tsx` | Order status |
| `/keuangan` | `keuangan/page.tsx` | Financial reports |

### State management
- **Zustand**: auth state (`src/lib/auth-store.ts`)
- **React Query**: server state (API data caching)
- **Dashboard**: currently uses `src/lib/dashboard-data.ts` (mock data)

## Language & Conventions

- **UI text:** Indonesian (Bahasa). All user-facing strings in Indonesian.
- **Code:** English. Variable names, comments, commit messages in English.
- **Commit style:** Conventional Commits — `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `fix:`

## Development Workflow

1. Branch from `main`: `git checkout -b feat/description`
2. Make changes, commit conventionally
3. Push and create PR against `main`
4. All PRs should be reviewed before merging

## Notes for AI Agents

- The backend currently runs in **SQLite mode** for local dev (no PostgreSQL install needed).
  The model files use `sqlalchemy.Uuid` instead of `sqlalchemy.dialects.postgresql.UUID`.
- Mosquitto MQTT is optional locally. The MQTT listener has an infinite retry loop,
  so it will keep trying to connect silently.
- The AI service must be run from the **repo root** (not from `ai/` directory)
  because imports use the `ai.` prefix (e.g. `from ai.inference.grading_model import ...`).
- Firebase notifications will gracefully fail if no `firebase-credentials.json` exists.
- The mobile app's `.env` file must contain the PC's LAN IP — `localhost` won't work
  because the mobile device connects over WiFi.
- No `.env` files are committed to git (they're in `.gitignore`).
