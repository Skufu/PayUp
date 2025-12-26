-- +goose Up
-- +goose StatementBegin

ALTER TABLE expenses ADD COLUMN category VARCHAR(50);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

ALTER TABLE expenses DROP COLUMN IF EXISTS category;

-- +goose StatementEnd
