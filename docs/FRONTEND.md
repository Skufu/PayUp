# Frontend

## Tech

- React 19
- Vite
- Tailwind
- React Router (minimal; most UI is inside `PayUpApp`)
- React Query for server state

## Key entrypoints

- `frontend/src/main.tsx`: React root, React Query provider, `AuthProvider`, service-worker registration
- `frontend/src/App.tsx`: app wrapper (routing/shell)
- `frontend/src/payup/PayUpApp.tsx`: main authenticated app UI (groups, wallet, notifications, modals)

## Client-side routes

Defined in `frontend/src/App.tsx`:

- `/` → `LandingPage`
- `/auth/login` → `LoginPage`
- `/auth/register` → `RegisterPage`
- `/join/:code` → `JoinGroupPage`
- `/app` → `RequireAuth(PayUpApp)`

## API access

- **Client**: `frontend/src/payup/api/client.ts`
  - Stores tokens in `localStorage` key `payup_tokens_v1`
  - Adds `Authorization: Bearer <accessToken>` automatically
  - On `401`, tries `POST /v1/auth/refresh` once (using `refreshToken`)

- **Endpoint wrappers**: `frontend/src/payup/api/endpoints.ts`
  - Mirrors backend routes in `backend/internal/server/server.go`

## Auth

- `frontend/src/payup/auth/AuthProvider.tsx`
  - On mount, loads tokens and calls `api.me()`.
  - `login/register` persist tokens and update auth state.

## Push + PWA

- **Service worker**: `frontend/public/sw.js`
  - Caches core assets
  - Skips caching any request containing `/v1/`
  - Handles `push` events and `notificationclick`

- **Browser push manager**: `frontend/src/payup/push/pushManager.ts`
  - Requires `VITE_VAPID_PUBLIC_KEY`
  - Subscribes via service worker and calls backend `POST /v1/push/subscribe`

## UI structure

- `frontend/src/payup/components/`: shell + views
- `frontend/src/payup/components/modals/`: modals (expense, payment, invite, profile, push prompt, etc.)
- `frontend/src/payup/pages/`: landing/auth pages

## Common places to change things

- **Add a new backend endpoint usage**: `frontend/src/payup/api/endpoints.ts`
- **Change token behavior / refresh**: `frontend/src/payup/api/client.ts`
- **Add/adjust push UX**: `frontend/src/payup/push/pushManager.ts`, `frontend/public/sw.js`
