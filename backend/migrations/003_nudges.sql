-- +goose Up
-- +goose StatementBegin

CREATE TABLE nudges (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  sender_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount      numeric(12,2) NOT NULL CHECK (amount > 0),
  message     text,
  read        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX nudges_receiver_created_at_idx ON nudges(receiver_id, created_at DESC);
CREATE INDEX nudges_receiver_unread_idx ON nudges(receiver_id, read) WHERE read = false;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS nudges;

-- +goose StatementEnd

