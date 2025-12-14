# API

Source of truth: `backend/internal/server/server.go`

## Conventions

- Base path: `/v1`
- Auth: `Authorization: Bearer <accessToken>`
- Errors: `{ "error": "message" }`

## Health

- `GET /health` → `{ "status": "ok" }`

## Auth

- `POST /v1/auth/register`
  - Body: `{ email, password, name }`
  - Returns: `{ user, token: { accessToken, refreshToken } }`

- `POST /v1/auth/login`
  - Body: `{ email, password }`
  - Returns: `{ user, token: { accessToken, refreshToken } }`

- `POST /v1/auth/refresh`
  - Body: `{ refreshToken }`
  - Returns: `{ token: { accessToken, refreshToken } }`

- `GET /v1/auth/me` (auth)
  - Returns: `{ id, email, name?, avatarUrl?, qrUrl?, createdAt, updatedAt }`

- `PATCH /v1/auth/profile` (auth)
  - Content-Type: `multipart/form-data`
  - Fields:
    - `name` (optional)
    - `payment_qr` file (optional)
  - Returns: `{ message: "profile updated" }`

- `GET /v1/users/:id/profile` (auth)
  - Returns: `{ id, name?, avatarUrl?, qrUrl? }`

## Groups

- `GET /v1/groups` (auth)
  - Returns: `[{ id, name, createdAt }]`

- `POST /v1/groups` (auth)
  - Body: `{ name }`
  - Returns: `{ id, name, createdAt }`

- `GET /v1/groups/:id` (auth)
  - Returns: `{ id, name, createdAt, members: [{ userId, name?, avatarUrl?, role, joinedAt }] }`

- `POST /v1/groups/:id/invite` (auth)
  - Returns: `{ code, expiresAt? }`

- `POST /v1/groups/join/:code` (auth)
  - Returns: `{ groupId }`

## Expenses

- `GET /v1/groups/:id/expenses` (auth)

- `POST /v1/groups/:id/expenses` (auth)
  - Body: `{ title, amount, payerId, mode?, type?, splits: Record<userId, amount> }`
  - Validation: `splits` must sum exactly to `amount`

- `DELETE /v1/expenses/:id` (auth)
  - Allowed: payer or creator
  - Returns: `204 No Content`

## Balances

- `GET /v1/groups/:id/balances` (auth)
  - Returns: `Record<userId, number>`

## Payments

- `POST /v1/payments` (auth)
  - Body: `{ groupId, receiverId, amount, proofUrl? }`

- `GET /v1/payments?status=pending|approved|rejected` (auth)
  - Note: defaults to `pending`
  - Returns payments for the **receiver**

- `PATCH /v1/payments/:id/approve` (auth)
  - Only receiver can approve
  - On approve: creates a transfer expense (settlement) to affect balances

- `PATCH /v1/payments/:id/reject` (auth)

- `POST /v1/payments/upload-proof` (auth)
  - Content-Type: `multipart/form-data`
  - Field: `proof` file
  - Returns: `{ proofUrl }`

## Nudges

- `POST /v1/nudges` (auth)
  - Body: `{ debtorId, groupId, amount, message? }`
  - Side-effect: triggers push (if configured)

- `GET /v1/nudges` (auth)

- `GET /v1/nudges/unread-count` (auth)
  - Returns: `{ count }`

- `PATCH /v1/nudges/:id/read` (auth)

- `POST /v1/nudges/mark-all-read` (auth)

## Push

- `POST /v1/push/subscribe` (auth)
  - Body: `{ endpoint, keys: { p256dh, auth } }`

- `DELETE /v1/push/unsubscribe?endpoint=...` (auth)
