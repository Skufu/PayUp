-- +goose Up
-- +goose StatementBegin

-- UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- updated_at helper
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- USERS
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name          text,
  avatar_url    text,
  qr_url        text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- GROUPS
CREATE TABLE groups (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER groups_set_updated_at
BEFORE UPDATE ON groups
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- GROUP MEMBERS
CREATE TABLE group_members (
  group_id  uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX group_members_user_id_idx ON group_members(user_id);

-- EXPENSES
-- Mirrors prototype fields:
-- - title, amount, payerId, mode/type, splits
CREATE TABLE expenses (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  title      text NOT NULL,
  amount     numeric(12,2) NOT NULL CHECK (amount >= 0),
  payer_id   uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  mode       text, -- e.g. 'transfer'
  type       text, -- e.g. 'transfer'
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX expenses_group_created_at_idx ON expenses(group_id, created_at DESC);

CREATE TRIGGER expenses_set_updated_at
BEFORE UPDATE ON expenses
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- EXPENSE SPLITS
CREATE TABLE expense_splits (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  amount     numeric(12,2) NOT NULL CHECK (amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (expense_id, user_id)
);

CREATE INDEX expense_splits_user_id_idx ON expense_splits(user_id);

-- PAYMENTS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END$$;

CREATE TABLE payments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  sender_id   uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  receiver_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  amount      numeric(12,2) NOT NULL CHECK (amount > 0),
  status      payment_status NOT NULL DEFAULT 'pending',
  proof_url   text,
  decided_by  uuid REFERENCES users(id) ON DELETE SET NULL,
  decided_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payments_receiver_status_created_at_idx
ON payments(receiver_id, status, created_at DESC);

CREATE INDEX payments_group_created_at_idx
ON payments(group_id, created_at DESC);

CREATE TRIGGER payments_set_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TRIGGER IF EXISTS payments_set_updated_at ON payments;
DROP TABLE IF EXISTS payments;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    DROP TYPE payment_status;
  END IF;
END$$;

DROP TABLE IF EXISTS expense_splits;

DROP TRIGGER IF EXISTS expenses_set_updated_at ON expenses;
DROP TABLE IF EXISTS expenses;

DROP TABLE IF EXISTS group_members;

DROP TRIGGER IF EXISTS groups_set_updated_at ON groups;
DROP TABLE IF EXISTS groups;

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
DROP TABLE IF EXISTS users;

DROP FUNCTION IF EXISTS set_updated_at();

-- +goose StatementEnd

