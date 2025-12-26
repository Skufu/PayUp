## Deploy PayUp (Render + Vercel)

This repo is a monorepo:

- **Backend**: Go + Gin (`backend/`)
- **Frontend**: Vite + React (`frontend/`)

### What “success” looks like

- Backend is live on Render and responds to `GET /health`
- Frontend is live on Vercel and can call the backend (CORS is configured)
- New QR/proof uploads work in production (optional Cloudinary)

---

## 1) Deploy Backend to Render

### A. Create the Render service

1. Render Dashboard → **New** → **Web Service**
2. Connect the GitHub repo
3. Pick:
   - **Root Directory**: `backend`
   - **Environment**: Docker
   - Render will use `backend/Dockerfile`

Tip: this repo also includes `render.yaml` so you can use Render Blueprint if you want.

### B. Create the database

Pick one:

- **Render Postgres** (simple, same platform)
- **Neon/Supabase Postgres** (often cheaper, good free tiers)

You just need a valid Postgres connection string for `DATABASE_URL`.

### C. Environment variables (Render → Environment tab)

Required:

- `DATABASE_URL`: Postgres connection string
- `JWT_SECRET`: long random string
- `CORS_ORIGINS`: comma-separated list of allowed frontend origins
  - Example: `https://your-app.vercel.app,https://www.your-domain.com`

Optional (only if you want image uploads):

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

Notes:

- Render sets `PORT` automatically; the app reads `PORT` (defaults to `8080`).

### D. Run migrations (one-time + whenever migrations change)

Render doesn’t automatically run DB migrations for you. You have two easy options:

Option 1: Run locally against production DB:

```bash
cd backend
DATABASE_URL="postgres://..." go run ./cmd/migrate up
```

Option 2: Create a Render “Job” (recommended later) that runs:

```bash
go run ./cmd/migrate up
```

### E. Verify

- Open: `https://<your-render-service>/health`
- Expect: `{"status":"ok"}`

---

## 2) Deploy Frontend to Vercel

### A. Create the Vercel project

1. Vercel Dashboard → **New Project**
2. Import the GitHub repo
3. Vercel should use `vercel.json` (repo root) to build from `frontend/`

### B. Environment variables (Vercel → Project Settings → Environment Variables)

Required:

- `VITE_API_BASE_URL`: your Render backend URL
  - Example: `https://payup-api.onrender.com`

### C. Verify

- Visit the Vercel site
- Login/register
- Confirm API calls work (no CORS errors in browser console)

---

## 3) Enable CI (already configured)

GitHub Actions workflow: `.github/workflows/ci.yml`

- Backend: `gofmt`, `sqlc generate` check, `go test ./...`
- Frontend: `npm ci`, `npm run lint`, `npm run build` (Node 22.12)

---

## 4) Enable CD (optional)

Workflow: `.github/workflows/deploy.yml` (runs on pushes to `main`)

### A. Render deploy hook

1. Render → Service → **Deploy Hook**
2. Add GitHub Secret:
   - `RENDER_DEPLOY_HOOK_URL`

### B. Vercel deploy (CLI)

Add GitHub Secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Once those are set, pushing to `main` will deploy.

---

## Common production gotchas

- **CORS must be set** (`CORS_ORIGINS`) or Vercel → Render requests will fail.
- **Uploads require Cloudinary env vars**; otherwise upload endpoints return `503`.
- **JWT_SECRET**: use a real secret in prod (never `change-me`).








