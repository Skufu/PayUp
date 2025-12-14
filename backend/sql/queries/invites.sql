-- name: CreateInvite :exec
INSERT INTO group_invites (group_id, code, created_by, expires_at)
VALUES ($1, $2, $3, $4);

-- name: GetInviteByCode :one
SELECT group_id, expires_at
FROM group_invites
WHERE code = $1;

