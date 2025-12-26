# PayUp Profile + Payment QR + Proof Upload

This guide describes how the **profile payment QR upload** and **payment proof (receipt) upload** work in this repo.

## What we’re implementing

A user uploads their **GCash/Maya QR** once in Profile. When someone pays them, the payer:

- Opens the Pay modal
- Sees the payee’s QR
- Uploads a receipt screenshot
- Submits a payment that includes `proofUrl`

**Success looks like:** QR and proof images are uploaded (Cloudinary), stored as URLs in Postgres, and the UI uses real backend data (not local state).

## Assumptions (how this repo is set up)

- **DB already supports this**:
  - `users.qr_url` (stores the payment QR image URL)
  - `payments.proof_url` (stores the proof/receipt image URL)
- Uploads go to **Cloudinary** when configured; otherwise upload endpoints return **503**.

## Backend

### Database
No new migration needed: `users.qr_url` and `payments.proof_url` already exist.

### Env vars
Add these to your backend environment to enable uploads:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

(`env.example` includes these.)

### Routes
Implemented in `backend/internal/server/server.go`:

- **PATCH** `/v1/auth/profile` (auth)
  - `multipart/form-data`
  - fields:
    - `name` (optional)
    - `payment_qr` (optional file)
  - updates `users.name` and/or `users.qr_url`

- **GET** `/v1/users/:id/profile` (auth)
  - returns `{ id, name, avatarUrl, qrUrl }`

- **POST** `/v1/payments/upload-proof` (auth)
  - `multipart/form-data`
  - field: `proof` (file)
  - returns `{ proofUrl }`

- **POST** `/v1/payments` (auth)
  - JSON supports optional `proofUrl`

### Key files
- `backend/internal/services/upload.go`: Cloudinary upload implementation
- `backend/sql/queries/users.sql`: `UpdateUserProfile`, `GetUserPublicProfile`
- `backend/internal/handlers/auth.go`: profile update + public profile
- `backend/internal/handlers/payments.go`: proof upload endpoint

## Frontend

### API
Implemented in `frontend/src/payup/api/endpoints.ts`:

- `api.updateProfile(name?, paymentQRFile?)`
- `api.getUserPublicProfile(userId)`
- `api.uploadPaymentProof(file)`

Important: `frontend/src/payup/api/client.ts` avoids setting `Content-Type` for `FormData`.

### UI behavior
- `ProfileModal` now uploads an image file instead of editing a QR URL string.
- `PaymentModal`:
  - fetches payee QR from `/v1/users/:id/profile`
  - requires a receipt upload
  - uploads proof first, then creates the payment with `proofUrl`

### Auth refresh
After saving Profile, the app calls `refreshMe()` to refresh the authed user (so the new QR URL shows everywhere).

## Testing checklist

- Backend:
  - Start API with Cloudinary env vars set
  - `PATCH /v1/auth/profile` with `payment_qr` uploads and updates `users.qr_url`
  - `POST /v1/payments/upload-proof` returns `proofUrl`
  - `POST /v1/payments` stores `proof_url`

- Frontend:
  - Profile → upload QR → Save → open “My QR” and verify
  - Pay someone → QR loads → upload receipt → submit → receiver sees proof URL in pending payment
