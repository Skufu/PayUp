# Architecture

## Components

- **Frontend**: `frontend/` (React 19 + Vite + Tailwind + React Query)
- **Backend API**: `backend/` (Go + Gin)
- **Database**: Postgres 16
- **Uploads (optional)**: Cloudinary (QR images, payment proof)
- **Push (optional)**: Web Push (VAPID) via `webpush-go`

## Runtime flow (happy path)

1. **User registers / logs in**
   - Frontend calls `POST /v1/auth/register` or `POST /v1/auth/login`
   - Backend returns `{ user, token: { accessToken, refreshToken } }`
   - Frontend stores tokens in localStorage (`frontend/src/payup/api/client.ts`)

2. **Authenticated requests**
   - Frontend includes `Authorization: Bearer <accessToken>` automatically
   - Backend validates JWT via `auth.Middleware` (`backend/internal/auth/middleware.go`)

3. **Groups, expenses, balances**
   - Groups and membership are enforced server-side (member checks)
   - Expenses store splits, balances are computed from expenses

4. **Payments and settlement**
   - A receiver approves/rejects payments
   - On approval, backend creates a transfer-type expense to impact balances

5. **Push notifications (optional)**
   - Browser subscribes via Service Worker + VAPID public key
   - Backend stores subscription and can send pushes (nudges trigger pushes)

## Source-of-truth files

- **Routes**: `backend/internal/server/server.go`
- **Auth**: `backend/internal/auth/*`, `backend/internal/handlers/auth.go`
- **DB**: `backend/sql/schema.sql`, `backend/sql/queries/*.sql`, `backend/migrations/*.sql`
- **Frontend app orchestration**: `frontend/src/payup/PayUpApp.tsx`

## Failure handling and edge cases (current behavior)

- **Access token expiry**: frontend attempts refresh once on 401 (`frontend/src/payup/api/client.ts`)
- **Missing upload provider**: backend treats uploads as optional; returns 503 if upload endpoint is hit without provider
- **Missing VAPID config**: backend push send no-ops; subscribe endpoint still stores subscriptions
- **Authz**: most group-scoped endpoints check membership; payments approval requires receiver match
