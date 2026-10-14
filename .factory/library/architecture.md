# PayUp Architecture Reference

> High-level system architecture for documentation workers.

## Tech Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Frontend | React | ^19.2.0 |
| Build Tool | Vite | ^7.2.4 |
| Styling | TailwindCSS | ^3.4.17 |
| Routing | React Router DOM | ^7.10.1 |
| Data Fetching | TanStack React Query | ^5.90.12 |
| Backend | Go | 1.24.1 |
| HTTP Framework | Gin | v1.11.0 |
| Database | PostgreSQL | 16 |
| Driver | pgx/v5 | v5.7.6 |
| JWT | golang-jwt/jwt | v5 |

## Directory Structure

### Backend (`/backend`)
```
cmd/
  api/main.go              # Server entrypoint
  migrate/main.go          # Migration runner
internal/
  auth/                    # JWT tokens, middleware
  balance/                 # Balance calculation
  config/                  # Environment config
  db/sqlcdb/               # Generated sqlc code
  events/                  # SSE event hub
  handlers/                # HTTP route handlers
    auth.go                # Authentication
    groups.go              # Group CRUD
    expenses.go            # Expense CRUD
    payments.go            # Payment flow
    nudges.go              # Reminders
    push.go                # Push subscriptions
    ocr.go                 # OCR (receipt scanning)
    events.go              # SSE streaming
    activity.go            # Activity log
    invites.go             # Invite preview
    balances.go            # Balance queries
    validation.go          # Input validation
  middleware/              # HTTP middleware
    cors.go
    ratelimit.go
    security.go
    errors.go              # Error sanitization
    https.go               # HTTPS enforcement
    request_id.go
    logger.go
  server/server.go         # Route registration
  services/upload.go       # Cloudinary integration
migrations/                # Goose migrations
sql/
  schema.sql               # Full schema
  queries/*.sql            # Named queries
```

### Frontend (`/frontend`)
```
src/
  main.tsx                 # App entry
  App.tsx                  # Router config
  payup/
    PayUpApp.tsx           # Main app
    api/
      client.ts            # HTTP client with auth
      endpoints.ts         # API wrappers
    auth/
      AuthProvider.tsx     # Auth context
      useAuth.ts           # Auth hook
      RequireAuth.tsx      # Protected routes
      _internal/context.ts # Context definition
    components/
      AppShell.tsx
      Header.tsx           # NOT FOUND - may be outdated
      BottomNav.tsx        # NOT FOUND - may be outdated
      ActivityFeed.tsx
      NotificationView.tsx
      WalletView.tsx
      OfflineIndicator.tsx
      PWAInstallGuide.tsx
      PullToRefreshIndicator.tsx
      Skeleton.tsx
      Toast.tsx
      NetworkBackground.tsx
      modals/
        AddExpenseModal.tsx
        PaymentModal.tsx
        ProfileModal.tsx
        CreateGroupModal.tsx
        JoinGroupModal.tsx
        MembersModal.tsx
        MyQrModal.tsx
        SideMenu.tsx
        ShareInviteModal.tsx   # Was "InviteModal"
        PushNotificationPrompt.tsx # Was "PushPromptModal"
        ReceiptScanFlow.tsx
        ReceiptScanner.tsx
        ReceiptItemsList.tsx
        ItemAssignment.tsx
        ModalWrapper.tsx
        ConfirmDialog.tsx
        InstallPrompt.tsx
    pages/
      LandingPage.tsx
      OnboardingPage.tsx
      LoginPage.tsx
      RegisterPage.tsx
      JoinGroupPage.tsx
      auth/
        ForgotPasswordPage.tsx
        ResetPasswordPage.tsx
    hooks/
      useGroupEvents.ts
      useOnlineStatus.ts
      usePullToRefresh.ts
    push/
      pushManager.ts
    utils/
      receiptParser.ts
      receiptOCR.ts
      imageCompression.ts
      sanitize.ts
    constants/
      PaymentProviders.ts    # Not categories.ts
    ui/
      users.ts               # Not Button.tsx
```

## API Routes (Source of Truth)

From `backend/internal/server/server.go`:

### Public (No Auth)
- `GET /health`
- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `POST /v1/auth/google`
- `POST /v1/auth/refresh`
- `POST /v1/auth/reset-request`
- `POST /v1/auth/reset`
- `GET /v1/invites/:code/preview`

### Authenticated
- `GET /v1/auth/me`
- `PATCH /v1/auth/profile`
- `GET /v1/auth/payment-qr`
- `POST /v1/auth/payment-qr`
- `DELETE /v1/auth/payment-qr/:id`
- `PATCH /v1/auth/payment-qr/:id/primary`
- `PATCH /v1/auth/payment-qr/:id/phone`
- `GET /v1/users/:id/profile`
- `GET /v1/groups`
- `POST /v1/groups`
- `GET /v1/groups/:id`
- `POST /v1/groups/:id/invite`
- `POST /v1/groups/join/:code`
- `DELETE /v1/groups/:id/leave`
- `DELETE /v1/groups/:id/members/:userId`
- `GET /v1/groups/:id/activity`
- `GET /v1/groups/:id/events` (SSE)
- `GET /v1/groups/:id/expenses`
- `POST /v1/groups/:id/expenses`
- `PATCH /v1/expenses/:id`
- `DELETE /v1/expenses/:id`
- `GET /v1/groups/:id/balances`
- `POST /v1/payments`
- `GET /v1/payments`
- `PATCH /v1/payments/:id/approve`
- `PATCH /v1/payments/:id/reject`
- `POST /v1/payments/upload-proof`
- `POST /v1/nudges`
- `GET /v1/nudges`
- `GET /v1/nudges/unread-count`
- `PATCH /v1/nudges/:id/read`
- `POST /v1/nudges/mark-all-read`
- `POST /v1/push/subscribe`
- `DELETE /v1/push/unsubscribe`
- `POST /v1/ocr`

## Middleware Order (Critical)

From `server.go`:
1. `RecoveryWithLogger()` - Panic recovery
2. `RequestID()` - Request tracing
3. `CORS()` - CORS headers
4. `SecurityHeaders()` - Security headers
5. `RateLimit()` - General rate limiting
6. `StructuredLogger()` - Request logging
7. `EnforceHTTPS()` - HTTPS (production only)

## Rate Limits

From `middleware/ratelimit.go`:
- General API: 60/minute
- Auth (login/register): 5 per 15 minutes
- Token Refresh: 30 per 15 minutes
- Payments: 20 per hour
- Profile Lookup: 100 per hour (NOT 30/min)

## Key Implementation Details

### Token Storage
- Access token: sessionStorage, key `payup_access_token`, 15min TTL
- Refresh token: localStorage, key `payup_refresh_token`, 30-day TTL
- Proactive refresh: 2 minutes before expiry

### Request/Response Field Names
- Google Auth: expects `idToken` (not `credential`)
- Reset Password: expects `newPassword` (not `password`)
- Update Profile: accepts `name`, `avatar`, `payment_qr`

### Balance Calculation
- Positive balance = owed money (credit)
- Negative balance = owes money (debt)
- Computed from expenses and expense_splits tables
