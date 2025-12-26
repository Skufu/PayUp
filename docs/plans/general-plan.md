# PayUp – Build Plan

This document is the step‑by‑step plan to take PayUp from a single React/Firebase prototype to a production‑ready web + mobile‑responsive app with a Go/Postgres backend.

We will work through this file **top to bottom**, one section at a time.

---

## 0. Tech Stack & High‑Level Architecture

**Frontend**
- React (current UI, componentized)
- React Router
- React Query (or SWR) for data fetching
- Deployed on Vercel
- PWA support for mobile‑like experience

**Backend**
- Go + Gin (HTTP API)
- Postgres (Neon)
- sqlc for type‑safe queries
- goose for DB migrations
- Deployed on Render

**Other Services**
- File storage for receipts (Cloudinary/Supabase/S3 – choose later)
- Error tracking (Sentry)
- Email (Resend/SendGrid – choose later)

---

## 1. Project Structure & Repos

**Goal:** Set up a clean base so frontend and backend can evolve independently.

**Tasks**
- [x] Create monorepo structure:
  - `/frontend` – React app
  - `/backend` – Go API
  - `/docs` – Design notes, DB diagrams, API contracts
- [x] Add shared `PLAN.md` (this file)
- [x] Initialize Git (if not already) and push to GitHub
- [x] Set up basic `.gitignore` for Node, Go, and env files

**Acceptance Criteria**
- Running `npm run dev` in `/frontend` starts the UI
- Running `go run ./cmd/api` in `/backend` starts a basic server that answers `GET /health` with `200 OK`

---

## 2. Database Design & Migrations

**Goal:** Design the core data model and create migrations with goose.

**Initial Tables**

- `users`
- `groups`
- `group_members`
- `expenses`
- `expense_splits`
- `payments`
- (optional later) `balances` materialized or computed

**ERD (text)**

```
users 1---* group_members *---1 groups
groups 1---* expenses
expenses 1---* expense_splits *---1 users
groups 1---* payments
users 1---* payments (sender_id)
users 1---* payments (receiver_id)
```

**Tasks**
- [x] Draft an ERD (even simple text diagram is fine)
- [x] Define SQL schema for all core tables
- [x] Initialize goose in `/backend`
- [x] Create initial migration `001_init.sql` with all tables
- [x] Connect backend to Neon Postgres and run migration

**Acceptance Criteria**
- `goose up` runs successfully against the Neon database
- All tables exist and can be inspected with a SQL client

---

## 3. Backend – Auth & User Management

**Goal:** Replace the current anonymous Firebase approach with proper email‑based accounts.

**Auth Model**
- Email + password
- JWT access + refresh tokens
- Later: optional social login

**Endpoints**
- `POST /v1/auth/register`
- `POST /v1/auth/login`
- `POST /v1/auth/refresh`
- `GET /v1/auth/me` (current user)
- `POST /v1/auth/logout` (optional, token blacklist or client‑side only)

**Tasks**
- [x] Add `users` table fields: `id`, `email`, `password_hash`, `name`, `avatar`, `qr_url`, timestamps
- [x] Implement password hashing (bcrypt)
- [x] Implement JWT generation & verification middleware
- [x] Implement the four endpoints above
- [x] Write minimal unit tests for auth handlers

**Acceptance Criteria**
- New user can register and log in via HTTP client (Postman/curl)
- `GET /v1/auth/me` returns the correct user when given a valid token
- Wrong/expired token returns 401

---

## 4. Backend – Groups, Membership & Invites

**Goal:** Model the trip groups and membership so the current UI can be backed by real data.

**Endpoints**
- `GET /v1/groups` – list groups current user belongs to
- `POST /v1/groups` – create a group
- `GET /v1/groups/:id` – group details + members
- `POST /v1/groups/:id/invite` – create invite link/code
- `POST /v1/groups/join/:code` – join via invite

**Tasks**
- [x] Extend schema for `groups` and `group_members`
- [x] Implement group creation and membership on create
- [x] Implement invite code generation (short random code)
- [x] Implement join by invite code
- [x] Add authorization checks (only members can see a group)

**Acceptance Criteria**
- Logged‑in user can create a group and see it in `GET /v1/groups`
- A second user can join via invite code
- Non‑members cannot access `GET /v1/groups/:id`

---

## 5. Backend – Expenses & Splits

**Goal:** Move current expense logic from Firebase into Go + Postgres.

**Endpoints**
- `GET /v1/groups/:id/expenses`
- `POST /v1/groups/:id/expenses`
- `DELETE /v1/expenses/:id`

**Core Logic**
- Support:
  - Normal expenses with equal split
  - Hybrid/itemized split
  - Transfer type (`sender` pays `receiver` directly)

**Tasks**
- [x] Define `expenses` and `expense_splits` schema (already in migrations)
- [x] Implement creation logic that:
  - Validates group membership
  - Validates sum of splits vs total amount
- [x] Implement deletion logic with permission checks
- [x] Add basic tests for expense creation

**Acceptance Criteria**
- API returns the same expense list the UI expects (payer, splits, amounts)
- Creating and deleting expenses reflects correctly in the DB

---

## 6. Backend – Balances & Payments

**Goal:** Provide APIs that power the balance card, settlements, and notifications.

**Endpoints**
- `GET /v1/groups/:id/balances` – computed per user
- `POST /v1/payments` – create payment with pending status
- `PATCH /v1/payments/:id/approve`
- `PATCH /v1/payments/:id/reject`
- `GET /v1/payments?status=pending` – pending for current user

**Tasks**
- [x] Implement balance calculation in Go using expenses and transfers
- [x] Implement `payments` table and CRUD for pending/approved/rejected
- [x] On approved payment, create a transfer‑type expense (like current prototype)
- [x] Unit test the balance calculation with small scenarios

**Acceptance Criteria**
- For a given test trip, balances returned by API match manual calculations
- Approving a payment changes subsequent balances as expected

---

## 7. Frontend – Extraction & Componentization

**Goal:** Take the current monolithic React code from `PayUp.md` and split into proper files/components.

**Tasks**
- [x] Create a new `/frontend` React project (Vite/Next)
- [ ] Port existing JSX from `PayUp.md` into:
  - `AppShell`
  - `WalletView`
  - `NotificationView`
  - Modals (AddExpenseModal, PaymentModal, etc.)
- [ ] Replace Firebase calls with a temporary mocked API layer
- [ ] Ensure current UI renders exactly as before (but with mocks)

**Acceptance Criteria**
- App runs locally with the same UI/UX as the original prototype
- No Firebase dependencies remain in the frontend

---

## 8. Frontend – Routing, Auth & API Integration

**Goal:** Add login/register screens and connect the app to the Go backend.

**Tasks**
- [ ] Add React Router and routes:
  - `/auth/login`
  - `/auth/register`
  - `/app` (protected)
- [ ] Implement auth forms and client‑side validation
- [ ] Create API client using `fetch` or Axios + React Query
- [ ] Replace mock calls with real backend endpoints
- [ ] Implement protected routes that require JWT

**Acceptance Criteria**
- User can register, log in, and reach the main app
- Refreshing the page keeps them logged in (token stored safely)
- Unauthorized users are redirected to login

---

## 9. Frontend – Responsive & PWA

**Goal:** Make PayUp feel great on both mobile and desktop, and installable on phones.

**Tasks**
- [ ] Audit layout at mobile, tablet, and desktop breakpoints
- [ ] Adjust layout (e.g., two‑column on desktop, bottom nav on mobile)
- [ ] Add PWA manifest and icons
- [ ] Add service worker for basic offline shell
- [ ] Test “Add to Home Screen” on iOS/Android

**Acceptance Criteria**
- App is usable and looks good on small phones and large desktops
- Lighthouse PWA audit passes basic checks
- App can be installed as an icon on mobile

---

## 10. File Uploads & Payment Proofs

**Goal:** Replace the mock proof image with real file upload.

**Tasks**
- [ ] Choose a storage provider (Cloudinary/Supabase/S3)
- [ ] Implement backend endpoint for signed uploads or direct uploads
- [ ] Store `proof_url` in `payments` table
- [ ] Update UI to show real receipts in NotificationView / PaymentModal

**Acceptance Criteria**
- User can upload a GCash/Maya screenshot
- The receiver sees the actual uploaded image in the approval modal

---

## 11. Observability, Security & Polish

**Goal:** Make the app safe enough for real friends and debuggable in production.

**Tasks**
- [ ] Add Sentry (or similar) to frontend and backend
- [ ] Add basic rate limiting in Gin
- [ ] Enforce HTTPS only
- [ ] Implement CORS to accept only your frontend origin
- [ ] Add `/health` endpoint and uptime monitoring
- [ ] Write a short Privacy Policy + Terms of Service and link them in the UI

**Acceptance Criteria**
- Errors in production show up in Sentry
- API rejects requests that are obviously abusive (rate limiting)
- Health checks and uptime alerts are configured

---

## 12. Launch Plan (Friends‑Only Beta)

**Goal:** Soft‑launch to a small group of friends.

**Tasks**
- [ ] Seed your own account + 1–2 test groups
- [ ] Invite 5–10 trusted friends
- [ ] Set up a chat group (Discord/Telegram) for feedback
- [ ] Collect bugs and feature requests
- [ ] Iterate based on real‑world use

**Acceptance Criteria**
- Friends can complete an entire trip flow:
  - Join a group
  - Add expenses
  - See balances
  - Pay each other
  - Approve payments
- No major crashes or blocking bugs

---

## How We’ll Work Through This

1. Start at **Section 1**, complete all tasks, and check off boxes.
2. When a section is done, move to the next.
3. If scope feels too big, we’ll split a section into smaller subtasks.
4. Update this file as the source of truth for progress and decisions.

Next step: **start with Section 1 – Project Structure & Repos.**
