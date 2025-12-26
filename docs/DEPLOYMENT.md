# PayUp Deployment Guide

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Vercel        │────▶│   Render        │────▶│   Neon/Supabase │
│   (Frontend)    │     │   (Backend API) │     │   (PostgreSQL)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## 1. Database Setup (Neon or Supabase)

### Option A: Neon (Recommended)
1. Go to [neon.tech](https://neon.tech) and create account
2. Create a new project
3. Copy the connection string (looks like `postgres://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`)

### Option B: Supabase
1. Go to [supabase.com](https://supabase.com) and create project
2. Go to Settings → Database → Connection string
3. Copy the URI (use "Transaction" mode for serverless)

### Run Migrations
```bash
cd backend
DATABASE_URL="your-connection-string" go run cmd/migrate/main.go up
```

---

## 2. Backend Deployment (Render)

### Automatic Deploy
1. Go to [render.com](https://render.com) and connect your GitHub repo
2. Select "New Web Service"
3. Choose "Docker" as runtime
4. Set root directory to `backend`
5. Render will detect the `render.yaml` and configure automatically

### Environment Variables (set in Render dashboard)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Generate: `openssl rand -base64 32` |
| `CORS_ORIGINS` | ✅ | Your Vercel URL: `https://your-app.vercel.app` |
| `GOOGLE_CLIENT_ID` | Optional | For Google OAuth |
| `CLOUDINARY_URL` | Optional | For image uploads |
| `VAPID_PUBLIC_KEY` | Optional | For push notifications |
| `VAPID_PRIVATE_KEY` | Optional | For push notifications |

### Get Your Render URL
After deploy, your API will be at: `https://payup-api.onrender.com`

---

## 3. Frontend Deployment (Vercel)

### Automatic Deploy
1. Go to [vercel.com](https://vercel.com) and import your GitHub repo
2. Vercel detects `vercel.json` automatically
3. Set root directory to `.` (project root, not frontend)

### Environment Variables (set in Vercel dashboard)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | Optional | Leave empty - uses rewrites |
| `VITE_GOOGLE_CLIENT_ID` | Optional | For Google OAuth button |
| `VITE_VAPID_PUBLIC_KEY` | Optional | For push notifications |

### Update API URL in vercel.json
Edit `vercel.json` and replace `payup-api.onrender.com` with your actual Render URL:

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

## 4. GitHub Actions (Optional Auto-Deploy)

### Required Secrets
Set these in GitHub → Settings → Secrets and variables → Actions:

| Secret | How to Get |
|--------|------------|
| `RENDER_DEPLOY_HOOK_URL` | Render → Your Service → Settings → Deploy Hook |
| `VERCEL_TOKEN` | Vercel → Settings → Tokens → Create |
| `VERCEL_ORG_ID` | Run `vercel` CLI, check `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | Run `vercel` CLI, check `.vercel/project.json` |

---

## 5. Post-Deployment Checklist

### Verify Backend
```bash
curl https://your-api.onrender.com/health
# Should return: {"status":"ok"}
```

### Verify CORS
```bash
curl -I -X OPTIONS https://your-api.onrender.com/v1/auth/login \
  -H "Origin: https://your-app.vercel.app" \
  -H "Access-Control-Request-Method: POST"
# Should include: Access-Control-Allow-Origin: https://your-app.vercel.app
```

### Verify Security Headers
```bash
curl -I https://your-api.onrender.com/health
# Should include:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Content-Security-Policy: default-src 'none'
```

---

## 6. Troubleshooting

### "CORS error" in browser
- Check `CORS_ORIGINS` env var matches your Vercel URL exactly
- Include `https://` prefix
- No trailing slash

### "502 Bad Gateway" on Render
- Check Render logs for startup errors
- Verify `DATABASE_URL` is correct
- Ensure migrations have run

### "Invalid token" errors
- Verify `JWT_SECRET` is set
- Ensure it's the same across all instances

### Render Free Tier Sleep
- Free tier services sleep after 15min inactivity
- First request after sleep takes ~30s to cold start
- Consider upgrading to Starter ($7/mo) for always-on

---

## 7. Production Security Checklist

- [ ] `GIN_MODE=release` is set on Render
- [ ] `JWT_SECRET` is a random 32+ character string
- [ ] `CORS_ORIGINS` only includes your production domain
- [ ] Database uses SSL (`?sslmode=require` in URL)
- [ ] No `.env` files committed to git
- [ ] GitHub secrets configured (not in code)
