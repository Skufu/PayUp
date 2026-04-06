# PayUp Deployment Guide

> Deploy PayUp to Vercel (frontend) and Render (backend) with managed PostgreSQL.

---

## Keywords

`deployment` `Vercel` `Render` `Docker` `Neon` `Supabase` `PostgreSQL` `environment variables` `CORS` `JWT` `HTTPS` `SSL` `health check` `CI/CD` `GitHub Actions`

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Vercel        │────▶│   Render        │────▶│   Neon/Supabase │
│   (Frontend)    │     │   (Backend API) │     │   (PostgreSQL)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

| Component | Platform | Notes |
|-----------|----------|-------|
| Frontend | Vercel | Auto-deploys on push |
| Backend | Render | Docker deployment |
| Database | Neon/Supabase | Managed PostgreSQL |

---

## Deployment Checklist

- [ ] Database provisioned (Neon or Supabase)
- [ ] Migrations run against production database
- [ ] Backend deployed on Render
- [ ] Frontend deployed on Vercel
- [ ] `vercel.json` updated with Render URL
- [ ] `CORS_ORIGINS` set to Vercel URL
- [ ] Health check passing
- [ ] HTTPS working

---

## 1. Database Setup

### Option A: Neon (Recommended)

1. Create account at [neon.tech](https://neon.tech)
2. Create new project
3. Copy connection string:
   ```
   postgres://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```

### Option B: Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Go to Settings → Database → Connection string
3. Copy URI (use "Transaction" mode for serverless)

### Run Migrations

```bash
cd backend
DATABASE_URL="your-connection-string" go run ./cmd/migrate/main.go up
```

---

## 2. Backend Deployment (Render)

### Setup

1. Go to [render.com](https://render.com)
2. Connect your GitHub repo
3. Select "New Web Service"
4. Choose "Docker" as runtime
5. Set root directory to `backend`
6. Render detects `render.yaml` automatically

### Environment Variables

Set in Render dashboard:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | `openssl rand -base64 32` |
| `CORS_ORIGINS` | ✅ | `https://your-app.vercel.app` |
| `GIN_MODE` | ✅ | `release` |
| `GOOGLE_CLIENT_ID` | Optional | For Google OAuth |
| `CLOUDINARY_CLOUD_NAME` | Optional | For uploads |
| `CLOUDINARY_API_KEY` | Optional | For uploads |
| `CLOUDINARY_API_SECRET` | Optional | For uploads |
| `VAPID_PUBLIC_KEY` | Optional | For push |
| `VAPID_PRIVATE_KEY` | Optional | For push |
| `VAPID_SUBJECT` | Optional | For push |

### Your Render URL

After deploy: `https://payup-api.onrender.com`

---

## 3. Frontend Deployment (Vercel)

### Setup

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repo
3. Vercel detects `vercel.json` automatically
4. Set root directory to `.` (project root)

### Environment Variables

Set in Vercel dashboard:

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | No | Leave empty (uses rewrites) |
| `VITE_GOOGLE_CLIENT_ID` | Optional | For Google OAuth button |
| `VITE_VAPID_PUBLIC_KEY` | Optional | For push notifications |

### Update vercel.json

Edit `vercel.json` with your Render URL:

```json
{
  "rewrites": [
    {
      "source": "/v1/:path*",
      "destination": "https://YOUR-APP.onrender.com/v1/:path*"
    }
  ]
}
```

---

## 4. GitHub Actions (Optional)

### Required Secrets

Set in GitHub → Settings → Secrets:

| Secret | How to Get |
|--------|------------|
| `RENDER_DEPLOY_HOOK_URL` | Render → Service → Settings → Deploy Hook |
| `VERCEL_TOKEN` | Vercel → Settings → Tokens → Create |
| `VERCEL_ORG_ID` | Run `vercel` CLI, check `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | Run `vercel` CLI, check `.vercel/project.json` |

---

## 5. Verification

### Health Check

```bash
curl https://your-api.onrender.com/health
# Expected: {"status":"ok"}
```

### CORS Check

```bash
curl -I -X OPTIONS https://your-api.onrender.com/v1/auth/login \
  -H "Origin: https://your-app.vercel.app" \
  -H "Access-Control-Request-Method: POST"
# Should include: Access-Control-Allow-Origin: https://your-app.vercel.app
```

### Security Headers Check

```bash
curl -I https://your-api.onrender.com/health
# Should include:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Content-Security-Policy: default-src 'none'
```

---

## 6. Troubleshooting

### CORS Error in Browser

| Problem | Solution |
|---------|----------|
| Origin not allowed | Check `CORS_ORIGINS` matches Vercel URL exactly |
| Missing https:// | Include `https://` prefix |
| Trailing slash | Remove trailing slash from URL |

### 502 Bad Gateway on Render

| Problem | Solution |
|---------|----------|
| Startup error | Check Render logs |
| Database connection | Verify `DATABASE_URL` |
| Missing migrations | Run `goose up` |

### Invalid Token Errors

| Problem | Solution |
|---------|----------|
| JWT_SECRET not set | Set in Render dashboard |
| Different secrets | Ensure same secret across instances |

### Render Free Tier Sleep

| Problem | Solution |
|---------|----------|
| 30s cold start | Services sleep after 15min inactivity |
| Always-on needed | Upgrade to Starter ($7/mo) |

### Rate Limit Errors

| Problem | Solution |
|---------|----------|
| 429 on login | Wait 15 minutes or reduce attempts |
| Check headers | Look at `X-RateLimit-*` and `Retry-After` |

---

## 7. Production Checklist

- [ ] `GIN_MODE=release` set on Render
- [ ] `JWT_SECRET` is random 32+ characters
- [ ] `CORS_ORIGINS` only includes production domain
- [ ] Database uses SSL (`?sslmode=require`)
- [ ] No `.env` files in git
- [ ] GitHub secrets configured (not in code)
- [ ] Health check responding
- [ ] HTTPS enforced

---

## Environment Variables Reference

### Backend

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 8080 | HTTP port |
| `LOG_LEVEL` | No | INFO | Logging level (DEBUG, INFO, WARN, ERROR) |
| `DATABASE_URL` | Yes | - | PostgreSQL connection |
| `JWT_SECRET` | Yes | - | Token signing secret |
| `ACCESS_TOKEN_TTL_MINUTES` | No | 15 | Access token lifetime |
| `REFRESH_TOKEN_TTL_HOURS` | No | 720 | Refresh token lifetime |
| `CORS_ORIGINS` | Prod | - | Allowed origins |
| `GIN_MODE` | Prod | - | `release` for production |
| `DB_MAX_CONNS` | No | 25 | Max database connections |
| `GOOGLE_CLIENT_ID` | Optional | - | Google OAuth |
| `CLOUDINARY_*` | Optional | - | Image uploads |
| `VAPID_*` | Optional | - | Push notifications |

> **Note:** `CORS_ORIGINS` is documented above but requires code changes to `backend/internal/config/config.go` to take effect. The variable is currently not read by the application.

### Frontend

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_BASE_URL` | No | - | API URL (uses proxy in dev) |
| `VITE_GOOGLE_CLIENT_ID` | Optional | - | Google OAuth button |
| `VITE_VAPID_PUBLIC_KEY` | Optional | - | Push subscriptions |

---

## See Also

- [Reference Guide](REFERENCE.md) – Environment variables list
- [Docker Guide](technical/docker.md) – Container setup
- [BACKEND.md](BACKEND.md) – Server configuration
