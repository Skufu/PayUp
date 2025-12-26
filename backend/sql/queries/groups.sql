-- name: ListGroupsForUser :many
SELECT
  g.id,
  g.name,
  g.created_at,
  (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS member_count
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
SELECT
  gm.user_id,
  gm.role,
  gm.joined_at,
  u.name AS user_name,
  u.email AS user_email,
  u.avatar_url AS user_avatar_url
FROM group_members gm
JOIN users u ON u.id = gm.user_id
WHERE gm.group_id = $1
ORDER BY gm.joined_at ASC;

-- name: CountGroupMembers :one
SELECT COUNT(*) AS count
FROM group_members
WHERE group_id = $1;

-- name: LeaveGroup :exec
DELETE FROM group_members
WHERE group_id = $1 AND user_id = $2;

-- name: GetMemberRole :one
SELECT role FROM group_members
WHERE group_id = $1 AND user_id = $2;

