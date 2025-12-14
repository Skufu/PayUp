# AI Index (start here)

This page is an **AI-friendly map** of PayUp: where to look, what to search, and the canonical entrypoints.

## High-signal entrypoints

- **Backend router / API surface**: `backend/internal/server/server.go`
- **Backend main**: `backend/cmd/api/main.go`
- **Frontend app root**: `frontend/src/payup/PayUpApp.tsx`
- **Frontend API client**: `frontend/src/payup/api/client.ts`
- **Frontend endpoint wrappers**: `frontend/src/payup/api/endpoints.ts`
- **DB schema (sqlc)**: `backend/sql/schema.sql`
- **Migrations**: `backend/migrations/*.sql`
- **sqlc queries**: `backend/sql/queries/*.sql`

## Quick feature → code map

- **JWT auth / tokens**: `backend/internal/auth/*` and `backend/internal/handlers/auth.go`
- **Groups + invites**: `backend/internal/handlers/groups.go`
- **Expenses + splits**: `backend/internal/handlers/expenses.go`
- **Balances computation**: `backend/internal/handlers/balances.go`, `backend/internal/balance/*`
- **Payments + approval flow**: `backend/internal/handlers/payments.go`
- **Nudges + push trigger**: `backend/internal/handlers/nudges.go`
- **Push subscriptions + webpush**: `backend/internal/handlers/push.go`
- **Uploads (Cloudinary)**: `backend/internal/services/upload.go`
- **Service worker + push UI**: `frontend/public/sw.js`, `frontend/src/payup/push/pushManager.ts`

## API route table (source of truth)

Defined in `backend/internal/server/server.go`:

- `GET /health`
- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `POST /v1/auth/refresh`
- `GET /v1/auth/me`
- `PATCH /v1/auth/profile`
- `GET /v1/users/:id/profile`
- `GET /v1/groups`
- `POST /v1/groups`
- `GET /v1/groups/:id`
- `POST /v1/groups/:id/invite`
- `POST /v1/groups/join/:code`
- `GET /v1/groups/:id/expenses`
- `POST /v1/groups/:id/expenses`
- `DELETE /v1/expenses/:id`
- `GET /v1/groups/:id/balances`
- `POST /v1/payments`
- `GET /v1/payments`
- `PATCH /v1/payments/:id/approve`
- `PATCH /v1/payments/:id/reject`
- `POST /v1/payments/upload-proof`
- `POST /v1/nudges`
- `GET /v1/nudges`
- `GET /v1/nudges/unread-count`
- `PATCH /v1/nudges/:id/read`
- `POST /v1/nudges/mark-all-read`
- `POST /v1/push/subscribe`
- `DELETE /v1/push/unsubscribe`

See `docs/API.md` for request/response notes.

## Database tables (source of truth)

See `backend/sql/schema.sql` and `docs/DATABASE.md`.

Tables:
- `users`
- `groups`
- `group_members`
- `expenses`
- `expense_splits`
- `payments`
- `group_invites`
- `nudges`
- `push_subscriptions`

## Search recipes (semantic-search-friendly prompts)

Use prompts like:
- “Where are HTTP routes registered?” → `backend/internal/server/server.go`
- “How does refresh token work?” → `backend/internal/auth/tokens.go`, `backend/internal/handlers/auth.go`
- “Where do we store push subscriptions?” → `push_subscriptions` in `schema.sql`, `backend/internal/handlers/push.go`
- “What happens when a payment is approved?” → `backend/internal/handlers/payments.go` (creates transfer expense)
- “How are balances computed from expenses?” → `backend/internal/handlers/balances.go`, `backend/internal/balance/calc.go`
- “Where is the service worker registered?” → `frontend/src/main.tsx`, `frontend/public/sw.js`

## Key environment variables

Reference: `env.example`

Backend:
- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `ACCESS_TOKEN_TTL_MINUTES` (optional)
- `REFRESH_TOKEN_TTL_HOURS` (optional)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (optional)
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (optional)

Frontend:
- `VITE_API_BASE_URL` (optional)
- `VITE_VAPID_PUBLIC_KEY` (required for browser subscribe)
