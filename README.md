# Agri — Agriculture Intelligence of Things (AIoT)

Platform terintegrasi untuk petani hortikultura yang menggabungkan IoT, AI, dan marketplace digital.

## Struktur Monorepo

```
agri-automation-system/
├── backend/          # FastAPI + SQLAlchemy + MQTT — Python
├── frontend-web/     # Next.js 15 — dashboard untuk pembeli B2B & admin
├── mobile/           # React Native + Expo — aplikasi mobile petani
├── iot/              # ESP32 firmware (PlatformIO)
├── ai/               # PyTorch CNN inference service (grading + disease)
├── infra/            # Konfigurasi infrastruktur (Mosquitto, dll)
└── docker-compose.yml
```

## Arsitektur Sistem

```
[Petani]
  └─ Mobile App (React Native / Expo)
       └─ REST API ──► Backend (FastAPI) ──► SQLite (dev) / PostgreSQL (prod)
                                │
                                ├──► AI Service (PyTorch CNN) ── port 8001
                                │      ├── Grading (Grade A/B/C, EfficientNet-B0)
                                │      └── Diagnosis Penyakit (MobileNetV2, 38 kelas)
                                │      └── LLM Insight (Google Gemini, opsional)
                                │
                                └──► MQTT Broker (Mosquitto) ◄── ESP32 IoT Node
                                         └── suhu, kelembapan, soil moisture, pH

[Pembeli B2B / Admin]
  └─ Web Dashboard (Next.js 15)
       └─ REST API ──► Backend (FastAPI)
```

## Tech Stack

| Komponen      | Teknologi                                      |
|---------------|------------------------------------------------|
| Backend       | FastAPI, SQLAlchemy 2.0 (async), aiomqtt       |
| Database      | SQLite (dev) / PostgreSQL 16 (via Docker)      |
| AI            | PyTorch, EfficientNet-B0, MobileNetV2 (HuggingFace) |
| LLM           | Google Gemini (free tier, optional)            |
| Frontend Web  | Next.js 15, Tailwind CSS, TypeScript           |
| Mobile        | React Native, Expo SDK 54, TypeScript          |
| IoT           | ESP32, PlatformIO, DHT22, MQTT (PubSubClient)  |
| Auth          | JWT (bcrypt + HS256), SecureStore (mobile)     |
| Infra         | Docker Compose (opsional), Mosquitto MQTT      |

## Quick Start (Native, tanpa Docker)

> Windows 10 build 19044+ diperlukan untuk Docker Desktop. Jika tidak tersedia,
> jalankan secara native dengan SQLite.

### 1. Backend

```bash
cd backend
uv venv --python 3.12 .venv        # buat virtual environment
source .venv/Scripts/activate       # Windows
uv pip install -r requirements.txt
cp .env.example .env                # sudah dikonfigurasi untuk SQLite
uvicorn app.main:app --reload       # http://localhost:8000
```

### 2. AI Service

```bash
cd ai
uv venv --python 3.12 .venv
source .venv/Scripts/activate
uv pip install -r requirements.txt
cp .env.example .env                # isi GEMINI_API_KEY (opsional)
# Jalankan dari root repo (bukan dari dalam ai/):
cd ..
source ai/.venv/Scripts/activate
uvicorn ai.api.inference_server:app --port 8001 --reload
# http://localhost:8001
```

### 3. Frontend Web

```bash
cd frontend-web
npm install
cp .env.local.example .env.local
npm run dev                         # http://localhost:3000
```

### 4. Mobile (Expo)

```bash
cd mobile
npm install
cp .env.example .env                # Ubah EXPO_PUBLIC_API_URL ke IP lokal PC
npx expo start -c                   # Scan QR code dengan Expo Go
```

> **Penting:** `EXPO_PUBLIC_API_URL` harus berisi **IP LAN komputer** (bukan `localhost`),
> misalnya `http://192.168.0.100:8000/api/v1`. Cek dengan `ipconfig`.

### 5. IoT (ESP32)

```bash
cd iot
# Install PlatformIO: https://platformio.org
# Edit src/config.h — isi WiFi & MQTT credentials
pio run --target upload
pio device monitor
```

## Docker (jika Windows mendukung)

```bash
docker compose up -d
```

| Service       | URL                          |
|---------------|------------------------------|
| Backend API   | http://localhost:8000        |
| API Docs      | http://localhost:8000/docs   |
| AI Service    | http://localhost:8001        |
| Frontend Web  | http://localhost:3000        |
| MQTT Broker   | localhost:1883               |

Dalam mode Docker, database menggunakan PostgreSQL, dan MQTT menggunakan
konfigurasi `infra/mosquitto/mosquitto.conf`.

## API Endpoints

### Auth
| Method | Path              | Auth     | Role       | Deskripsi            |
|--------|-------------------|----------|------------|----------------------|
| POST   | `/api/v1/auth/register` | ❌ | -          | Daftar akun baru     |
| POST   | `/api/v1/auth/login`    | ❌ | -          | Login                |
| GET    | `/api/v1/auth/me`       | ✅ | any        | Profil user          |
| PATCH  | `/api/v1/auth/me`       | ✅ | any        | Update profil        |

### Sensor / IoT
| Method | Path                              | Auth | Role         | Deskripsi                |
|--------|-----------------------------------|------|--------------|--------------------------|
| POST   | `/api/v1/sensors/nodes`           | ✅   | farmer/admin | Daftarkan node IoT baru  |
| GET    | `/api/v1/sensors/nodes`           | ✅   | any          | Lihat node milik sendiri |
| GET    | `/api/v1/sensors/nodes/{id}/readings` | ✅ | any       | Riwayat data sensor      |
| POST   | `/api/v1/sensors/ingest`          | ❌   | -            | Input data dari ESP32    |

### AI
| Method | Path                              | Auth | Role         | Deskripsi                   |
|--------|-----------------------------------|------|--------------|-----------------------------|
| POST   | `/api/v1/ai/grade/{crop_id}`      | ✅   | farmer/admin | Grading kualitas (foto)     |
| POST   | `/api/v1/ai/diagnose`             | ✅   | any          | Diagnosis penyakit (foto)   |
| POST   | `/api/v1/ai/insight/disease`      | ✅   | any          | Rekomendasi LLM penyakit    |
| POST   | `/api/v1/ai/insight/grading`      | ✅   | any          | Insight LLM grading         |
| POST   | `/api/v1/ai/insight/sensor`       | ✅   | any          | Analisis LLM data sensor    |

### Marketplace
| Method | Path                              | Auth | Role         | Deskripsi                   |
|--------|-----------------------------------|------|--------------|-----------------------------|
| POST   | `/api/v1/marketplace/crops`       | ✅   | farmer/admin | Tambah komoditas            |
| GET    | `/api/v1/marketplace/crops`       | ✅   | any          | Lihat katalog               |
| GET    | `/api/v1/marketplace/crops/{id}`  | ✅   | any          | Detail komoditas            |
| PATCH  | `/api/v1/marketplace/crops/{id}`  | ✅   | farmer/admin | Update komoditas            |
| GET    | `/api/v1/marketplace/prices`      | ✅   | any          | Harga pasar (fallback statis)|

### Transaksi
| Method | Path                                   | Auth | Role         | Deskripsi                  |
|--------|----------------------------------------|------|--------------|----------------------------|
| POST   | `/api/v1/transactions/orders`          | ✅   | buyer/admin  | Buat pesanan (Idempotency-Key) |
| GET    | `/api/v1/transactions/orders`          | ✅   | any          | Daftar pesanan             |
| PATCH  | `/api/v1/transactions/orders/{id}/status` | ✅ | farmer/admin | Update status pesanan     |

### Health
| Method | Path                 | Auth | Deskripsi          |
|--------|----------------------|------|--------------------|
| GET    | `/api/v1/health`     | ❌   | Health check       |

## Database

**Development (native):** SQLite (`backend/agri_dev.db`) — auto-created, tidak perlu instalasi.

**Production (Docker):** PostgreSQL 16 — dikonfigurasi di `docker-compose.yml`.

SQLite mendukung semua fitur yang sama (UUID, foreign keys, enum) melalui
SQLAlchemy 2.0+. Untuk beralih ke PostgreSQL, ubah `DATABASE_URL` di
`backend/.env` ke `postgresql+asyncpg://...`.

## Auth Flow

1. **Register** → JWT token (access + refresh) langsung dikembalikan
2. **Login** → JWT token disimpan di `SecureStore` (mobile) / `localStorage` (web)
3. **Setiap request** → Axios interceptor menambahkan `Authorization: Bearer <token>`
4. **Token expired** (60 menit) → endpoint mengembalikan 401
5. **Role-based**: farmer/buyer/admin — endpoint tertentu dibatasi role

### Mobile Auth
- App memeriksa token dari `SecureStore` saat startup
- Jika tidak ada token → tampilkan Login/Register screen
- Logout (ikon di navbar) → hapus token → kembali ke Login screen
- Login/Register → `onLogin` callback → navigasi ke Main screen

## Mobile Debugging

Semua request API tercatat di konsol Expo dengan prefix `🔧`:
```
🔧 [api.ts] Request: POST /ai/diagnose
🔧 [api.ts]   Full URL: http://192.168.0.100:8000/api/v1/ai/diagnose
🔧 [api.ts]   Has token in SecureStore: true
🔧 [api.ts]   FormData parts: [{name: "file", uri: "...", type: "image/jpeg"}]
🔧 [CameraPreview] ❌❌❌ ANALYZE FAILED
🔧 [CameraPreview] Axios response status: 403
🔧 [CameraPreview] Axios response data: {"detail":"Not authenticated"}
```

## AI Models

| Model       | Arsitektur        | Source                                    | Fallback                     |
|-------------|-------------------|-------------------------------------------|------------------------------|
| Grading     | EfficientNet-B0   | torchvision (ImageNet) + fine-tune opsional | Analisis warna heuristik    |
| Disease     | MobileNetV2       | HuggingFace `Diginsa/Plant-Disease-Detection-Project` (38 kelas PlantVillage) | Static "Model Unavailable" |
| LLM Insight | Gemini Flash Lite | `google-genai` (butuh `GEMINI_API_KEY`)    | Static fallback Bahasa Indonesia |

## IoT Data Flow

```
ESP32 (setiap 10 detik)
  ├── Baca DHT22 (suhu, kelembapan)
  ├── Baca soil moisture sensor (kapasitif)
  ├── Baca pH sensor (analog)
  ├── Kirim JSON via MQTT ke topic agri/sensor/{DEVICE_ID}
  └── Jika offline → simpan ke LittleFS, kirim ulang saat konek

Backend
  ├── Subscribe MQTT agri/sensor/#
  ├── Deteksi anomali (threshold sensor)
  └── Kirim notifikasi Firebase (jika dikonfigurasi)
```

## Language & Conventions

- **UI text:** Indonesian (Bahasa). Semua teks user-facing dalam Bahasa Indonesia.
- **Code:** English. Nama variabel, komentar, commit message dalam English.
- **Commit style:** Conventional Commits — `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`

## Frontend Web Conventions

- **App Router** — Next.js 15 App Directory
- **Tailwind CSS** — custom `agri-*` color tokens di `tailwind.config.ts`
- **State:** Zustand untuk client state, @tanstack/react-query untuk server state
- **Forms:** react-hook-form + zod validation
- **API client:** Axios instance di `src/lib/api.ts` dengan auto Bearer token
- **Icons:** lucide-react
- **Auth:** JWT di localStorage, auto-redirect pada 401
- **Folder:** `src/app/` (routes), `src/lib/` (utilities), `src/types/` (types)

## Backend Conventions

- FastAPI + SQLAlchemy async
- Route prefix: `/api/v1/`
- Pydantic schemas di `app/schemas/`
- Business logic di `app/services/`
- Database models di `app/models/`

## Development Workflow

1. Branch dari `main`: `git checkout -b feat/description`
2. Buat perubahan, commit dengan conventional commits
3. Push dan buat PR ke `main`
4. Semua PR harus direview sebelum merge

## Komponen yang Masih Menggunakan Mock Data

- **Frontend Web dashboard** — `src/lib/dashboard-data.ts` berisi data statis
  (belum terhubung ke API)
- **Mobile DiagnosisScreen** — History diagnosis menggunakan `MOCK_ITEMS`
  (akan diganti dengan API `/diagnoses`)
