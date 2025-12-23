# syntax=docker/dockerfile:1

# Build arguments for versioning and metadata
ARG GO_VERSION=1.24
ARG ALPINE_VERSION=3.21

# ============================================
# Build Stage
# ============================================
FROM golang:${GO_VERSION}-alpine${ALPINE_VERSION} AS build

# Install build dependencies
RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    git

WORKDIR /app

# Copy dependency files first for better layer caching
COPY backend/go.mod backend/go.sum ./

# Download dependencies with cache mount for faster rebuilds
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go mod download

# Copy source code
COPY backend/ .

# Build arguments for versioning (can be passed at build time)
ARG VERSION=dev
ARG COMMIT=unknown
ARG BUILD_DATE

# Build the binary with optimizations
# - CGO_ENABLED=0: Static binary for distroless
# - -trimpath: Remove file system paths from binary
# - -ldflags: Strip debug info and set version
RUN --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 \
    GOOS=linux \
    GOARCH=amd64 \
    go build \
    -trimpath \
    -ldflags="-s -w -X main.Version=${VERSION} -X main.Commit=${COMMIT} -X main.BuildDate=${BUILD_DATE}" \
    -o /out/payup-api \
    ./cmd/api

# ============================================
# Runtime Stage
# ============================================
FROM gcr.io/distroless/static-debian12:nonroot

# Metadata labels (OCI standard)
LABEL org.opencontainers.image.title="PayUp API" \
      org.opencontainers.image.description="Expense splitting and payment tracking API" \
      org.opencontainers.image.vendor="PayUp" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}"

WORKDIR /

# Copy CA certificates and timezone data (needed for HTTPS/TLS and time operations)
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=build /usr/share/zoneinfo /usr/share/zoneinfo

# Copy the compiled binary
COPY --from=build /out/payup-api /payup-api

# Environment variables
ENV PORT=8080 \
    GIN_MODE=release

# Expose port
EXPOSE 8080

# Health check (configured at runtime via Render/Kubernetes)
# Note: Distroless doesn't include curl/wget, so health checks should be
# configured externally using HTTP probes to GET /health

# Run as non-root user for security
USER nonroot:nonroot

# Set the entrypoint
ENTRYPOINT ["/payup-api"]
