# Database

Source of truth: `backend/sql/schema.sql` + `backend/migrations/*.sql`

## Tables

### `users`

- `id` (uuid, PK)
- `email` (unique)
- `password_hash`
- `name`, `avatar_url`, `qr_url`
- `created_at`, `updated_at`

### `groups`

- `id` (uuid, PK)
- `name`
- `created_by` → `users.id` (nullable)
- `created_at`, `updated_at`

### `group_members`

- PK: `(group_id, user_id)`
- `group_id` → `groups.id`
- `user_id` → `users.id`
- `role` (default `member`)
- `joined_at`

### `expenses`

- `id` (uuid, PK)
- `group_id` → `groups.id`
- `title`
- `amount` numeric(12,2)
- `payer_id` → `users.id`
- `mode` (optional)
- `type` (optional; frontend treats `transfer` as a special expense type)
- `created_by` → `users.id` (nullable)
- timestamps

### `expense_splits`

- `id` (uuid, PK)
- `expense_id` → `expenses.id`
- `user_id` → `users.id`
- `amount` numeric(12,2)
- unique: `(expense_id, user_id)`

### `payments`

- `id` (uuid, PK)
- `group_id` → `groups.id`
- `sender_id` → `users.id`
- `receiver_id` → `users.id`
- `amount` numeric(12,2)
- `status` enum: `pending | approved | rejected`
- `proof_url` (optional)
- `decided_by` → `users.id` (nullable)
- `decided_at` (nullable)
- timestamps

### `group_invites`

- `id` (uuid, PK)
- `group_id` → `groups.id`
- `code` (unique)
- `created_by` → `users.id` (nullable)
- `expires_at` (nullable)

### `nudges`

- `id` (uuid, PK)
- `group_id` → `groups.id`
- `sender_id` → `users.id`
- `receiver_id` → `users.id`
- `amount` numeric(12,2)
- `message` (optional)
- `read` (bool default false)
- `created_at`

### `push_subscriptions`

- `id` (uuid, PK)
- `user_id` → `users.id`
- `endpoint`, `p256dh`, `auth`
- unique: `(user_id, endpoint)`

## Where SQL lives

- Queries: `backend/sql/queries/*.sql`
- Generated Go: `backend/internal/db/sqlcdb/*`
