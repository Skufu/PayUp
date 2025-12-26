-- +goose Up
-- +goose StatementBegin

CREATE TABLE payment_qr_codes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider   text NOT NULL, -- 'gcash', 'maya', etc.
  qr_url     text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

CREATE INDEX payment_qr_codes_user_id_idx ON payment_qr_codes(user_id);

CREATE TRIGGER payment_qr_codes_set_updated_at
BEFORE UPDATE ON payment_qr_codes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Migrate existing qr_url from users table to payment_qr_codes as 'gcash'
INSERT INTO payment_qr_codes (user_id, provider, qr_url, is_primary)
SELECT id, 'gcash', qr_url, true
FROM users
WHERE qr_url IS NOT NULL AND qr_url != '';

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TRIGGER IF EXISTS payment_qr_codes_set_updated_at ON payment_qr_codes;
DROP TABLE IF EXISTS payment_qr_codes;

-- +goose StatementEnd
