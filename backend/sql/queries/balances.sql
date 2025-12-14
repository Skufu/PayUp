-- name: ComputeBalancesByGroup :many
WITH paid AS (
  SELECT payer_id AS user_id, SUM(amount) AS delta
  FROM expenses
  WHERE expenses.group_id = $1
  GROUP BY payer_id
),
owed AS (
  SELECT es.user_id AS user_id, -SUM(es.amount) AS delta
  FROM expense_splits es
  JOIN expenses e ON e.id = es.expense_id
  WHERE e.group_id = $1
  GROUP BY es.user_id
),
all_deltas AS (
  SELECT * FROM paid
  UNION ALL
  SELECT * FROM owed
)
SELECT user_id, SUM(delta)::text AS balance
FROM all_deltas
GROUP BY user_id;

