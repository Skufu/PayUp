# API Reference

> Request and response formats for the PayUp API.

---

## Keywords

`REST API` `HTTP endpoints` `JSON` `authentication` `authorization` `JWT bearer token` `request body` `response format` `error handling` `rate limiting`

---

## Conventions

| Aspect | Convention |
|--------|------------|
| Base path | `/v1` |
| Content-Type | `application/json` (unless noted) |
| Authentication | `Authorization: Bearer <accessToken>` |
| Error format | `{ "error": "message" }` |
| Monetary amounts | String (numeric precision preserved) |
| IDs | UUID v4 strings |
| Timestamps | ISO 8601 format |

---

## Quick Reference

| Category | Endpoints |
|----------|-----------|
| Health | `GET /health` |
| Auth | `POST register`, `login`, `google`, `refresh`, `reset-request`, `reset`; `GET me`; `PATCH profile` |
| Payment QR | `GET`, `POST`, `DELETE`, `PATCH` `/v1/auth/payment-qr/*` |
| Groups | `GET list`, `POST create`, `GET detail`, `POST invite`, `POST join`, `DELETE leave/remove` |
| Expenses | `GET list`, `POST create`, `PATCH update`, `DELETE` |
| Balances | `GET /v1/groups/:id/balances` |
| Payments | `POST create`, `GET list`, `PATCH approve/reject`, `POST upload-proof` |
| Nudges | `POST create`, `GET list`, `GET unread-count`, `PATCH read`, `POST mark-all-read` |
| Push | `POST subscribe`, `DELETE unsubscribe` |

Source of truth: [`backend/internal/server/server.go`](file:///c:/Users/ADRIAN/Github/skufu/PayUp/backend/internal/server/server.go)

---

## Health

### GET /health

Check if the API is running.

**Response:**
```json
{ "status": "ok" }
```

---

## Authentication

### POST /v1/auth/register

Create a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2026-01-01T00:00:00Z"
  },
  "token": {
    "accessToken": "jwt...",
    "refreshToken": "jwt..."
  }
}
```

---

### POST /v1/auth/login

Authenticate with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:** Same as register.

---

### POST /v1/auth/google

Authenticate with Google OAuth.

**Request:**
```json
{
  "idToken": "google-id-token"
}
```

**Response:** Same as register.

---

### POST /v1/auth/refresh

Get new tokens using refresh token.

**Request:**
```json
{
  "refreshToken": "jwt..."
}
```

**Response:**
```json
{
  "token": {
    "accessToken": "jwt...",
    "refreshToken": "jwt..."
  }
}
```

---

### POST /v1/auth/reset-request

Request a password reset email.

**Request:**
```json
{
  "email": "user@example.com"
}
```

---

### POST /v1/auth/reset

Reset password with token.

**Request:**
```json
{
  "token": "reset-token",
  "newPassword": "newpassword"
}
```

---

### GET /v1/auth/me

Get current user profile. **Requires auth.**

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "avatarUrl": "https://...",
  "qrUrl": "https://...",
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-01-01T00:00:00Z"
}
```

---

### PATCH /v1/auth/profile

Update profile. **Requires auth.**

**Content-Type:** `multipart/form-data`

**Fields:**
- `name` (optional) – Display name
- `avatar` (optional) – Avatar image file
- `payment_qr` (optional) – QR code image file

**Response:**
```json
{ "message": "profile updated" }
```

---

### GET /v1/users/:id/profile

Get another user's public profile. **Requires auth.**

**Response:**
```json
{
  "id": "uuid",
  "name": "John Doe",
  "avatarUrl": "https://..."
}
```

---

## Payment QR Codes

### GET /v1/auth/payment-qr

List user's payment QR codes. **Requires auth.**

**Response:**
```json
[
  {
    "id": "uuid",
    "provider": "gcash",
    "qrUrl": "https://...",
    "phoneNumber": "09171234567",
    "isPrimary": true
  }
]
```

---

### POST /v1/auth/payment-qr

Add a payment QR code. **Requires auth.**

**Content-Type:** `multipart/form-data`

**Fields:**
- `provider` – "gcash", "maya", etc.
- `qr_image` – QR code image file
- `phone_number` (optional)

---

### DELETE /v1/auth/payment-qr/:id

Delete a payment QR code. **Requires auth.**

---

### PATCH /v1/auth/payment-qr/:id/primary

Set a QR code as primary. **Requires auth.**

---

### PATCH /v1/auth/payment-qr/:id/phone

Update QR phone number. **Requires auth.**

**Request:**
```json
{
  "phoneNumber": "09171234567"
}
```

---

## Groups

### GET /v1/groups

List user's groups. **Requires auth.**

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Roommates",
    "createdAt": "2026-01-01T00:00:00Z"
  }
]
```

---

### POST /v1/groups

Create a group. **Requires auth.**

**Request:**
```json
{
  "name": "Roommates"
}
```

---

### GET /v1/groups/:id

Get group details with members. **Requires auth + membership.**

**Response:**
```json
{
  "id": "uuid",
  "name": "Roommates",
  "createdAt": "2026-01-01T00:00:00Z",
  "members": [
    {
      "userId": "uuid",
      "name": "John Doe",
      "avatarUrl": "https://...",
      "role": "admin",
      "joinedAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

---

### POST /v1/groups/:id/invite

Generate an invite code. **Requires auth + membership.**

**Response:**
```json
{
  "code": "abc123",
  "expiresAt": "2026-01-08T00:00:00Z"
}
```

---

### GET /v1/invites/:code/preview

Preview invite without auth. **Public endpoint.**

**Response:**
```json
{
  "groupId": "uuid",
  "groupName": "Roommates",
  "memberCount": 4,
  "createdByName": "John Doe",
  "createdByAvatar": "https://...",
  "expiresAt": "2026-01-08T00:00:00Z",
  "isValid": true,
  "invalidReason": ""
}
```

---

### POST /v1/groups/join/:code

Join a group via invite code. **Requires auth.**

**Response:**
```json
{
  "groupId": "uuid"
}
```

---

### DELETE /v1/groups/:id/leave

Leave a group. **Requires auth + membership.**

---

### DELETE /v1/groups/:id/members/:userId

Remove a member. **Requires auth + admin role.**

---

### GET /v1/groups/:id/activity

Get group activity log. **Requires auth + membership.**

**Response:**
```json
[
  {
    "id": "uuid",
    "activityType": "expense_created",
    "description": "John added Groceries",
    "metadata": {},
    "createdAt": "2026-01-01T00:00:00Z"
  }
]
```

---

### GET /v1/groups/:id/events

SSE stream for real-time updates. **Requires auth via query param.**

---

## Expenses

### GET /v1/groups/:id/expenses

List group expenses. **Requires auth + membership.**

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Groceries",
    "amount": "150.00",
    "payerId": "uuid",
    "payerName": "John Doe",
    "category": "food",
    "mode": "equal",
    "type": null,
    "createdAt": "2026-01-01T00:00:00Z",
    "splits": {
      "user-uuid-1": "75.00",
      "user-uuid-2": "75.00"
    }
  }
]
```

---

### POST /v1/groups/:id/expenses

Create an expense. **Requires auth + membership.**

**Request:**
```json
{
  "title": "Groceries",
  "amount": "150.00",
  "payerId": "uuid",
  "category": "food",
  "mode": "equal",
  "splits": {
    "user-uuid-1": "75.00",
    "user-uuid-2": "75.00"
  }
}
```

> **Note:** `splits` must sum exactly to `amount`.

---

### PATCH /v1/expenses/:id

Update an expense. **Requires auth + payer/creator.**

**Request:** Same fields as create (partial update supported).

---

### DELETE /v1/expenses/:id

Delete an expense. **Requires auth + payer/creator.**

**Response:** `204 No Content`

---

## Balances

### GET /v1/groups/:id/balances

Get computed balances. **Requires auth + membership.**

**Response:**
```json
{
  "user-uuid-1": "50.00",
  "user-uuid-2": "-50.00"
}
```

> Positive = owed money (credit), Negative = owes money (debt)

---

## Payments

### POST /v1/payments

Create a payment request. **Requires auth.**

**Request:**
```json
{
  "groupId": "uuid",
  "receiverId": "uuid",
  "amount": "50.00",
  "proofUrl": "https://..." 
}
```

---

### GET /v1/payments

List payments. **Requires auth.**

**Query params:**
- `status` – `pending` (default), `approved`, `rejected`

**Response:**
```json
[
  {
    "id": "uuid",
    "groupId": "uuid",
    "senderId": "uuid",
    "receiverId": "uuid",
    "amount": "50.00",
    "status": "pending",
    "proofUrl": "https://...",
    "createdAt": "2026-01-01T00:00:00Z"
  }
]
```

---

### PATCH /v1/payments/:id/approve

Approve a payment. **Requires auth + receiver only.**

> Creates a transfer expense affecting balances.

---

### PATCH /v1/payments/:id/reject

Reject a payment. **Requires auth + receiver only.**

---

### POST /v1/payments/upload-proof

Upload payment proof image. **Requires auth.**

**Content-Type:** `multipart/form-data`

**Fields:**
- `proof` – Image file

**Response:**
```json
{
  "proofUrl": "https://..."
}
```

---

## Nudges

### POST /v1/nudges

Send a payment reminder. **Requires auth.**

**Request:**
```json
{
  "debtorId": "uuid",
  "groupId": "uuid",
  "amount": "50.00",
  "message": "Hey, please pay up!"
}
```

> Triggers push notification if configured.

---

### GET /v1/nudges

List received nudges. **Requires auth.**

---

### GET /v1/nudges/unread-count

Count unread nudges. **Requires auth.**

**Response:**
```json
{
  "count": 3
}
```

---

### PATCH /v1/nudges/:id/read

Mark nudge as read. **Requires auth.**

---

### POST /v1/nudges/mark-all-read

Mark all nudges as read. **Requires auth.**

---

## Push Notifications

### POST /v1/push/subscribe

Subscribe to push notifications. **Requires auth.**

**Request:**
```json
{
  "endpoint": "https://fcm.googleapis.com/...",
  "keys": {
    "p256dh": "base64...",
    "auth": "base64..."
  }
}
```

---

### DELETE /v1/push/unsubscribe

Unsubscribe from push. **Requires auth.**

**Query params:**
- `endpoint` – The subscription endpoint

---

## OCR (Receipt Scanning)

### POST /v1/ocr

Extract text from a receipt image using AI. **Requires auth.**

**Request:**
```json
{
  "imageData": "base64-encoded-image-data"
}
```

**Response:**
```json
{
  "text": "Store Name\nItem 1......$10.00\nItem 2......$5.00\nTotal.......$15.00"
}
```

> **Note:** Requires `GEMINI_API_KEY` to be configured on the server.

---

## Error Responses

| Status | Meaning |
|--------|---------|
| 400 | Bad request (validation failed) |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (not a member, not authorized) |
| 404 | Not found |
| 409 | Conflict (duplicate email, already member) |
| 429 | Rate limited (check `Retry-After` header) |
| 500 | Server error |
| 503 | Service unavailable (uploads not configured) |

**Error format:**
```json
{
  "error": "descriptive error message"
}
```

---

## Rate Limiting

| Endpoint Category | Limit |
|-------------------|-------|
| Login/Register/OAuth | 5 per 15 minutes |
| Token Refresh | 30 per 15 minutes |
| Payments | 20 per hour |
| General API | 60 per minute |
| Profile Lookup | 100 per hour |

**Headers returned:**
- `X-RateLimit-Limit` – Max requests
- `X-RateLimit-Remaining` – Requests left
- `X-RateLimit-Reset` – Reset timestamp
- `Retry-After` – Seconds until retry (on 429)

---

## See Also

- [Reference Guide](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/REFERENCE.md) – Feature→code mappings
- [ARCHITECTURE.md](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/ARCHITECTURE.md) – Request flow diagrams
- [BACKEND.md](file:///c:/Users/ADRIAN/Github/skufu/PayUp/docs/BACKEND.md) – Handler implementation details
