-- name: SavePushSubscription :exec
INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
VALUES ($1, $2, $3, $4)
ON CONFLICT (user_id, endpoint) DO UPDATE
SET p256dh = EXCLUDED.p256dh,
    auth = EXCLUDED.auth;

-- name: ListPushSubscriptionsForUser :many
SELECT endpoint, p256dh, auth
FROM push_subscriptions
WHERE user_id = $1;

-- name: DeletePushSubscription :exec
DELETE FROM push_subscriptions
WHERE user_id = $1 AND endpoint = $2;

