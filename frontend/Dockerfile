# syntax=docker/dockerfile:1

# Build arguments
ARG NODE_VERSION=22
ARG NGINX_VERSION=1.27

# ============================================
# Build Stage
# ============================================
FROM node:${NODE_VERSION}-alpine AS build

WORKDIR /app

# Copy dependency files first for better layer caching
COPY package.json package-lock.json ./

# Install dependencies with cache mount for faster rebuilds
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit

# Copy source code
COPY . .

# Build arguments for versioning (can be passed at build time)
ARG VITE_API_BASE_URL
ARG VITE_VAPID_PUBLIC_KEY
ARG VITE_GOOGLE_CLIENT_ID

# Build the application
RUN npm run build

# ============================================
# Runtime Stage
# ============================================
FROM nginx:${NGINX_VERSION}-alpine

# Metadata labels (OCI standard)
LABEL org.opencontainers.image.title="PayUp Frontend" \
      org.opencontainers.image.description="Expense splitting PWA frontend" \
      org.opencontainers.image.vendor="PayUp"

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Add nginx user for security
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chmod -R 755 /usr/share/nginx/html

# Use non-root user
USER nginx

# Expose port
EXPOSE 80

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/health || exit 1

# Run nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
