# Local Development Setup

> Step-by-step guide to run PayUp on your local machine.

---

## Keywords

`local development` `setup` `installation` `prerequisites` `Docker` `PostgreSQL` `Go` `Node.js` `npm` `environment variables`

---

## Prerequisites

Before you begin, ensure you have the following installed:

| Tool | Version | Installation |
|------|---------|--------------|
| **Go** | 1.24+ | [golang.org/dl](https://golang.org/dl/) |
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org/) |
| **Docker** | Latest | [docker.com](https://www.docker.com/get-started) |
| **Docker Compose** | Latest | Included with Docker Desktop |

Verify installations:

```bash
go version      # go version go1.24+
node --version  # v18+
npm --version   # 9+
docker --version
docker compose version
```

---

## Quick Start (TL;DR)

```bash
# 1. Clone and enter directory
git clone <repository-url>
cd PayUp

# 2. Setup environment
cp env.example .env
# Edit .env: set JWT_SECRET to a secure random string

# 3. Start database
docker compose -f backend/docker-compose.yml up -d

# 4. Run migrations
cd backend
go run cmd/migrate/main.go up
cd ..

# 5. Install frontend dependencies
cd frontend && npm install && cd ..

# 6. Start development servers
./dev.sh
```

Open http://localhost:5173 in your browser.

---

## Detailed Setup

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd PayUp
```

### Step 2: Environment Configuration

Copy the example environment file:

```bash
cp env.example .env
```

Edit `.env` and configure the required variables:

```bash
# Required
DATABASE_URL=postgres://payup:payup@localhost:5432/payup?sslmode=disable
JWT_SECRET=your-secure-random-string-here  # Change this!
PORT=8080

# Development mode
GIN_MODE=debug
```

**Generate a secure JWT secret:**

```bash
# Option 1: Using openssl
openssl rand -base64 32

# Option 2: Using /dev/urandom
head -c 32 /dev/urandom | base64
```

### Step 3: Start PostgreSQL

Start the database using Docker Compose:

```bash
docker compose -f backend/docker-compose.yml up -d
```

Verify the database is running:

```bash
docker compose -f backend/docker-compose.yml ps
# Should show: payup-db running on port 5432
```

### Step 4: Run Database Migrations

Apply the database schema:

```bash
cd backend
go run cmd/migrate/main.go up
cd ..
```

Check migration status:

```bash
cd backend
go run cmd/migrate/main.go status
cd ..
```

### Step 5: Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### Step 6: Start Development Servers

Use the dev script to start both backend and frontend:

```bash
./dev.sh
```

This starts:
- **Backend (Go)**: http://localhost:8080
- **Frontend (Vite)**: http://localhost:5173

The frontend proxies API requests to the backend automatically.

---

## Manual Startup (Alternative)

If you prefer to run services separately (useful for debugging):

**Terminal 1 - Backend:**
```bash
cd backend
go run ./cmd/api
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

---

## Optional Features

### Google OAuth

1. Create credentials at [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Add to `.env`:
   ```bash
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   ```

### Cloudinary (Image Uploads)

1. Create account at [cloudinary.com](https://cloudinary.com)
2. Add to `.env`:
   ```bash
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

### Push Notifications

1. Generate VAPID keys:
   ```bash
   npx web-push generate-vapid-keys
   ```
2. Add to `.env`:
   ```bash
   VAPID_PUBLIC_KEY=your-public-key
   VAPID_PRIVATE_KEY=your-private-key
   VAPID_SUBJECT=mailto:your@email.com
   VITE_VAPID_PUBLIC_KEY=your-public-key
   ```

---

## Common Commands

### Backend

```bash
cd backend

# Run API server
go run ./cmd/api

# Run all tests
go test ./...

# Run specific package tests
go test ./internal/balance/...

# Regenerate sqlc code (after SQL changes)
sqlc generate

# Migration commands
go run cmd/migrate/main.go up      # Apply migrations
go run cmd/migrate/main.go down    # Rollback one migration
go run cmd/migrate/main.go status  # Check status
```

### Frontend

```bash
cd frontend

# Start dev server
npm run dev

# Start with network exposure (for mobile testing)
npm run dev -- --host

# Lint code
npm run lint

# Build for production
npm run build
```

### Database

```bash
# Start database
docker compose -f backend/docker-compose.yml up -d

# Stop database
docker compose -f backend/docker-compose.yml down

# View logs
docker compose -f backend/docker-compose.yml logs -f

# Reset database (delete all data)
docker compose -f backend/docker-compose.yml down -v
docker compose -f backend/docker-compose.yml up -d
cd backend && go run cmd/migrate/main.go up
```

---

## Project URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:5173 | React app |
| Backend API | http://localhost:8080 | Go API server |
| Health Check | http://localhost:8080/health | API status |
| PostgreSQL | localhost:5432 | Database |

---

## Troubleshooting

### Database Connection Failed

**Error:** `connection refused` or `no such host`

**Solutions:**
1. Ensure Docker is running
2. Check database container: `docker compose -f backend/docker-compose.yml ps`
3. Restart database: `docker compose -f backend/docker-compose.yml restart`
4. Verify `DATABASE_URL` in `.env`

### Port Already in Use

**Error:** `address already in use`

**Solutions:**
```bash
# Find process using port 8080
lsof -i :8080

# Kill process (replace PID)
kill -9 <PID>

# Or use different port in .env
PORT=8081
```

### Frontend Cannot Connect to Backend

**Error:** CORS or network errors in browser

**Solutions:**
1. Ensure backend is running on port 8080
2. Check Vite proxy in `frontend/vite.config.ts`
3. Clear browser cache and hard reload

### Migration Errors

**Error:** `relation already exists` or `column not found`

**Solutions:**
```bash
# Check migration status
cd backend && go run cmd/migrate/main.go status

# Reset database if needed (loses all data)
docker compose -f backend/docker-compose.yml down -v
docker compose -f backend/docker-compose.yml up -d
go run cmd/migrate/main.go up
```

### Go Module Errors

**Error:** `cannot find module`

**Solutions:**
```bash
cd backend
go mod download
go mod tidy
```

### npm Install Fails

**Error:** Permission or cache errors

**Solutions:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

---

## Development Tips

### Hot Reload

- **Frontend:** Vite provides instant HMR (Hot Module Replacement)
- **Backend:** Restart manually, or use [air](https://github.com/air-verse/air) for auto-reload:
  ```bash
  go install github.com/air-verse/air@latest
  cd backend && air
  ```

### Testing API Endpoints

Use curl or an API client:

```bash
# Register a user
curl -X POST http://localhost:8080/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Login
curl -X POST http://localhost:8080/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Health check
curl http://localhost:8080/health
```

### Database Access

Connect directly to PostgreSQL:

```bash
docker exec -it payup-db psql -U payup -d payup
```

Useful queries:
```sql
\dt                    -- List tables
\d users               -- Describe users table
SELECT * FROM users;   -- View all users
```

### Expose Frontend to Network

For testing on mobile devices:

```bash
cd frontend
npm run dev -- --host
```

Access via your machine's IP: `http://192.168.x.x:5173`

---

## Next Steps

After setup is complete:

1. **Create an account** via the register page
2. **Create a group** to start splitting expenses
3. **Invite friends** using invite codes
4. **Add expenses** and see balances update

---

## See Also

- [CLAUDE.md](/CLAUDE.md) - Comprehensive development guide
- [REFERENCE.md](/docs/REFERENCE.md) - Quick reference and feature map
- [ARCHITECTURE.md](/docs/ARCHITECTURE.md) - System design
- [API.md](/docs/API.md) - API documentation
- [DEPLOYMENT.md](/docs/DEPLOYMENT.md) - Production deployment
