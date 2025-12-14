-- name: ListExpensesByGroup :many
SELECT
  e.id,
  e.group_id,
  e.title,
  e.amount,
  e.payer_id,
  e.mode,
  e.type,
  e.created_at,
  COALESCE(
    jsonb_object_agg(es.user_id::text, es.amount) FILTER (WHERE es.user_id IS NOT NULL),
    '{}'::jsonb
  )::text AS splits
FROM expenses e
LEFT JOIN expense_splits es ON es.expense_id = e.id
WHERE e.group_id = $1
GROUP BY e.id
ORDER BY e.created_at DESC;

-- name: CreateExpense :one
INSERT INTO expenses (group_id, title, amount, payer_id, mode, type, created_by)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, created_at;

-- name: CreateExpenseSplit :exec
INSERT INTO expense_splits (expense_id, user_id, amount)
VALUES ($1, $2, $3);

-- name: GetExpenseForDelete :one
SELECT id, group_id, payer_id, created_by
FROM expenses
WHERE id = $1;

-- name: DeleteExpense :exec
DELETE FROM expenses
WHERE id = $1;

-- name: ListGroupMemberIDs :many
SELECT user_id
FROM group_members
WHERE group_id = $1;

