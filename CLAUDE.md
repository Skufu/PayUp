# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

PayUp is a full-stack expense-splitting application with React (PWA) frontend and Go backend.

**Start development:**
```bash
./dev.sh
```
This runs backend on :8080 and frontend on :5173.

**Environment setup:**
1. Copy `env.example` to `.env`
2. Minimum: `DATABASE_URL`, `JWT_SECRET`
3. Start Postgres: `docker compose -f backend/docker-compose.yml up -d`

**Documentation hub:** Start with `docs/REFERENCE.md` for a complete feature → code map.

## Essential Commands

### Backend (Go)

**Development:**
```bash
cd backend
go run ./cmd/api                    # Start API server
go test ./...                       # Run all tests
go test ./internal/balance/...      # Run specific package tests
```

**Database:**
```bash
cd backend
go run ./cmd/migrate/main.go up                      # Run migrations
go run ./cmd/migrate/main.go down                    # Rollback one migration
go run ./cmd/migrate/main.go status                  # Check migration status
sqlc generate                                        # Regenerate type-safe DB code
```

**Build:**
```bash
cd backend
docker build -t payup-api .
```

### Frontend (React + Vite)

**Development:**
```bash
cd frontend
npm run dev                         # Start dev server with HMR
npm run dev -- --host              # Expose on network
npm run lint                        # ESLint
npm run build                       # TypeScript check + Vite build
```

**Build:**
```bash
cd frontend
docker build -t payup-frontend .
```

### Docker Compose

```bash
# Backend + Frontend (requires external Postgres)
docker compose up --build

# Postgres only (for local dev)
docker compose -f backend/docker-compose.yml up -d
```

## Architecture Overview

### Tech Stack
- **Frontend:** React 19 + TypeScript + Vite + TailwindCSS + React Router 7 + TanStack React Query
- **Backend:** Go 1.24 + Gin HTTP framework + PostgreSQL + sqlc + Goose migrations
- **Auth:** JWT (15min access, 30-day refresh)
- **Optional:** Cloudinary (uploads), Web Push (VAPID), Google OAuth

### Monorepo Structure
```
/frontend          # React PWA
  /src/payup       # Main app code
    /api           # API client + React Query hooks
    /auth          # AuthProvider + token management
    /components    # UI components + modals
    /pages         # Route pages
    /push          # Push notification utilities
    /pwa           # Service worker setup
    /ui            # Reusable UI primitives
  /public/sw.js    # Service worker (offline + push)

/backend           # Go API
  /cmd/api         # HTTP server entrypoint
  /cmd/migrate     # Migration runner
  /internal
    /auth          # JWT tokens, password hashing, middleware
    /balance       # Balance calculation from expenses/splits
    /config        # Environment config loader
    /db            # Database connection + sqlc generated code
    /handlers      # HTTP route handlers (auth, groups, expenses, etc.)
    /middleware    # CORS, rate limiting, security headers, HTTPS enforcement
    /server        # Gin router setup
    /services      # Business logic (uploads, push)
  /migrations      # Goose SQL migration files
  /sql
    /schema.sql    # Full DB schema for sqlc
    /queries/      # Named SQL queries for sqlc

/docs              # Comprehensive documentation
```

### Key Architectural Patterns

**Backend:**
- **Dependency Injection:** `server.Deps` struct passed to all handlers (contains DB pool, sqlc queries, JWT issuer, etc.)
- **Handler Pattern:** Each domain (auth, groups, expenses, payments) has a handler struct with embedded dependencies
- **Middleware Chain:** Recovery → CORS → Security headers → Rate limit → Logging → HTTPS (order critical)
- **Rate Limiting Strategy:**
  - General endpoints: 60/min per IP
  - Login/register/OAuth: 5 per 15min per IP (credential-based auth)
  - Token refresh: 30 per 15min per IP (already authenticated, needs headroom for multi-tab users)
  - Payments: 20/hour per IP
  - All rate limiters return `X-RateLimit-*` headers for client visibility
- **sqlc Code Generation:** All database queries are in `sql/queries/*.sql` and generate type-safe Go code in `internal/db/sqlcdb/`

**Frontend:**
- **Auth Flow:** AuthProvider context wraps app; tokens in sessionStorage/localStorage
- **Token Refresh Strategy:**
  - **Proactive refresh:** Checks JWT expiration before each request; refreshes if expiring within 2 minutes
  - **Reactive fallback:** Still handles 401 errors as safety net (defense in depth)
  - **Refresh coordination:** Single shared promise prevents concurrent refreshes across tabs/requests
  - Access tokens: 15min lifetime, sessionStorage (cleared on tab close)
  - Refresh tokens: 30-day lifetime, localStorage (persists across sessions)
- **Data Fetching:** TanStack React Query with 30s stale time; custom hooks in `payup/api/` (useGroups, useExpenses, etc.)
- **Error Handling:** Exponential backoff with jitter for 429 errors (500ms to 30s, max 3 retries)
- **PWA Support:** Service worker registration, auto-update checks, offline capability, Web Push
- **Component Structure:** Modals for forms, page components for routing, reusable UI primitives

**Database:**
- **Migrations:** Goose format with `-- +goose Up`/`-- +goose Down`
- **Idempotency:** Use `IF NOT EXISTS` checks
- **Type Safety:** sqlc generates Go structs/interfaces from SQL queries
- **Financial Precision:** `pg_catalog.numeric` maps to Go `string` for exact decimal handling

## Common Development Workflows

### Adding a New Feature

1. **Database changes:**
   - Create migration: `backend/migrations/00X_feature_name.sql`
   - Update schema: `backend/sql/schema.sql`
   - Add queries: `backend/sql/queries/feature.sql`
   - Run: `go run ./cmd/migrate/main.go up && sqlc generate`

2. **Backend API:**
   - Write handler in `backend/internal/handlers/feature.go`
   - Add route in `backend/internal/server/server.go`
   - Add tests in `backend/internal/handlers/feature_test.go`

3. **Frontend integration:**
   - Create API hook in `frontend/src/payup/api/featureQueries.ts`
   - Update `frontend/src/payup/api/endpoints.ts`
   - Build UI component in `frontend/src/payup/components/`

4. **Testing:**
   - Backend: `cd backend && go test ./internal/handlers/...`
   - Frontend: Manual testing in dev mode

### Modifying Database Schema

**IMPORTANT:** Never manually edit `backend/internal/db/sqlcdb/*` - this is generated code.

1. Create a new migration file in `backend/migrations/`
2. Update `backend/sql/schema.sql` to match
3. Add/update queries in `backend/sql/queries/*.sql`
4. Run migrations: `go run ./cmd/migrate/main.go up`
5. Regenerate code: `sqlc generate` (from backend directory)
6. Update handlers to use new queries

### Understanding Existing Features

**Use the docs as your guide:**
- `docs/REFERENCE.md` - Feature → code mappings, API route table, glossary, common questions
- `docs/ARCHITECTURE.md` - System design, data flow diagrams
- `docs/API.md` - Request/response formats, rate limiting
- `docs/DATABASE.md` - Schema details, relationships, ERD
- `docs/FRONTEND.md` - React Query patterns, component structure, PWA
- `docs/BACKEND.md` - Handler patterns, middleware, dependency injection

**Key entrypoints:**
- Backend routes: `backend/internal/server/server.go`
- Backend main: `backend/cmd/api/main.go`
- Frontend app: `frontend/src/payup/PayUpApp.tsx`
- Frontend API: `frontend/src/payup/api/client.ts`
- DB schema: `backend/sql/schema.sql`

## Critical Conventions

### Security
- Never hardcode secrets - use environment variables
- JWT tokens validated via `auth.Middleware` wrapper
- Password hashing via bcrypt
- CORS origins configurable for production
- HTTPS enforced in production middleware

### Rate Limiting
- **Different limits for different security profiles:**
  - Credential-based auth (login/register): 5/15min (high risk)
  - Token refresh: 30/15min (already authenticated, needs multi-tab support)
  - General API: 60/min (normal operations)
  - Payments: 20/hour (financial operations)
- **When adding new endpoints:** Consider security risk - use `AuthRateLimit()` for credential entry, `RefreshRateLimit()` for token refresh, `PaymentRateLimit()` for financial operations
- **Rate limit headers:** All limiters return `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `Retry-After`
- **Frontend handling:** Client automatically retries 429 errors with exponential backoff (implemented in `client.ts`)

### Database
- All queries must go through sqlc - no raw SQL in handlers
- Use `pg_catalog.numeric` (maps to Go `string`) for monetary amounts
- Migrations are immutable - create new ones to fix issues
- Always include `-- +goose Down` for reversibility

### Code Style
- Backend: Standard Go conventions, exported names for public API
- Frontend: Functional components, hooks-based state management
- Never commit generated code changes from `internal/db/sqlcdb/` without regenerating
- Avoid over-engineering - keep solutions simple and focused on requirements

### Testing
- Backend tests in `*_test.go` files alongside source
- Test balance calculations: `backend/internal/balance/calc_test.go`
- Test handlers: `backend/internal/handlers/*_test.go`
- Run tests before committing: `go test ./...`

## Environment Variables Reference

**Backend (required):**
- `DATABASE_URL` - Postgres connection string
- `JWT_SECRET` - Secret for signing JWT tokens
- `PORT` - HTTP server port (default: 8080)

**Backend (optional):**
- `ACCESS_TOKEN_TTL_MINUTES` - Access token lifetime (default: 15)
- `REFRESH_TOKEN_TTL_HOURS` - Refresh token lifetime (default: 720)
- `CORS_ORIGINS` - Comma-separated allowed origins (e.g., `https://app.vercel.app,https://domain.com`)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` - For QR/payment proof uploads
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` - For Web Push notifications
- `GOOGLE_CLIENT_ID` - For Google OAuth integration
- `GIN_MODE` - `debug` or `release`
- `DB_MAX_CONNS` - Max DB connections (default: 25)

**Frontend (optional):**
- `VITE_API_BASE_URL` - API base URL (defaults to relative URLs for Vite proxy)
- `VITE_VAPID_PUBLIC_KEY` - Required for browser push subscriptions
- `VITE_GOOGLE_CLIENT_ID` - For Google OAuth button

> **Note:** `CORS_ORIGINS` and `DB_MAX_CONNS` are documented above but are not currently implemented in `backend/internal/config/config.go`. They require code changes to take effect.

## Deployment

**Frontend (Vercel):**
- Auto-deploys on push to main
- Build command: `npm run build`
- Set `VITE_GOOGLE_CLIENT_ID` and `VITE_API_BASE_URL` in Vercel dashboard

**Backend (Render):**
- Docker deployment via `render.yaml`
- Set `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS`, OAuth keys in Render dashboard
- Health check: `GET /health`

**Database:**
- Use managed Postgres (Neon, Supabase, Render Postgres)
- Run migrations before deployment: `goose postgres "$DATABASE_URL" up`

See `docs/DEPLOYMENT.md` for detailed deployment instructions.

## Troubleshooting

**"Cannot find module" errors in frontend:**
- Run `npm install` in frontend directory
- Check imports use correct paths (e.g., `@/` is not configured - use relative paths)

**Database connection errors:**
- Verify `DATABASE_URL` in `.env`
- Ensure Postgres is running: `docker compose -f backend/docker-compose.yml ps`
- Check migrations are up: `goose postgres "$DATABASE_URL" status`

**CORS errors in browser:**
- Set `CORS_ORIGINS` in backend `.env` to include frontend URL
- In dev, Vite proxy handles this automatically

**"sqlc: no such file or directory":**
- Install sqlc: `go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest`
- Ensure `$GOPATH/bin` is in your `$PATH`

**JWT token expired errors:**
- Tokens auto-refresh **proactively** (before expiration) and reactively (on 401)
- Check browser console for refresh errors
- Verify `ACCESS_TOKEN_TTL_MINUTES` setting (default 15min)
- Clear sessionStorage + localStorage and re-login if refresh fails

**Rate limit errors (429):**
- Frontend automatically retries with exponential backoff
- Check `X-RateLimit-*` headers in browser dev tools for details
- Login/register: 5 attempts per 15min (strict for security)
- Token refresh: 30 attempts per 15min (lenient for multi-tab users)
- If hitting refresh limits, check for bugs causing excessive refresh attempts

## API Route Reference

See `docs/REFERENCE.md` for complete list. Key routes:

**Auth:**
- `POST /v1/auth/register` - Create account
- `POST /v1/auth/login` - Login
- `POST /v1/auth/refresh` - Refresh access token
- `GET /v1/auth/me` - Get current user
- `PATCH /v1/auth/profile` - Update profile

**Groups:**
- `GET /v1/groups` - List user's groups
- `POST /v1/groups` - Create group
- `POST /v1/groups/:id/invite` - Generate invite code
- `POST /v1/groups/join/:code` - Join via code

**Expenses:**
- `GET /v1/groups/:id/expenses` - List group expenses
- `POST /v1/groups/:id/expenses` - Create expense
- `DELETE /v1/expenses/:id` - Delete expense

**Balances & Payments:**
- `GET /v1/groups/:id/balances` - Get computed balances
- `POST /v1/payments` - Create payment
- `PATCH /v1/payments/:id/approve` - Approve payment
- `PATCH /v1/payments/:id/reject` - Reject payment

**Notifications:**
- `POST /v1/nudges` - Send nudge
- `GET /v1/nudges` - List nudges
- `PATCH /v1/nudges/:id/read` - Mark as read

**Push:**
- `POST /v1/push/subscribe` - Subscribe to push
- `DELETE /v1/push/unsubscribe` - Unsubscribe

**OCR:**
- `POST /v1/ocr` - Perform OCR on receipt image

All authenticated routes require `Authorization: Bearer <token>` header.
