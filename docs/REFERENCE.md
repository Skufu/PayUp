# PayUp Reference Guide

> Quick navigation and search reference for the PayUp codebase.

---

## Keywords

`expense splitting` `group expenses` `balance calculation` `payment settlement` `split bills` `debt tracking` `nudge reminders` `push notifications` `PWA` `React` `Go` `PostgreSQL` `JWT authentication` `OAuth` `Cloudinary uploads` `VAPID web push` `GCash` `Maya`

---

## Table of Contents

- [Glossary](#glossary)
- [High-signal Entrypoints](#high-signal-entrypoints)
- [Feature → Code Map](#feature--code-map)
- [API Route Reference](#api-route-reference)
- [Database Tables](#database-tables)
- [Common Questions](#common-questions)
- [Environment Variables](#environment-variables)
- [See Also](#see-also)

---

## Glossary

| Term | Definition |
|------|------------|
| **Group** | A collection of users who share expenses together |
| **Expense** | A purchase or cost paid by one member, split among group members |
| **Split** | How an expense amount is divided among participants (equal, exact, percentage, or hybrid) |
| **Balance** | Net amount a user owes or is owed within a group (positive = owed money, negative = owes money) |
| **Payment** | A settlement transaction from one user to another to reduce debt |
| **Nudge** | A reminder notification sent to a debtor about outstanding balance |
| **Transfer** | A special expense type created when a payment is approved, affecting balances |
| **PWA** | Progressive Web App - installable web application with offline support |
| **Access Token** | Short-lived JWT (15min) for API authentication |
| **Refresh Token** | Long-lived JWT (30 days) for obtaining new access tokens |

---

## High-signal Entrypoints

Start here when exploring the codebase:

| Purpose | File |
|---------|------|
| Backend API routes | [`backend/internal/server/server.go`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/internal/server/server.go) |
| Backend main | [`backend/cmd/api/main.go`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/cmd/api/main.go) |
| Frontend app root | [`frontend/src/payup/PayUpApp.tsx`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/frontend/src/payup/PayUpApp.tsx) |
| Frontend API client | [`frontend/src/payup/api/client.ts`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/frontend/src/payup/api/client.ts) |
| Frontend endpoints | [`frontend/src/payup/api/endpoints.ts`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/frontend/src/payup/api/endpoints.ts) |
| Database schema | [`backend/sql/schema.sql`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/sql/schema.sql) |
| Migrations | `backend/migrations/*.sql` |
| SQL queries | `backend/sql/queries/*.sql` |

---

## Feature → Code Map

### Authentication & Users
| Feature | Backend | Frontend |
|---------|---------|----------|
| JWT tokens (access/refresh) | [`internal/auth/tokens.go`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/internal/auth/tokens.go) | [`api/client.ts`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/frontend/src/payup/api/client.ts) |
| Auth middleware | [`internal/auth/middleware.go`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/internal/auth/middleware.go) | - |
| Login/register/refresh | [`internal/handlers/auth.go`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/internal/handlers/auth.go) | [`auth/AuthProvider.tsx`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/frontend/src/payup/auth/AuthProvider.tsx) |
| Google OAuth | [`internal/handlers/auth.go`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/internal/handlers/auth.go) | Uses `@react-oauth/google` |
| Password reset | [`internal/handlers/auth.go`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/internal/handlers/auth.go) | - |
| Payment QR management | [`internal/handlers/auth.go`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/internal/handlers/auth.go) | Profile modal |

### Groups & Invites
| Feature | Backend | Frontend |
|---------|---------|----------|
| Group CRUD | [`internal/handlers/groups.go`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/internal/handlers/groups.go) | [`PayUpApp.tsx`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/frontend/src/payup/PayUpApp.tsx) |
| Invite codes | [`internal/handlers/groups.go`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/internal/handlers/groups.go) | Invite modal |
| Invite preview (public) | [`internal/handlers/invites.go`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/internal/handlers/invites.go) | Join page |
| Leave/remove members | [`internal/handlers/groups.go`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/internal/handlers/groups.go) | Member management |

### Expenses & Splits
| Feature | Backend | Frontend |
|---------|---------|----------|
| Create/list/update/delete | [`internal/handlers/expenses.go`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/internal/handlers/expenses.go) | Add expense modal |
| Split validation | [`internal/handlers/validation.go`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/internal/handlers/validation.go) | Form validation |
| Receipt OCR parsing | - | [`utils/receiptParser.ts`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/frontend/src/payup/utils/receiptParser.ts) |

### Balances & Payments
| Feature | Backend | Frontend |
|---------|---------|----------|
| Balance calculation | [`internal/handlers/balances.go`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/internal/handlers/balances.go), [`internal/balance/*`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/internal/balance) | - |
| Payment create/approve/reject | [`internal/handlers/payments.go`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/internal/handlers/payments.go) | Payment modal |
| Payment proof upload | [`internal/handlers/payments.go`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/internal/handlers/payments.go) | Camera/upload UI |

### Notifications
| Feature | Backend | Frontend |
|---------|---------|----------|
| Nudges (reminders) | [`internal/handlers/nudges.go`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/internal/handlers/nudges.go) | Nudge button |
| Push subscriptions | [`internal/handlers/push.go`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/internal/handlers/push.go) | [`push/pushManager.ts`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/frontend/src/payup/push/pushManager.ts) |
| Service worker | - | [`public/sw.js`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/frontend/public/sw.js) |

### Real-time & Activity
| Feature | Backend | Frontend |
|---------|---------|----------|
| SSE events stream | [`internal/handlers/events.go`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/internal/handlers/events.go), [`internal/events/*`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/internal/events) | EventSource |
| Activity log | [`internal/handlers/activity.go`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/internal/handlers/activity.go) | Activity feed |

### Uploads
| Feature | Backend | Frontend |
|---------|---------|----------|
| Cloudinary integration | [`internal/services/upload.go`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/internal/services/upload.go) | - |

---

## API Route Reference

All routes defined in [`backend/internal/server/server.go`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/internal/server/server.go).

### Health
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/health` | No | Health check |

### Authentication
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/v1/auth/register` | No | Create new account |
| POST | `/v1/auth/login` | No | Login with email/password |
| POST | `/v1/auth/google` | No | Google OAuth login |
| POST | `/v1/auth/refresh` | No | Refresh access token |
| POST | `/v1/auth/reset-request` | No | Request password reset |
| POST | `/v1/auth/reset` | No | Reset password with token |
| GET | `/v1/auth/me` | Yes | Get current user profile |
| PATCH | `/v1/auth/profile` | Yes | Update profile (name, avatar) |
| GET | `/v1/auth/payment-qr` | Yes | List payment QR codes |
| POST | `/v1/auth/payment-qr` | Yes | Add payment QR code |
| DELETE | `/v1/auth/payment-qr/:id` | Yes | Delete payment QR code |
| PATCH | `/v1/auth/payment-qr/:id/primary` | Yes | Set primary payment QR |
| PATCH | `/v1/auth/payment-qr/:id/phone` | Yes | Update payment QR phone |

### Users
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/v1/users/:id/profile` | Yes | Get user's public profile |

### Groups
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/v1/groups` | Yes | List user's groups |
| POST | `/v1/groups` | Yes | Create new group |
| GET | `/v1/groups/:id` | Yes | Get group details with members |
| POST | `/v1/groups/:id/invite` | Yes | Generate invite code |
| POST | `/v1/groups/join/:code` | Yes | Join group via invite code |
| DELETE | `/v1/groups/:id/leave` | Yes | Leave group |
| DELETE | `/v1/groups/:id/members/:userId` | Yes | Remove member from group |
| GET | `/v1/groups/:id/activity` | Yes | Get group activity log |
| GET | `/v1/groups/:id/events` | Yes* | SSE stream for real-time updates |

### Invites
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/v1/invites/:code/preview` | No | Preview invite (group name, member count) |

### Expenses
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/v1/groups/:id/expenses` | Yes | List group expenses |
| POST | `/v1/groups/:id/expenses` | Yes | Create expense with splits |
| PATCH | `/v1/expenses/:id` | Yes | Update expense |
| DELETE | `/v1/expenses/:id` | Yes | Delete expense |

### Balances
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/v1/groups/:id/balances` | Yes | Get computed balances for group |

### Payments
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/v1/payments` | Yes | Create payment request |
| GET | `/v1/payments` | Yes | List payments (filter by status) |
| PATCH | `/v1/payments/:id/approve` | Yes | Approve payment (receiver only) |
| PATCH | `/v1/payments/:id/reject` | Yes | Reject payment (receiver only) |
| POST | `/v1/payments/upload-proof` | Yes | Upload payment proof image |

### Nudges
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/v1/nudges` | Yes | Send payment reminder |
| GET | `/v1/nudges` | Yes | List received nudges |
| GET | `/v1/nudges/unread-count` | Yes | Count unread nudges |
| PATCH | `/v1/nudges/:id/read` | Yes | Mark nudge as read |
| POST | `/v1/nudges/mark-all-read` | Yes | Mark all nudges as read |

### Push Notifications
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/v1/push/subscribe` | Yes | Subscribe to push notifications |
| DELETE | `/v1/push/unsubscribe` | Yes | Unsubscribe from push |

---

## Database Tables

Defined in [`backend/sql/schema.sql`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/sql/schema.sql).

| Table | Purpose |
|-------|---------|
| `users` | User accounts (email, password hash, profile) |
| `oauth_accounts` | OAuth provider links (Google, etc.) |
| `groups` | Expense-sharing groups |
| `group_members` | Group membership with roles |
| `group_invites` | Invite codes with expiry and usage limits |
| `expenses` | Expense records (title, amount, payer, category) |
| `expense_splits` | How each expense is split among users |
| `payments` | Settlement transactions between users |
| `nudges` | Payment reminder notifications |
| `push_subscriptions` | Web push subscription endpoints |
| `payment_qr_codes` | User payment QR codes (GCash, Maya) |
| `activity_log` | Group activity history |

---

## Common Questions

### How do I...

**Find where HTTP routes are registered?**
→ [`backend/internal/server/server.go`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/internal/server/server.go)

**Understand how refresh tokens work?**
→ [`backend/internal/auth/tokens.go`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/internal/auth/tokens.go) for token generation
→ [`backend/internal/handlers/auth.go`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/internal/handlers/auth.go) `Refresh` handler
→ [`frontend/src/payup/api/client.ts`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/frontend/src/payup/api/client.ts) for proactive refresh

**See how balances are computed from expenses?**
→ [`backend/internal/balance/calc.go`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/internal/balance/calc.go) for the algorithm
→ [`backend/internal/handlers/balances.go`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/internal/handlers/balances.go) for the API handler

**Understand what happens when a payment is approved?**
→ [`backend/internal/handlers/payments.go`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/internal/handlers/payments.go) `Approve` method creates a transfer expense

**Find where push subscriptions are stored?**
→ `push_subscriptions` table in [`backend/sql/schema.sql`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/sql/schema.sql)
→ [`backend/internal/handlers/push.go`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/internal/handlers/push.go) for subscribe/unsubscribe

**Locate the service worker?**
→ [`frontend/public/sw.js`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/frontend/public/sw.js) for the worker
→ [`frontend/src/main.tsx`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/frontend/src/main.tsx) for registration

**Add a new API endpoint?**
1. Add SQL query in `backend/sql/queries/*.sql`
2. Run `sqlc generate`
3. Add handler in `backend/internal/handlers/`
4. Register route in `backend/internal/server/server.go`
5. Add frontend endpoint in `frontend/src/payup/api/endpoints.ts`

**Add a new database table?**
1. Create migration in `backend/migrations/`
2. Update `backend/sql/schema.sql`
3. Add queries in `backend/sql/queries/`
4. Run `goose up` then `sqlc generate`

---

## Environment Variables

Full reference in [`env.example`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/env.example).

### Backend (Required)
| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `PORT` | HTTP server port (default: 8080) |

### Backend (Optional)
| Variable | Purpose |
|----------|---------|
| `ACCESS_TOKEN_TTL_MINUTES` | Access token lifetime (default: 15) |
| `REFRESH_TOKEN_TTL_HOURS` | Refresh token lifetime (default: 720) |
| `CORS_ORIGINS` | Allowed origins for CORS |
| `CLOUDINARY_*` | Cloudinary credentials for uploads |
| `VAPID_*` | VAPID keys for web push |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GIN_MODE` | `debug` or `release` |

### Frontend (Optional)
| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | API base URL (uses proxy in dev) |
| `VITE_VAPID_PUBLIC_KEY` | VAPID public key for push |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID |

---

## See Also

- [README.md](file:///c:/Users/ADRIAN/Github/skufu/PayUp/README.md) – Quick start and setup
- [CLAUDE.md](file:///c:/Users/ADRIAN/Github/skufu/PayUp/CLAUDE.md) – Comprehensive development guide
- [ARCHITECTURE.md](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/ARCHITECTURE.md) – System design and flow
- [API.md](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/API.md) – API request/response details
- [DATABASE.md](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/DATABASE.md) – Schema documentation
- [FRONTEND.md](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/FRONTEND.md) – React/Vite patterns
- [BACKEND.md](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/BACKEND.md) – Go/Gin patterns
- [DEPLOYMENT.md](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/DEPLOYMENT.md) – Deployment guide
- [UX_SPEC.md](file:///c:/Users/ADRIAN/Github/skufu/PayUp/UX_SPEC.md) – UX decisions and patterns
