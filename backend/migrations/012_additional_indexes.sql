-- +goose Up
-- Index for payments queries that filter by sender_id and receiver_id
CREATE INDEX IF NOT EXISTS payments_sender_id_idx ON payments(sender_id);
CREATE INDEX IF NOT EXISTS payments_receiver_id_idx ON payments(receiver_id);
CREATE INDEX IF NOT EXISTS payments_group_id_idx ON payments(group_id);
CREATE INDEX IF NOT EXISTS payments_status_idx ON payments(status) WHERE status = 'pending';

-- Index for nudges lookups
CREATE INDEX IF NOT EXISTS nudges_receiver_id_idx ON nudges(receiver_id);
CREATE INDEX IF NOT EXISTS nudges_group_id_idx ON nudges(group_id);

-- Index for expenses by group (descending for recent first)
CREATE INDEX IF NOT EXISTS expenses_group_id_created_idx ON expenses(group_id, created_at DESC);

-- Index for payment_qr_codes by user
CREATE INDEX IF NOT EXISTS payment_qr_codes_user_id_idx ON payment_qr_codes(user_id);

-- +goose Down
DROP INDEX IF EXISTS payment_qr_codes_user_id_idx;
DROP INDEX IF EXISTS expenses_group_id_created_idx;
DROP INDEX IF EXISTS nudges_group_id_idx;
DROP INDEX IF EXISTS nudges_receiver_id_idx;
DROP INDEX IF EXISTS payments_status_idx;
DROP INDEX IF EXISTS payments_group_id_idx;
DROP INDEX IF EXISTS payments_receiver_id_idx;
DROP INDEX IF EXISTS payments_sender_id_idx;
