-- name: CreateNudge :one
INSERT INTO nudges (group_id, sender_id, receiver_id, amount, message)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, group_id, sender_id, receiver_id, amount, message, read, created_at;

-- name: ListNudgesForReceiver :many
SELECT
  n.id,
  n.group_id,
  n.sender_id,
  n.receiver_id,
  n.amount,
  n.message,
  n.read,
  n.created_at,
  u.name AS sender_name,
  u.email AS sender_email,
  g.name AS group_name
FROM nudges n
JOIN users u ON u.id = n.sender_id
JOIN groups g ON g.id = n.group_id
WHERE n.receiver_id = $1
ORDER BY n.created_at DESC
LIMIT $2;

-- name: GetUnreadNudgeCount :one
SELECT COUNT(*)::bigint AS count
FROM nudges
WHERE receiver_id = $1 AND read = false;

-- name: MarkNudgeAsRead :exec
UPDATE nudges
SET read = true
WHERE id = $1 AND receiver_id = $2;

-- name: MarkAllNudgesAsRead :exec
UPDATE nudges
SET read = true
WHERE receiver_id = $1 AND read = false;

