# Agri — Agriculture Intelligence of Things (AIoT)

Platform terintegrasi untuk petani hortikultura yang menggabungkan IoT, AI, dan marketplace digital.

## Struktur Monorepo

```
agri-automation-system/
├── backend/          # FastAPI + PostgreSQL + MQTT
├── frontend-web/     # Next.js (dashboard pembeli B2B & admin)
├── mobile/           # React Native + Expo (aplikasi petani)
├── iot/              # ESP32 firmware (PlatformIO)
├── ai/               # PyTorch CNN inference service
├── infra/            # Konfigurasi infrastruktur (Mosquitto, dll)
└── docker-compose.yml
```

## Quick Start (Docker)

```bash
# 1. Buat file env
cp backend/.env.example backend/.env
cp frontend-web/.env.local.example frontend-web/.env.local

# 2. Buat MQTT password (jalankan sekali)
docker run --rm -it eclipse-mosquitto:2 mosquitto_passwd -c /dev/stdout agri_iot
# Salin output ke infra/mosquitto/passwd

# 3. Jalankan semua service
docker-compose up -d

# Service:
# - Backend API:    http://localhost:8000
# - API Docs:       http://localhost:8000/docs
# - AI Service:     http://localhost:8001
# - Frontend Web:   http://localhost:3000
# - PostgreSQL:     localhost:5432
# - MQTT Broker:    localhost:1883
```

## Development per Komponen

### Backend
```bash
cd backend
python -m venv .venv && .venv\Scripts\activate   # Windows
pip install -r requirements.txt
cp .env.example .env                              # isi konfigurasi
uvicorn app.main:app --reload
```

### Frontend Web
```bash
cd frontend-web
npm install
cp .env.local.example .env.local
npm run dev
```

### Mobile
```bash
cd mobile
npm install
cp .env.example .env
npx expo start
```
> Ubah `EXPO_PUBLIC_API_URL` ke IP lokal komputer (bukan localhost).

### IoT (ESP32)
```bash
cd iot
# Install PlatformIO: https://platformio.org
# Edit src/config.h — isi WiFi & MQTT credentials
pio run --target upload
pio device monitor
```

### AI Service
```bash
cd ai
python -m venv .venv && .venv\Scripts\activate
pip install -r requirements.txt
# Training (opsional, butuh dataset):
python training/train_grading.py --data-dir data/grading
python training/train_disease.py --data-dir data/disease
# Jalankan inference server:
uvicorn ai.api.inference_server:app --port 8001 --reload
```

## Arsitektur Sistem

```
[Petani]
  └─ Mobile App (React Native)
       └─ REST API ──► Backend (FastAPI) ──► PostgreSQL
                                │
                                ├──► AI Service (PyTorch CNN)
                                │      ├── Grading (Grade A/B/C, EfficientNet-B0)
                                │      └── Diagnosis Penyakit
                                │
                                └──► MQTT Broker ◄── ESP32 IoT Node
                                         └── suhu, kelembapan, soil moisture, pH

[Pembeli B2B / Admin]
  └─ Web Dashboard (Next.js)
       └─ REST API ──► Backend (FastAPI)
```

## API Endpoints Utama

| Method | Path | Deskripsi |
|--------|------|-----------|
| POST | `/api/v1/auth/register` | Daftar akun |
| POST | `/api/v1/auth/login` | Login |
| GET | `/api/v1/sensors/nodes` | Daftar node IoT |
| GET | `/api/v1/sensors/nodes/{id}/readings` | Data sensor |
| POST | `/api/v1/ai/grade/{crop_id}` | Grading kualitas (upload foto) |
| POST | `/api/v1/ai/diagnose` | Diagnosis penyakit (upload foto) |
| GET | `/api/v1/marketplace/crops` | Katalog komoditas |
| POST | `/api/v1/transactions/orders` | Buat pesanan |
| GET | `/api/v1/marketplace/prices` | Harga komoditas |

Dokumentasi interaktif tersedia di `/docs` (Swagger UI).

## Tech Stack

| Komponen | Teknologi |
|----------|-----------|
| Backend | FastAPI, SQLAlchemy, PostgreSQL, aiomqtt |
| AI | PyTorch, EfficientNet-B0, torchvision |
| Frontend Web | Next.js 15, Tailwind CSS |
| Mobile | React Native, Expo |
| IoT | ESP32, PlatformIO, DHT22, MQTT (PubSubClient) |
| Infra | Docker, Mosquitto MQTT Broker |
