# PayUp

Split expenses, track balances, settle up.

## Documentation

### Technical Guides
- [AI Index](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/AI_INDEX.md) (start here)
- [Architecture](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/ARCHITECTURE.md)
- [Deployment Guide](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/technical/deployment-quickstart.md)
- [Docker Setup](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/technical/docker.md)
- [API Reference](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/API.md)

### Detailed Modules
- [Frontend docs](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/FRONTEND.md) | [Backend docs](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/BACKEND.md)
- [Database Schema](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/DATABASE.md)
- [PWA Guide](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/guides/pwa-guide.md)
- [Push Notifications Plan](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/plans/push-notifications.md)

## Repo layout

- `frontend/`: React + Vite PWA UI
- `backend/`: Go (Gin) API + Postgres (sqlc + migrations)
- `docker-compose.yml`: build+run frontend+backend containers (expects an external Postgres)
- `backend/docker-compose.yml`: Postgres for local dev
- `env.example`: env vars reference
- `dev.sh`: runs backend (Go) + frontend (Vite) for local dev

## Local development

### Quick Start (Recommended)

**With Make (Linux/macOS):**
```bash
make setup   # First-time setup
make dev     # Start dev server
```

**With Bash (Windows/Git Bash):**
```bash
./setup.sh   # First-time setup
./dev.sh     # Start dev server
```

Open http://localhost:5173 in your browser.

### Available Commands

Run `make help` to see all commands:

| Command | Description |
|---------|-------------|
| `make setup` | First-time setup |
| `make dev` | Start dev server (backend + frontend) |
| `make dev-docker` | Start full stack via Docker Compose |
| `make db` / `make db-stop` | Start/stop Postgres |
| `make migrate` | Run database migrations |
| `make test` | Run backend tests |
| `make lint` | Run linters |
| `make clean` | Stop containers and remove volumes |

### Manual Setup (Alternative)

<details>
<summary>Click to expand manual setup steps</summary>

#### 1) Environment variables

Copy and edit:

- `env.example` → `.env`

Minimum:
- `DATABASE_URL` (Postgres)
- `JWT_SECRET`

Optional:
- `CLOUDINARY_*` (uploads: QR + payment proof)
- `VAPID_*` (push notifications)
- `VITE_API_BASE_URL` (frontend API base; defaults to relative)

#### 2) Start Postgres

From repo root:

```bash
docker compose -f backend/docker-compose.yml up -d
```

#### 3) Start app (backend + frontend)

From repo root:

```bash
./dev.sh
```

What it does:
- Backend: `go run ./backend/cmd/api`
- Frontend: `npm --prefix ./frontend run dev -- --host`

</details>


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
