-- name: CreateUser :one
INSERT INTO users (email, password_hash, name)
VALUES ($1, $2, $3)
RETURNING id, email, name, avatar_url, qr_url, created_at, updated_at;

-- name: GetUserByEmail :one
SELECT id, email, password_hash, name, avatar_url, qr_url, created_at, updated_at
FROM users
WHERE email = $1;

-- name: GetUserByID :one
SELECT id, email, name, avatar_url, qr_url, created_at, updated_at
FROM users
WHERE id = $1;

-- name: UpdateUserProfile :exec
UPDATE users
SET
  name = COALESCE($2, name),
  qr_url = COALESCE($3, qr_url),
  updated_at = NOW()
WHERE id = $1;

-- name: GetUserPublicProfile :one
SELECT id, name, avatar_url, qr_url
FROM users
WHERE id = $1;

