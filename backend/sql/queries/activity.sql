-- name: CreateActivity :one
INSERT INTO activity_log (group_id, user_id, activity_type, description, metadata)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, group_id, user_id, activity_type, description, metadata, created_at;

-- name: ListActivityByGroup :many
SELECT 
    al.id, al.group_id, al.user_id, al.activity_type, al.description, al.metadata, al.created_at,
    u.name as user_name, u.avatar_url as user_avatar_url
FROM activity_log al
LEFT JOIN users u ON u.id = al.user_id
WHERE al.group_id = $1
ORDER BY al.created_at DESC
LIMIT $2 OFFSET $3;
