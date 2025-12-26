-- name: CreateInvite :exec
INSERT INTO group_invites (group_id, code, created_by, expires_at, max_uses)
VALUES ($1, $2, $3, $4, $5);

-- name: GetInviteByCode :one
SELECT group_id, expires_at, max_uses, use_count
FROM group_invites
WHERE code = $1;

-- name: GetInvitePreview :one
SELECT 
    gi.group_id,
    gi.expires_at,
    gi.max_uses,
    gi.use_count,
    g.name AS group_name,
    (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = gi.group_id) AS member_count,
    u.name AS created_by_name,
    u.avatar_url AS created_by_avatar
FROM group_invites gi
JOIN groups g ON g.id = gi.group_id
LEFT JOIN users u ON u.id = gi.created_by
WHERE gi.code = $1;

-- name: IncrementInviteUseCount :exec
UPDATE group_invites
SET use_count = use_count + 1
WHERE code = $1;

-- name: DeleteExpiredInvites :exec
DELETE FROM group_invites
WHERE (expires_at IS NOT NULL AND expires_at < NOW())
   OR (max_uses IS NOT NULL AND use_count >= max_uses);

