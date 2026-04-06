# Backend

> Go API server architecture and patterns.

---

## Keywords

`Go` `Golang` `Gin framework` `PostgreSQL` `pgx` `sqlc` `JWT authentication` `middleware` `handlers` `rate limiting` `CORS` `dependency injection` `goose migrations`

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| Language | Go 1.24.1 |
| HTTP Framework | Gin |
| Database Driver | pgx/v5 |
| Query Generation | sqlc |
| Migrations | Goose |
| JWT | golang-jwt/jwt/v5 |
| Image Uploads | Cloudinary |
| Push Notifications | webpush-go |

---

## Quick Start

### Run the server
```bash
cd backend
go run ./cmd/api
```

### Run tests
```bash
cd backend
go test ./...                        # All tests
go test ./internal/handlers/...      # Handler tests
go test ./internal/balance/...       # Balance calculation tests
```

### Run migrations
```bash
cd backend
goose postgres "$DATABASE_URL" up     # Apply migrations
goose postgres "$DATABASE_URL" down   # Rollback one
goose postgres "$DATABASE_URL" status # Check status
```

### Regenerate database code
```bash
cd backend
sqlc generate
```

---

## Directory Structure

```
backend/
├── cmd/
│   ├── api/main.go           # Server entrypoint
│   └── migrate/main.go       # Migration runner
├── internal/
│   ├── auth/                 # Authentication
│   │   ├── tokens.go         # JWT issue/parse
│   │   └── middleware.go     # Auth middleware
│   ├── balance/              # Balance calculation
│   │   └── calc.go           # Core algorithm
│   ├── config/               # Environment config
│   ├── db/
│   │   └── sqlcdb/           # Generated code (DO NOT EDIT)
│   ├── events/               # SSE event hub
│   │   └── hub.go            # Pub/sub for real-time
│   ├── handlers/             # HTTP route handlers
│   │   ├── auth.go           # Login, register, OAuth
│   │   ├── groups.go         # Group CRUD, invites
│   │   ├── expenses.go       # Expense CRUD
│   │   ├── balances.go       # Balance queries
│   │   ├── payments.go       # Payment flow
│   │   ├── nudges.go         # Reminder notifications
│   │   ├── ocr.go            # OCR receipt processing
│   │   ├── push.go           # Push subscriptions
│   │   ├── invites.go        # Invite preview
│   │   ├── events.go         # SSE streaming
│   │   ├── activity.go       # Activity log
│   │   └── validation.go     # Input validation
│   ├── logger/               # Structured logging
│   ├── middleware/           # HTTP middleware
│   │   ├── cors.go           # CORS configuration
│   │   ├── errors.go         # Error handling
│   │   ├── https.go          # HTTPS enforcement
│   │   ├── ratelimit.go      # Rate limiting
│   │   ├── security.go       # Security headers
│   │   └── request_id.go     # Request tracing
│   ├── server/
│   │   └── server.go         # Route registration
│   └── services/
│       └── upload.go         # Cloudinary integration
├── migrations/               # Goose SQL migrations
├── sql/
│   ├── schema.sql            # Full schema for sqlc
│   └── queries/              # Named SQL queries
└── sqlc.yaml                 # sqlc configuration
```

---

## Architectural Patterns

### Dependency Injection

All handlers receive dependencies via the `server.Deps` struct:

```go
type Deps struct {
    Pool           *pgxpool.Pool
    Q              *sqlcdb.Queries
    Issuer         auth.Issuer
    GoogleClientID string
    EventHub       *events.Hub
}
```

Handlers embed the dependencies they need:

```go
type ExpensesHandler struct {
    Pool *pgxpool.Pool
    Q    *sqlcdb.Queries
    Hub  *events.Hub
}
```

---

### Handler Pattern

Each handler struct implements methods for related routes:

```go
// handlers/expenses.go
func (h *ExpensesHandler) ListByGroup(c *gin.Context) { ... }
func (h *ExpensesHandler) CreateForGroup(c *gin.Context) { ... }
func (h *ExpensesHandler) Update(c *gin.Context) { ... }
func (h *ExpensesHandler) Delete(c *gin.Context) { ... }
```

---

### Middleware Chain

Order is critical in [`server.go`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/internal/server/server.go):

```go
r.Use(middleware.RecoveryWithLogger()) // 1. Panic recovery
r.Use(middleware.RequestID())          // 2. Request tracing
r.Use(middleware.CORS())               // 3. CORS headers
r.Use(middleware.SecurityHeaders())    // 4. Security headers
r.Use(middleware.RateLimit())          // 5. Rate limiting
r.Use(middleware.StructuredLogger())   // 6. Request logging
```

---

### Rate Limiting Strategy

Different endpoints have different risk profiles:

| Endpoint Type | Limit | Rationale |
|---------------|-------|-----------|
| Login/Register/OAuth | 5/15min | Credential-based, high risk |
| Token Refresh | 30/15min | Already authenticated, multi-tab support |
| Payments | 20/hour | Financial operations |
| General API | 60/min | Normal operations |
| Profile Lookup | 100/hour | Prevent enumeration |

Implementation in [`middleware/ratelimit.go`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/internal/middleware/ratelimit.go).

---

## Authentication

### Token Types

| Type | Claim | TTL | Purpose |
|------|-------|-----|---------|
| Access | `typ=access` | 15 min | API authentication |
| Refresh | `typ=refresh` | 30 days | Get new access tokens |

### Auth Middleware

The [`auth.Middleware`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/internal/auth/middleware.go) validates JWT and sets `userID` in context:

```go
// Get user ID in handler
userID := c.GetString("userID")
```

---

## Database

### Never Edit Generated Code

Files in `internal/db/sqlcdb/` are generated by sqlc. To modify:

1. Update `sql/schema.sql`
2. Add/modify queries in `sql/queries/*.sql`
3. Run `sqlc generate`

### Monetary Precision

Use `numeric(12,2)` in SQL which maps to Go `string` for exact decimal handling.

### Migration Rules

- Migrations are immutable (don't edit after deploy)
- Always include `-- +goose Down` for rollback
- Use `IF NOT EXISTS` for idempotency

---

## Event System

Real-time updates via Server-Sent Events:

```go
// Emit event
hub.Emit(groupID, events.Event{
    Type: "expense_created",
    Data: expense,
})

// Handler streams to client
func (h *EventsHandler) Stream(c *gin.Context) {
    // Validates auth via query param token
    // Subscribes to hub for group
    // Streams events as SSE
}
```

---

## Push Notifications

### VAPID Configuration

Requires environment variables:
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

### Send Push

```go
// handlers/push.go
SendPushToUser(ctx, q, userID, payload)
```

- No-ops if VAPID not configured
- Removes dead subscriptions on 410/404 errors

---

## Uploads

### Cloudinary Integration

Optional service in [`services/upload.go`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/internal/services/upload.go):

```go
svc, err := services.NewUploadService()
if err != nil {
    // Uploads disabled - returns nil service
}

// Upload returns URL
url, err := svc.Upload(ctx, file, "folder")
```

If not configured, upload endpoints return `503 Service Unavailable`.

---

## Testing

### Test Files

Tests are colocated with source:
- `handlers/auth_test.go`
- `handlers/expenses_test.go`
- `balance/calc_test.go`

### Run Tests

```bash
go test ./...                              # All tests
go test -v ./internal/handlers/...         # Verbose
go test -cover ./internal/balance/...      # Coverage
```

---

## Common Tasks

### Add a new endpoint

1. Add SQL query in `sql/queries/feature.sql`
2. Run `sqlc generate`
3. Create handler in `internal/handlers/feature.go`
4. Register route in `internal/server/server.go`
5. Add tests in `internal/handlers/feature_test.go`

### Add a new table

1. Create migration in `migrations/00X_feature.sql`
2. Update `sql/schema.sql`
3. Add queries in `sql/queries/feature.sql`
4. Run `goose up` then `sqlc generate`

---

## See Also

- [Reference Guide](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/REFERENCE.md) – Feature→code mappings
- [API.md](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/API.md) – Request/response formats
- [DATABASE.md](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/DATABASE.md) – Schema documentation
- [ARCHITECTURE.md](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/ARCHITECTURE.md) – System design
