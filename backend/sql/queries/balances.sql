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

-- name: ComputeBalancesByGroupWithAllMembers :many
-- Optimized query that returns all group members with their balances in a single query
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
),
computed AS (
  SELECT user_id, SUM(delta)::text AS balance
  FROM all_deltas
  GROUP BY user_id
)
SELECT gm.user_id, COALESCE(c.balance, '0') AS balance
FROM group_members gm
LEFT JOIN computed c ON c.user_id = gm.user_id
WHERE gm.group_id = $1;

