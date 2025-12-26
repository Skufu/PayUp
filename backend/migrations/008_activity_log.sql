-- +goose Up
-- +goose StatementBegin

CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    activity_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_log_group_id ON activity_log(group_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP INDEX IF EXISTS idx_activity_log_created_at;
DROP INDEX IF EXISTS idx_activity_log_group_id;
DROP TABLE IF EXISTS activity_log;

-- +goose StatementEnd
