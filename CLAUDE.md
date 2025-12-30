# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

PayUp is a full-stack expense-splitting application with React (PWA) frontend and Go backend.

**Start development:**
```bash
make setup   # First-time setup (creates .env, installs deps, starts db, runs migrations)
make dev     # Start development server (backend + frontend)
```
Or use bash scripts directly:
```bash
./setup.sh   # First-time setup
./dev.sh     # Start development (backend on :8080, frontend on :5173)
```

**Environment setup:**
1. Copy `env.example` to `.env`
2. Minimum: `DATABASE_URL`, `JWT_SECRET`
3. Start Postgres: `docker compose -f backend/docker-compose.yml up -d`

**Documentation hub:** Start with `docs/AI_INDEX.md` for a complete feature → code map.

## Essential Commands

### Makefile Commands (Recommended)

Run `make help` to see all available commands:

```bash
make setup          # First-time setup (creates .env, installs deps, starts db, runs migrations)
make dev            # Start development server (backend + frontend)
make dev-docker     # Start full stack via Docker Compose

make db             # Start Postgres container
make db-stop        # Stop Postgres container
make db-reset       # Reset database (delete volume and restart)

make migrate        # Run database migrations
make migrate-status # Show migration status

make test           # Run backend tests
make lint           # Run linters (backend + frontend)

make clean          # Stop all containers and remove volumes
```

### Backend (Go)

**Development:**
```bash
cd backend
go run ./cmd/api                    # Start API server
go run ./cmd/migrate up             # Run migrations
go test ./...                       # Run all tests
go test ./internal/balance/...      # Run specific package tests
```

**Database:**
```bash
cd backend
go run ./cmd/migrate up             # Run migrations
go run ./cmd/migrate down           # Rollback one migration
go run ./cmd/migrate status         # Check migration status
sqlc generate                       # Regenerate type-safe DB code
```

**Build:**
```bash
cd backend
go build ./cmd/api                  # Build API binary
docker build -t payup-api .         # Build Docker image
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
# Full stack (dev mode with hot reload)
docker compose -f docker-compose.dev.yml up --build

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
    /constants     # Application constants
    /hooks         # Custom React hooks
    /mock          # Mock data for development
    /pages         # Route pages
    /push          # Push notification utilities
    /pwa           # Service worker setup
    /ui            # Reusable UI primitives
    /utils         # Utility functions
  /public/sw.js    # Service worker (offline + push)

/backend           # Go API
  /cmd/api         # HTTP server entrypoint
  /cmd/migrate     # Migration runner
  /internal
    /auth          # JWT tokens, password hashing, middleware
    /balance       # Balance calculation from expenses/splits
    /config        # Environment config loader
    /db            # Database connection + sqlc generated code
    /events        # Server-sent events (SSE) hub for real-time updates
    /handlers      # HTTP route handlers (auth, groups, expenses, etc.)
    /logger        # Structured logging
    /middleware    # CORS, rate limiting, security headers, HTTPS enforcement
    /server        # Gin router setup
    /services      # Business logic (uploads, push)
    /util          # Utility functions (context, money, pointers)
  /migrations      # Goose SQL migration files
  /scripts         # Migration helper scripts
  /sql
    /schema.sql    # Full DB schema for sqlc
    /queries/      # Named SQL queries for sqlc (users, groups, expenses, etc.)
  /tools           # Go tool dependencies

/docs              # Comprehensive documentation
  AI_INDEX.md      # AI-friendly feature map (start here)
  ARCHITECTURE.md  # High-level architecture and flow
  API.md           # API reference
  BACKEND.md       # Backend implementation details
  DATABASE.md      # Database schema and relationships
  DEPLOYMENT.md    # Deployment instructions
  FRONTEND.md      # Frontend architecture and patterns

/.github/workflows # CI/CD pipelines
  ci.yml           # Continuous integration (tests, linting, builds)
  deploy.yml       # Deployment workflows
```

### Key Architectural Patterns

**Backend:**
- **Dependency Injection:** `server.Deps` struct passed to all handlers (contains DB pool, sqlc queries, JWT issuer, EventHub, etc.)
- **Handler Pattern:** Each domain (auth, groups, expenses, payments) has a handler struct with embedded dependencies
- **Middleware Chain:** Recovery → Request ID → CORS → Security headers → Rate limit → Structured logging → HTTPS (order critical)
- **Rate Limiting Strategy:**
  - General endpoints: 60/min per IP
  - Login/register/OAuth: 5 per 15min per IP (credential-based auth)
  - Token refresh: 30 per 15min per IP (already authenticated, needs headroom for multi-tab users)
  - Payments: 20/hour per IP
  - Profile views: 30/min per IP
  - All rate limiters return `X-RateLimit-*` headers for client visibility
- **Real-time Updates:** Server-sent events (SSE) hub (`internal/events/hub.go`) broadcasts group updates to connected clients
- **Activity Logging:** All group actions (expenses, payments, member changes) are logged to `activity_log` table
- **sqlc Code Generation:** All database queries are in `sql/queries/*.sql` and generate type-safe Go code in `internal/db/sqlcdb/`
- **Structured Logging:** Request ID tracking, structured JSON logs via `internal/logger/logger.go`

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
   - Follow Goose format with `-- +goose Up` and `-- +goose Down` markers
   - Update schema: `backend/sql/schema.sql`
   - Add queries: `backend/sql/queries/feature.sql`
   - Run: `make migrate && cd backend && sqlc generate`
   - Or: `go run ./cmd/migrate up && sqlc generate` (from backend directory)

2. **Backend API:**
   - Write handler in `backend/internal/handlers/feature.go`
   - Add route in `backend/internal/server/server.go`
   - Consider rate limiting for the endpoint
   - Add tests in `backend/internal/handlers/feature_test.go`
   - If real-time updates needed, emit events via `EventHub`

3. **Frontend integration:**
   - Create API hook in `frontend/src/payup/api/featureQueries.ts`
   - Update `frontend/src/payup/api/endpoints.ts`
   - Build UI component in `frontend/src/payup/components/`
   - Use React Query for data fetching and caching

4. **Testing:**
   - Backend: `cd backend && go test ./internal/handlers/...`
   - Frontend: Manual testing in dev mode
   - Verify CI passes: checks formatting, linting, tests, and builds

### Modifying Database Schema

**IMPORTANT:** Never manually edit `backend/internal/db/sqlcdb/*` - this is generated code.

1. Create a new migration file in `backend/migrations/`
2. Update `backend/sql/schema.sql` to match
3. Add/update queries in `backend/sql/queries/*.sql`
4. Run migrations: `goose postgres "$DATABASE_URL" up`
5. Regenerate code: `sqlc generate` (from backend directory)
6. Update handlers to use new queries

### Understanding Existing Features

**Use the docs as your guide:**
- `docs/AI_INDEX.md` - Feature → code mappings, API route table, search recipes
- `docs/ARCHITECTURE.md` - High-level flow, source-of-truth files
- `docs/API.md` - Request/response formats
- `docs/DATABASE.md` - Schema details, relationships
- `docs/FRONTEND.md` - React Query patterns, component structure
- `docs/BACKEND.md` - Handler patterns, middleware details

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

### CI/CD
- **GitHub Actions workflows** in `.github/workflows/`
  - `ci.yml`: Runs on all branches - backend tests, linting, formatting checks, sqlc verification, frontend linting and builds
  - `deploy.yml`: Deployment workflows
- **Backend CI checks:**
  - Go module verification
  - `gofmt` formatting check
  - `go vet` static analysis
  - `staticcheck` linter
  - sqlc generated code verification (fails if out of sync)
  - Race detector enabled tests with coverage
  - Docker build verification
- **Frontend CI checks:**
  - ESLint
  - TypeScript compilation
  - Production build
- **Concurrency:** Automatically cancels in-progress runs when new commits are pushed to the same branch

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

## Additional Features

### Password Reset
- Users can request password reset via email
- `POST /v1/auth/reset-request` initiates the reset flow
- `POST /v1/auth/reset` completes the reset with token
- Requires email sending service configuration (optional)

### Google OAuth
- Sign in with Google is available
- `POST /v1/auth/google` handles OAuth token exchange
- Requires `GOOGLE_CLIENT_ID` environment variable
- Frontend uses `@react-oauth/google` package

### Payment QR Codes
- Users can store payment QR codes for easy sharing
- Supports multiple QR codes with primary designation
- Phone number can be associated with QR codes
- QR images uploaded to Cloudinary (if configured)

### Activity Log
- All group actions are automatically logged
- View via `GET /v1/groups/:id/activity`
- Tracks expenses, payments, member changes, etc.
- Useful for audit trails and user transparency

### Real-time Updates
- Server-sent events (SSE) for live group updates
- Connect via `GET /v1/groups/:id/events` with auth token in query param
- Broadcasts expense changes, payments, and member updates
- Frontend can subscribe to receive instant notifications

### Invite System
- Generate shareable invite codes with expiration
- Preview invites without authentication
- Automatic cleanup job removes expired invites
- Configurable invite limits and expiration times

## Troubleshooting

**"Cannot find module" errors in frontend:**
- Run `npm install` in frontend directory
- Check imports use correct paths (e.g., `@/` is not configured - use relative paths)

**Database connection errors:**
- Verify `DATABASE_URL` in `.env`
- Ensure Postgres is running: `docker compose -f backend/docker-compose.yml ps`
- Check migrations are up: `make migrate-status` or `go run ./cmd/migrate status`

**CORS errors in browser:**
- Set `CORS_ORIGINS` in backend `.env` to include frontend URL
- In dev, Vite proxy handles this automatically

**"sqlc: no such file or directory":**
- Install sqlc: `go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest`
- Ensure `$GOPATH/bin` is in your `$PATH`

**sqlc generated code out of sync:**
- Run `sqlc generate` from backend directory after any schema or query changes
- CI will fail if generated code doesn't match queries
- Never manually edit files in `internal/db/sqlcdb/`

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
- Payments: 20/hour (strict for financial operations)
- If hitting refresh limits, check for bugs causing excessive refresh attempts

**Go build errors:**
- Ensure Go 1.24+ is installed: `go version`
- Run `go mod download` to fetch dependencies
- Check `go.mod` and `go.sum` are not corrupted

**Frontend build errors:**
- Ensure Node.js 22+ is installed: `node --version`
- Delete `node_modules` and run `npm install` again
- Check for TypeScript errors: `npm run build`
- Verify all environment variables are set correctly

## API Route Reference

See `docs/AI_INDEX.md` for complete list. Key routes:

**Auth:**
- `POST /v1/auth/register` - Create account
- `POST /v1/auth/login` - Login
- `POST /v1/auth/google` - Google OAuth authentication
- `POST /v1/auth/refresh` - Refresh access token
- `POST /v1/auth/reset-request` - Request password reset
- `POST /v1/auth/reset` - Reset password
- `GET /v1/auth/me` - Get current user
- `PATCH /v1/auth/profile` - Update profile
- `GET /v1/users/:id/profile` - Get user public profile

**Payment QR Codes:**
- `GET /v1/auth/payment-qr` - List payment QR codes
- `POST /v1/auth/payment-qr` - Add payment QR code
- `DELETE /v1/auth/payment-qr/:id` - Delete payment QR code
- `PATCH /v1/auth/payment-qr/:id/primary` - Set as primary
- `PATCH /v1/auth/payment-qr/:id/phone` - Update phone number

**Groups:**
- `GET /v1/groups` - List user's groups
- `POST /v1/groups` - Create group
- `GET /v1/groups/:id` - Get group details
- `POST /v1/groups/:id/invite` - Generate invite code
- `POST /v1/groups/join/:code` - Join via code
- `DELETE /v1/groups/:id/leave` - Leave group
- `DELETE /v1/groups/:id/members/:userId` - Remove member

**Invites:**
- `GET /v1/invites/:code/preview` - Preview invite (public, no auth)

**Expenses:**
- `GET /v1/groups/:id/expenses` - List group expenses
- `POST /v1/groups/:id/expenses` - Create expense
- `PATCH /v1/expenses/:id` - Update expense
- `DELETE /v1/expenses/:id` - Delete expense

**Balances & Payments:**
- `GET /v1/groups/:id/balances` - Get computed balances
- `POST /v1/payments` - Create payment
- `GET /v1/payments` - List payments
- `PATCH /v1/payments/:id/approve` - Approve payment
- `PATCH /v1/payments/:id/reject` - Reject payment
- `POST /v1/payments/upload-proof` - Upload payment proof

**Notifications:**
- `POST /v1/nudges` - Send nudge
- `GET /v1/nudges` - List nudges
- `GET /v1/nudges/unread-count` - Get unread count
- `PATCH /v1/nudges/:id/read` - Mark as read
- `POST /v1/nudges/mark-all-read` - Mark all as read

**Push:**
- `POST /v1/push/subscribe` - Subscribe to push
- `DELETE /v1/push/unsubscribe` - Unsubscribe

**Activity:**
- `GET /v1/groups/:id/activity` - Get group activity log

**Real-time Events:**
- `GET /v1/groups/:id/events` - Server-sent events (SSE) stream for group updates

All authenticated routes require `Authorization: Bearer <token>` header.
