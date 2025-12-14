-- name: ListGroupsForUser :many
SELECT g.id, g.name, g.created_at
FROM groups g
JOIN group_members gm ON gm.group_id = g.id
WHERE gm.user_id = $1
ORDER BY g.created_at DESC;

-- name: CreateGroup :one
INSERT INTO groups (name, created_by)
VALUES ($1, $2)
RETURNING id, name, created_at;

-- name: AddGroupMember :exec
INSERT INTO group_members (group_id, user_id, role)
VALUES ($1, $2, $3)
ON CONFLICT DO NOTHING;

-- name: IsGroupMember :one
SELECT EXISTS (
  SELECT 1 FROM group_members
  WHERE group_id = $1 AND user_id = $2
) AS is_member;

-- name: GetGroup :one
SELECT id, name, created_at
FROM groups
WHERE id = $1;

-- name: ListGroupMembers :many
SELECT user_id, role, joined_at
FROM group_members
WHERE group_id = $1
ORDER BY joined_at ASC;

