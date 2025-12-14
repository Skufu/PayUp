-- +goose Up
-- +goose StatementBegin

CREATE TABLE group_invites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  code       text NOT NULL UNIQUE,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

CREATE INDEX group_invites_group_id_idx ON group_invites(group_id);
CREATE INDEX group_invites_code_idx ON group_invites(code);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS group_invites;

-- +goose StatementEnd

