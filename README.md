# PayUp

Split expenses, track balances, settle up.

## Quick links

- `docs/AI_INDEX.md` (start here)
- `docs/ARCHITECTURE.md`
- `docs/FRONTEND.md`
- `docs/BACKEND.md`
- `docs/API.md`
- `docs/DATABASE.md`

## Repo layout

- `frontend/`: React + Vite PWA UI
- `backend/`: Go (Gin) API + Postgres (sqlc + migrations)
- `docker-compose.yml`: build+run frontend+backend containers (expects an external Postgres)
- `backend/docker-compose.yml`: Postgres for local dev
- `env.example`: env vars reference
- `dev.sh`: runs backend (Go) + frontend (Vite) for local dev

## Local development

### 1) Environment variables

Copy and edit:

- `env.example` → `.env`

Minimum:
- `DATABASE_URL` (Postgres)
- `JWT_SECRET`

Optional:
- `CLOUDINARY_*` (uploads: QR + payment proof)
- `VAPID_*` (push notifications)
- `VITE_API_BASE_URL` (frontend API base; defaults to relative)

### 2) Start Postgres

From repo root:

```bash
docker compose -f backend/docker-compose.yml up -d
```

### 3) Start app (backend + frontend)

From repo root:

```bash
./dev.sh
```

What it does:
- Backend: `go run ./backend/cmd/api`
- Frontend: `npm --prefix ./frontend run dev -- --host`

## Docker

### Frontend + backend containers

```bash
docker compose up --build
```

Notes:
- Root `docker-compose.yml` does **not** include Postgres; it expects `DATABASE_URL` to point to a reachable Postgres instance.
- For local Docker, you can run Postgres via `backend/docker-compose.yml` and point `DATABASE_URL` at it.

## Health check

- `GET /health`
