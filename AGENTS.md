# AGENTS.md — Agri AIoT Platform

This file guides AI coding agents working on the Agri Agriculture Intelligence of Things platform.

## Project Overview

Monorepo for an integrated horticulture platform combining IoT, AI, and B2B marketplace.

## Repository Structure

```
agri-automation-system/
├── backend/          # FastAPI + PostgreSQL + MQTT — Python
├── frontend-web/     # Next.js 15 — dashboard for B2B buyers & admin
├── mobile/           # React Native + Expo — farmer mobile app
├── iot/              # ESP32 firmware (PlatformIO)
├── ai/               # PyTorch CNN inference service
├── infra/            # Infrastructure config (Mosquitto, etc.)
└── docker-compose.yml
```

## Tech Stack

| Component      | Technology                                      |
|----------------|--------------------------------------------------|
| Backend        | FastAPI, SQLAlchemy, PostgreSQL, aiomqtt         |
| AI             | PyTorch, EfficientNet-B0, torchvision            |
| Frontend Web   | Next.js 15, Tailwind CSS, TypeScript             |
| Mobile         | React Native, Expo                               |
| IoT            | ESP32, PlatformIO, DHT22, MQTT (PubSubClient)    |
| Infra          | Docker, Mosquitto MQTT Broker                    |

## Language & Conventions

- **UI text:** Indonesian (Bahasa). All user-facing strings in Indonesian.
- **Code:** English. Variable names, comments, commit messages in English.
- **Commit style:** Conventional Commits — `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`

## Frontend Web Conventions

- **App Router** — Next.js 15 App Directory structure
- **Tailwind CSS** — custom `agri-*` color tokens in tailwind.config.ts
- **State:** Zustand for client state, @tanstack/react-query for server state
- **Forms:** react-hook-form + zod validation
- **API client:** Axios instance in `src/lib/api.ts` with auto Bearer token injection
- **Icons:** lucide-react
- **Auth:** JWT stored in localStorage, auto-redirect on 401
- **Folder structure:**
  - `src/app/` — page routes (App Router)
  - `src/lib/` — utilities and API client
  - `src/types/` — shared TypeScript types

## Backend Conventions

- FastAPI with SQLAlchemy async
- Route prefix: `/api/v1/`
- Pydantic schemas in `app/schemas/`
- Services in `app/services/`

## Development Workflow

1. Branch from `main`: `git checkout -b feat/description`
2. Make changes, commit conventionally
3. Push and create PR against `main`
4. All PRs should be reviewed before merging

## Build & Run

```bash
# Frontend web
cd frontend-web && npm install && npm run dev

# Backend
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload

# Docker (all services)
docker-compose up -d
```
