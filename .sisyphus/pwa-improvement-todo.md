# PayUp PWA Improvement & Dev Setup TODO

> Created: 2026-04-07
> Status: Planning

---

## 1. Console Error Fixes

### 1.1 `Cross-Origin-Opener-Policy policy would block the window.postMessage call`
- **Source**: `backend/internal/middleware/security.go:34` — sets `Cross-Origin-Opener-Policy: same-origin`
- **Impact**: Blocks `window.postMessage` between cross-origin windows (e.g., Google OAuth popup → app)
- **Fix Options**:
  - **A (Recommended)**: Change `same-origin` → `same-origin-allow-popups` to allow OAuth popups and third-party integrations
  - **B**: Remove COOP header entirely (reduces security posture)
  - **C**: Conditionally apply only in production, relax in dev
- **Files to change**: `backend/internal/middleware/security.go`

### 1.2 `Failed to load resource: net::ERR_BLOCKED_BY_CLIENT`
- **Source**: `play.google.com/log?hasfast=true&authuser=0&format=json`
- **Root cause**: Browser extension (ad blocker / privacy extension) blocking Google tracking endpoints
- **Impact**: None — this is client-side extension behavior, not an app bug
- **Action**: **No code change needed**. This is expected behavior with ad blockers. Can be safely ignored.

### 1.3 `Cross-Origin-Embedder-Policy: require-corp` (potential issue)
- **Source**: `backend/internal/middleware/security.go:33` — sets `CEP: require-corp`
- **Impact**: Blocks loading any cross-origin resources (images, scripts, iframes) without proper CORP headers
- **Risk**: May block Google OAuth buttons, Cloudinary image uploads, QR code generator (`api.qrserver.com`)
- **Fix**: Change `require-corp` → `credentialless` or remove if causing issues with third-party resources
- **Files to change**: `backend/internal/middleware/security.go`

---

## 2. Dev Script Consolidation

### 2.1 Current State
- `dev.sh` already runs both backend (port 8080) and frontend (port 5173)
- `Makefile` has `make dev` which calls `./dev.sh` with `db-ensure` prerequisite
- **Gap**: `dev.sh` doesn't auto-start Postgres or run migrations

### 2.2 Proposed Single Script (`dev.sh` improvements)
- [ ] Auto-start Postgres if not running (`docker compose -f backend/docker-compose.yml up -d`)
- [ ] Auto-run migrations if pending
- [ ] Verify `.env` exists before starting
- [ ] Better output formatting (colorized, labeled logs)
- [ ] Health check wait (wait for backend to be ready before frontend)
- [ ] Open browser automatically on startup (`open http://localhost:5173` on macOS)
- [ ] Graceful shutdown of all processes (already partially implemented)

### 2.3 Files to modify
- `dev.sh` — enhance with pre-flight checks
- `Makefile` — already good, minimal changes needed

---

## 3. PWA Improvements

### 3.1 Service Worker — Add Caching & Offline Support
- **Current**: Only handles push notifications (no caching, no offline support)
- **File**: `frontend/public/sw.js`
- [ ] Add install event with asset caching
- [ ] Add fetch event with cache-first strategy for static assets
- [ ] Add network-first strategy for HTML pages
- [ ] Skip API requests (`/v1/*`) — always fetch fresh
- [ ] Add activate event for old cache cleanup
- [ ] Add offline fallback page

### 3.2 Missing PWA Icons
- **Current**: Only `favicon.svg` in manifest (insufficient for installability)
- **File**: `frontend/public/manifest.json`
- [ ] Generate PNG icons: 72, 96, 128, 144, 152, 167, 180, 192, 384, 512
- [ ] Generate `apple-touch-icon` (180x180)
- [ ] Generate `android-chrome-192x192.png` (referenced in sw.js but missing)
- [ ] Generate `badge-icon.png` for notifications
- [ ] Update manifest.json with all icon sizes
- [ ] Add `<link rel="apple-touch-icon">` tags to `index.html`

### 3.3 Missing PWA Components (partially implemented)
- **Current**: `InstallPrompt.tsx` and `OfflineIndicator.tsx` exist and are integrated
- **Files**: `frontend/src/payup/components/modals/InstallPrompt.tsx`, `frontend/src/payup/components/OfflineIndicator.tsx`
- [x] InstallPrompt component — implemented and integrated in PayUpApp.tsx
- [x] OfflineIndicator component — implemented and integrated in PayUpApp.tsx
- [ ] Verify InstallPrompt works correctly with current manifest
- [ ] Test iOS Safari manual install instructions display

### 3.4 Safe Area CSS (iOS Notch)
- **File**: `frontend/src/index.css`
- [ ] Add `--safe-area-inset-*` CSS custom properties
- [ ] Add `.pb-safe`, `.pt-safe` utility classes
- [ ] Add `overscroll-behavior-y: none` to prevent iOS bounce
- [ ] Add `-webkit-overflow-scrolling: touch`

### 3.5 `vite-plugin-pwa` Integration (Optional but Recommended)
- [ ] Install `vite-plugin-pwa` as dev dependency
- [ ] Configure in `vite.config.ts` with `registerType: 'autoUpdate'`
- [ ] Move manifest generation into plugin config
- [ ] Configure workbox runtime caching rules
- [ ] Include assets in build output

### 3.6 PWA Screenshots for Manifest
- [ ] Capture mobile screenshot (390x844) — Wallet View
- [ ] Capture mobile screenshot (390x844) — Expense Feed
- [ ] Add to `manifest.json` under `screenshots`

### 3.7 iOS Splash Screens
- [ ] Generate splash images for all iOS device sizes
- [ ] Add `<link rel="apple-touch-startup-image">` tags to `index.html`

---

## 4. Security Headers Review

### 4.1 Backend Security Headers (`backend/internal/middleware/security.go`)
- [ ] Review COOP: `same-origin` → `same-origin-allow-popups`
- [ ] Review COEP: `require-corp` → `credentialless` (or remove)
- [ ] Review CORP: `same-origin` — OK for API
- [ ] Add `Content-Security-Policy` refinement if needed

### 4.2 Frontend nginx.conf (production)
- [ ] Add security headers matching backend (X-Frame-Options, etc.)
- [ ] Add `Cross-Origin-Opener-Policy` header
- [ ] Verify CSP for SPA serving

---

## 5. Testing & Verification

### 5.1 PWA Testing
- [ ] Lighthouse PWA audit (Chrome DevTools)
- [ ] Test installability on Android Chrome
- [ ] Test installability on iOS Safari
- [ ] Test offline mode (airplane mode → verify cached content)
- [ ] Test push notifications end-to-end
- [ ] Test service worker update flow

### 5.2 Dev Script Testing
- [ ] Test `./dev.sh` from clean state (no Postgres running)
- [ ] Test `./dev.sh` with existing Postgres
- [ ] Test graceful shutdown (Ctrl+C)
- [ ] Test env validation (missing `.env`)

---

## Priority Order

1. **Fix COOP/COEP headers** (blocks OAuth and third-party resources)
2. **Enhance dev.sh** (daily developer experience)
3. **Service Worker offline caching** (core PWA feature)
4. **Generate PWA icons** (required for installability)
5. **Safe area CSS** (iOS polish)
6. **vite-plugin-pwa** (production-grade PWA)
7. **Screenshots & splash screens** (nice-to-have)
8. **Lighthouse audit & testing** (verification)

---

## Notes

- `ERR_BLOCKED_BY_CLIENT` errors are from browser extensions, NOT app bugs
- PWA guide exists at `docs/guides/pwa-guide.md` with detailed implementation steps
- Current PWA state: manifest + basic SW (push only) + InstallPrompt + OfflineIndicator
- Missing: offline caching, icons, safe area CSS, vite-plugin-pwa
