-- +goose Up
ALTER TABLE group_invites ADD COLUMN max_uses INTEGER DEFAULT NULL;
ALTER TABLE group_invites ADD COLUMN use_count INTEGER DEFAULT 0 NOT NULL;

-- +goose Down
ALTER TABLE group_invites DROP COLUMN IF EXISTS max_uses;
ALTER TABLE group_invites DROP COLUMN IF EXISTS use_count;
