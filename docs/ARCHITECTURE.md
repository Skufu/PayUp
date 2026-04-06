# Architecture

> System design and data flow for PayUp.

---

## Keywords

`system architecture` `component design` `data flow` `request lifecycle` `microservices` `monorepo` `React frontend` `Go backend` `PostgreSQL database` `JWT authentication` `push notifications` `Cloudinary uploads`

---

## Components

```mermaid
graph TB
    subgraph Frontend
        PWA[React PWA<br/>Vite + TailwindCSS]
        SW[Service Worker<br/>Offline + Push]
    end
    
    subgraph Backend
        API[Go API<br/>Gin Framework]
        Auth[Auth Middleware<br/>JWT Validation]
        Handlers[Route Handlers]
    end
    
    subgraph External
        DB[(PostgreSQL)]
        Cloud[Cloudinary<br/>Image Uploads]
        Push[Web Push<br/>VAPID]
    end
    
    PWA --> API
    SW --> Push
    API --> Auth --> Handlers
    Handlers --> DB
    Handlers --> Cloud
    Handlers --> Push
```

| Component | Technology | Location |
|-----------|------------|----------|
| Frontend | React 19 + Vite + Tailwind + React Query | `frontend/` |
| Backend API | Go + Gin | `backend/` |
| Database | PostgreSQL 16 | External (Neon/Supabase) |
| Uploads | Cloudinary | Optional external service |
| Push | Web Push (VAPID) via `webpush-go` | Optional |

---

## Request Lifecycle

### 1. User Registration/Login

```mermaid
sequenceDiagram
    participant Browser
    participant Frontend
    participant Backend
    participant Database
    
    Browser->>Frontend: Submit credentials
    Frontend->>Backend: POST /v1/auth/login
    Backend->>Database: Verify credentials
    Database-->>Backend: User data
    Backend-->>Frontend: { user, accessToken, refreshToken }
    Frontend->>Browser: Store tokens, redirect to app
```

**Files involved:**
- Frontend: `frontend/src/payup/auth/AuthProvider.tsx`
- Backend: `backend/internal/handlers/auth.go`

### 2. Authenticated API Request

```mermaid
sequenceDiagram
    participant Frontend
    participant AuthMiddleware
    participant Handler
    participant Database
    
    Frontend->>AuthMiddleware: Request + Bearer token
    AuthMiddleware->>AuthMiddleware: Validate JWT
    alt Token valid
        AuthMiddleware->>Handler: Request + userID context
        Handler->>Database: Query
        Database-->>Handler: Data
        Handler-->>Frontend: JSON response
    else Token expired
        AuthMiddleware-->>Frontend: 401 Unauthorized
        Frontend->>Frontend: Refresh token flow
    end
```

**Files involved:**
- Frontend: `frontend/src/payup/api/client.ts` (proactive refresh)
- Backend: `backend/internal/auth/middleware.go`

### 3. Expense Creation with Splits

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database
    
    User->>Frontend: Fill expense form
    Frontend->>Frontend: Validate splits sum to total
    Frontend->>Backend: POST /v1/groups/:id/expenses
    Backend->>Backend: Validate membership + splits
    Backend->>Database: INSERT expense + splits
    Backend->>Backend: Emit SSE event
    Database-->>Backend: Created expense
    Backend-->>Frontend: Expense with splits
    Frontend->>User: Show success toast
```

**Files involved:**
- Frontend: Add expense modal
- Backend: `backend/internal/handlers/expenses.go`, `backend/internal/handlers/validation.go`

### 4. Payment Approval Flow

```mermaid
sequenceDiagram
    participant Sender
    participant Receiver
    participant Backend
    participant Database
    
    Sender->>Backend: POST /v1/payments (create request)
    Backend->>Database: INSERT payment (pending)
    Backend->>Backend: Send push to receiver
    
    Receiver->>Backend: PATCH /v1/payments/:id/approve
    Backend->>Backend: Verify receiver is approver
    Backend->>Database: UPDATE payment (approved)
    Backend->>Database: INSERT transfer expense
    Note right of Database: Transfer expense<br/>affects balances
    Backend->>Backend: Send push to sender (approval notification)
    Backend-->>Receiver: Success
```

**Note:** Payment approval sends push notifications to the sender to notify them of approval or rejection.

**Files involved:**
- Backend: `backend/internal/handlers/payments.go`

### 5. Push Notification Flow

```mermaid
sequenceDiagram
    participant Browser
    participant ServiceWorker
    participant Backend
    participant WebPush
    
    Browser->>ServiceWorker: Register + get subscription
    ServiceWorker-->>Browser: PushSubscription
    Browser->>Backend: POST /v1/push/subscribe
    Backend->>Backend: Store subscription
    
    Note over Backend: Later, on nudge/payment...
    Backend->>WebPush: Send notification
    WebPush->>ServiceWorker: Push event
    ServiceWorker->>Browser: Show notification
```

**Files involved:**
- Frontend: `frontend/src/payup/push/pushManager.ts`, `frontend/public/sw.js`
- Backend: `backend/internal/handlers/push.go`

---

## Source of Truth Files

| Concern | File |
|---------|------|
| API Routes | `backend/internal/server/server.go` |
| Authentication | `backend/internal/auth/*`, `backend/internal/handlers/auth.go` |
| Database Schema | `backend/sql/schema.sql` |
| SQL Queries | `backend/sql/queries/*.sql` |
| Migrations | `backend/migrations/*.sql` |
| Frontend App | `frontend/src/payup/PayUpApp.tsx` |
| OCR (Receipt Scanning) | `backend/internal/handlers/ocr.go` |
| Activity Feed | `backend/internal/handlers/activity.go` |

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Access token expired | Frontend refreshes proactively (2min before expiry) or reactively on 401 |
| Refresh token expired | User redirected to login |
| Missing Cloudinary config | Upload endpoints return 503 |
| Missing VAPID config | Push send no-ops; subscriptions still stored |
| Missing GEMINI_API_KEY | OCR endpoint returns 503 |
| Rate limit exceeded | 429 with `Retry-After` header; frontend retries with backoff |
| Group membership check fail | 403 Forbidden |
| Payment approval by non-receiver | 403 Forbidden |

---

## See Also

- [Reference Guide](REFERENCE.md) – Feature→code mappings
- [API.md](API.md) – Request/response details
- [DATABASE.md](DATABASE.md) – Schema documentation
- [BACKEND.md](BACKEND.md) – Go patterns
- [FRONTEND.md](FRONTEND.md) – React patterns
