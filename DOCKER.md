# Docker Build Guide

This document explains how to build and run PayUp using the optimized Docker setup.

## Prerequisites

- Docker 20.10+ with BuildKit enabled
- Docker Compose 2.0+ (optional, for local development)

## Quick Start

### Build and Run Locally

```bash
# Build and run entire stack
docker compose up --build

# Or build individually
docker build -t payup-api -f Dockerfile .
docker build -t payup-frontend -f frontend/Dockerfile frontend/
```

## Optimizations

### Backend (Go) Dockerfile

**Industry-standard features:**

1. **BuildKit Cache Mounts**
   - Go module cache: Speeds up `go mod download` on rebuilds
   - Build cache: Speeds up compilation on code changes
   - Can reduce build time by 50-80% on rebuilds

2. **Multi-stage Build**
   - Build stage: golang:1.24-alpine (~300MB)
   - Runtime stage: distroless/static (~2MB)
   - Final image size: ~10-15MB (vs 300MB+ without multi-stage)

3. **Security**
   - Runs as non-root user (`nonroot:nonroot`)
   - Distroless base (no shell, minimal attack surface)
   - Static binary (no dynamic linking vulnerabilities)

4. **Versioning**
   - Build args for VERSION, COMMIT, BUILD_DATE
   - OCI-compliant image labels
   - Can be queried with `docker inspect`

5. **Layer Caching**
   - Dependencies downloaded separately from code
   - Only rebuilds when go.mod/go.sum changes

### Frontend (React) Dockerfile

**Industry-standard features:**

1. **BuildKit Cache Mounts**
   - npm cache: Speeds up `npm ci` on rebuilds
   - Can reduce build time by 60-90% on rebuilds

2. **Multi-stage Build**
   - Build stage: node:22-alpine (~120MB)
   - Runtime stage: nginx:1.27-alpine (~40MB)
   - Final image size: ~45MB (vs 120MB+ without multi-stage)

3. **Security**
   - Runs nginx as non-root user
   - Proper file permissions
   - Minimal nginx alpine base

4. **Production Optimizations**
   - Vite production build
   - Asset compression and minification
   - Tree-shaking and code splitting

5. **Health Checks**
   - HTTP probe to `/health`
   - Compatible with Kubernetes/Render

## Build with Cache

To leverage BuildKit cache mounts for maximum speed:

```bash
# Enable BuildKit (if not already enabled)
export DOCKER_BUILDKIT=1

# Build with cache
docker build -t payup-api -f Dockerfile .

# On subsequent builds, cached layers are reused:
# - go mod download: ~30s -> ~1s
# - npm ci: ~60s -> ~2s
```

## Build with Versioning

```bash
# Build backend with version info
docker build \
  --build-arg VERSION=1.0.0 \
  --build-arg COMMIT=$(git rev-parse --short HEAD) \
  --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
  -t payup-api:1.0.0 \
  -f Dockerfile .

# Build frontend with environment variables
docker build \
  --build-arg VITE_API_BASE_URL=https://api.example.com \
  --build-arg VITE_GOOGLE_CLIENT_ID=your-client-id \
  -t payup-frontend:1.0.0 \
  -f frontend/Dockerfile \
  frontend/
```

## Multi-platform Builds

Build for multiple architectures (useful for ARM-based servers):

```bash
# Create a builder
docker buildx create --use

# Build for multiple platforms
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t payup-api:latest \
  -f Dockerfile \
  --push \
  .
```

## Production Build Times

With BuildKit cache (second build):
- **Backend**: ~5-10 seconds (first build: ~60s)
- **Frontend**: ~10-15 seconds (first build: ~90s)

Without cache:
- **Backend**: ~45-60 seconds
- **Frontend**: ~60-90 seconds

## Image Sizes

**Backend:**
- Build stage: ~300MB (golang:alpine + dependencies)
- Final image: ~10-15MB (distroless + binary)

**Frontend:**
- Build stage: ~120MB (node:alpine + node_modules)
- Final image: ~45MB (nginx:alpine + static files)

**Total:** ~55-60MB for both services

## Best Practices

### 1. Use .dockerignore

Both root, backend, and frontend directories have `.dockerignore` files to exclude:
- Git files
- Documentation
- IDE files
- Test files
- node_modules (will be installed fresh)
- Environment files

This reduces build context size by 70-90%.

### 2. Layer Ordering

Dependencies are copied and installed before source code:
```dockerfile
COPY go.mod go.sum ./
RUN go mod download
COPY . .  # Code changes don't invalidate dependency cache
```

### 3. BuildKit Features

Always use BuildKit for cache mounts:
```dockerfile
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download
```

### 4. Security

- Never run as root in production
- Use distroless/alpine for minimal attack surface
- No secrets in Dockerfile or build args
- Scan images: `docker scan payup-api`

## CI/CD Integration

### GitHub Actions

```yaml
- name: Build backend
  run: |
    docker build \
      --build-arg VERSION=${{ github.ref_name }} \
      --build-arg COMMIT=${{ github.sha }} \
      --build-arg BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ") \
      -t payup-api:${{ github.sha }} \
      -f Dockerfile .
```

### Render

Render automatically uses the Dockerfile specified in `render.yaml`:
```yaml
dockerfilePath: Dockerfile
dockerContext: backend
```

## Troubleshooting

### Build fails with "cache mount not supported"

Enable BuildKit:
```bash
export DOCKER_BUILDKIT=1
```

Or in docker-compose.yml:
```yaml
services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      DOCKER_BUILDKIT: 1
```

### Slow builds

1. Ensure BuildKit is enabled
2. Check .dockerignore is working: `docker build --no-cache --progress=plain`
3. Verify cache mounts are used: Look for `[build X/Y] RUN --mount=type=cache`

### Image too large

Check layer sizes:
```bash
docker history payup-api
```

Ensure multi-stage build is working (final image should be ~10-15MB for backend).

## References

- [Docker BuildKit](https://docs.docker.com/build/buildkit/)
- [Dockerfile best practices](https://docs.docker.com/develop/dev-best-practices/)
- [Multi-stage builds](https://docs.docker.com/build/building/multi-stage/)
- [Distroless images](https://github.com/GoogleContainerTools/distroless)
