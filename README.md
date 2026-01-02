# PayUp

Split expenses, track balances, settle up.

---

## Keywords

`expense splitting` `group expenses` `bill splitting` `balance tracking` `payment settlement` `debt management` `nudge reminders` `PWA` `React` `Go` `PostgreSQL`

---

## What is PayUp?

PayUp is a full-stack expense-splitting application for groups. Key features:

- **Groups**: Create shared wallets with friends, family, or roommates
- **Expenses**: Track who paid and split costs equally, by exact amounts, or percentages
- **Balances**: Real-time calculation of who owes whom
- **Payments**: Settle debts with GCash/Maya QR codes and approval flow
- **Nudges**: Send reminders to debtors with push notifications
- **PWA**: Install on mobile for offline access

---

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Group** | A collection of users sharing expenses |
| **Expense** | A cost paid by one member, split among participants |
| **Split** | How an expense is divided (equal, exact, percentage, hybrid) |
| **Balance** | Net amount owed/owing within a group |
| **Payment** | Settlement from debtor to creditor |
| **Nudge** | Payment reminder notification |
| **Transfer** | Special expense created on payment approval |

---

## Documentation

| Document | Purpose |
|----------|---------|
| [Reference Guide](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/REFERENCE.md) | Quick navigation, feature→code map, API routes |
| [CLAUDE.md](file:///c:/Users/ADRIAN/Github/skufu/PayUp/CLAUDE.md) | Comprehensive development guide |
| [Architecture](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/ARCHITECTURE.md) | System design and data flow |
| [API Reference](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/API.md) | Request/response formats |
| [Database](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/DATABASE.md) | Schema and relationships |
| [Frontend](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/FRONTEND.md) | React patterns and structure |
| [Backend](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/BACKEND.md) | Go/Gin patterns |
| [Deployment](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/DEPLOYMENT.md) | Vercel/Render setup |
| [UX Spec](file:///c:/Users/ADRIAN/Github/skufu/PayUp/UX_SPEC.md) | UI/UX patterns and decisions |

---

## Directory Structure

```
PayUp/
├── frontend/                 # React 19 + Vite PWA
│   ├── src/payup/
│   │   ├── api/              # API client and endpoints
│   │   ├── auth/             # Authentication provider
│   │   ├── components/       # UI components and modals
│   │   ├── pages/            # Route pages (landing, auth, join)
│   │   ├── push/             # Push notification manager
│   │   ├── utils/            # Utilities (receipt parser, etc.)
│   │   └── PayUpApp.tsx      # Main app component
│   └── public/sw.js          # Service worker (offline + push)
│
├── backend/                  # Go + Gin API
│   ├── cmd/api/              # Server entrypoint
│   ├── cmd/migrate/          # Migration runner
│   ├── internal/
│   │   ├── auth/             # JWT tokens and middleware
│   │   ├── balance/          # Balance calculation logic
│   │   ├── db/sqlcdb/        # Generated database code (sqlc)
│   │   ├── events/           # SSE event hub
│   │   ├── handlers/         # HTTP route handlers
│   │   ├── middleware/       # CORS, rate limiting, security
│   │   └── services/         # Upload service (Cloudinary)
│   ├── migrations/           # Goose SQL migrations
│   └── sql/
│       ├── schema.sql        # Full database schema
│       └── queries/          # Named SQL queries for sqlc
│
├── docs/                     # Documentation
└── docker-compose.yml        # Container orchestration
```

---

## Quick Start

### With Make (Linux/macOS)
```bash
make setup   # First-time setup
make dev     # Start dev server
```

### With Bash (Windows/Git Bash)
```bash
./setup.sh   # First-time setup
./dev.sh     # Start dev server
```

Open http://localhost:5173 in your browser.

---

## Available Commands

| Command | Description |
|---------|-------------|
| `make setup` | First-time setup (install deps, run migrations) |
| `make dev` | Start dev server (backend :8080 + frontend :5173) |
| `make dev-docker` | Start full stack via Docker Compose |
| `make db` / `make db-stop` | Start/stop Postgres container |
| `make migrate` | Run database migrations |
| `make test` | Run backend tests |
| `make lint` | Run linters |
| `make clean` | Stop containers and remove volumes |

---

## Manual Setup

<details>
<summary>Click to expand manual setup steps</summary>

### 1. Environment Variables

Copy and edit:
- `env.example` → `.env`

Required:
- `DATABASE_URL` (PostgreSQL connection string)
- `JWT_SECRET` (secret for signing tokens)

Optional:
- `CLOUDINARY_*` (for QR/proof uploads)
- `VAPID_*` (for push notifications)
- `GOOGLE_CLIENT_ID` (for Google OAuth)

### 2. Start Postgres

```bash
docker compose -f backend/docker-compose.yml up -d
```

### 3. Start App

```bash
./dev.sh
```

This runs:
- Backend: `go run ./backend/cmd/api` (port 8080)
- Frontend: `npm --prefix ./frontend run dev` (port 5173)

</details>

---

## Docker

### Frontend + Backend Containers

```bash
docker compose up --build
```

> **Note**: Root `docker-compose.yml` expects an external Postgres. Set `DATABASE_URL` to a reachable instance.

---

## Health Check

```bash
curl http://localhost:8080/health
# Returns: {"status":"ok"}
```

---

## See Also

- [Reference Guide](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/REFERENCE.md) – Quick navigation and search
- [CLAUDE.md](file:///c:/Users/ADRIAN/Github/skufu/PayUp/CLAUDE.md) – Comprehensive development guide
- [PWA Guide](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/guides/pwa-guide.md) – Progressive Web App setup
