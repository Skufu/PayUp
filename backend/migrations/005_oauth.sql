-- +goose Up
-- Make password_hash optional for OAuth users
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Create OAuth accounts table to link providers to users
CREATE TABLE oauth_accounts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider    text NOT NULL,  -- 'google', 'facebook', etc.
  provider_id text NOT NULL,  -- User ID from the provider
  email       text,           -- Email from the provider (for reference)
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_id)
);

CREATE INDEX idx_oauth_accounts_user_id ON oauth_accounts(user_id);

-- +goose Down
DROP INDEX IF EXISTS idx_oauth_accounts_user_id;
DROP TABLE IF EXISTS oauth_accounts;
ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;







