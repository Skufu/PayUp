-- name: GetOAuthAccount :one
SELECT id, user_id, provider, provider_id, email, created_at
FROM oauth_accounts
WHERE provider = $1 AND provider_id = $2;

-- name: CreateOAuthAccount :one
INSERT INTO oauth_accounts (user_id, provider, provider_id, email)
VALUES ($1, $2, $3, $4)
RETURNING id, user_id, provider, provider_id, email, created_at;

-- name: GetOAuthAccountsByUser :many
SELECT id, user_id, provider, provider_id, email, created_at
FROM oauth_accounts
WHERE user_id = $1;

-- name: DeleteOAuthAccount :exec
DELETE FROM oauth_accounts
WHERE id = $1 AND user_id = $2;




