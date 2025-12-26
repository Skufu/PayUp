-- +goose Up
-- Add index on expense_splits.expense_id for JOIN performance in ListExpensesByGroup
CREATE INDEX IF NOT EXISTS expense_splits_expense_id_idx ON expense_splits(expense_id);

-- Add index on group_members.group_id for better query performance
-- (Primary key covers it, but explicit index helps with certain query patterns)
CREATE INDEX IF NOT EXISTS group_members_group_id_idx ON group_members(group_id);

-- +goose Down
DROP INDEX IF EXISTS group_members_group_id_idx;
DROP INDEX IF EXISTS expense_splits_expense_id_idx;










