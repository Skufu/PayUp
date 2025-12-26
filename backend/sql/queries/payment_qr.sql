-- name: CreatePaymentQR :one
INSERT INTO payment_qr_codes (user_id, provider, qr_url, phone_number, is_primary)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (user_id, provider) DO UPDATE
SET qr_url = EXCLUDED.qr_url,
    phone_number = EXCLUDED.phone_number,
    updated_at = now()
RETURNING *;

-- name: GetPaymentQRsByUser :many
SELECT * FROM payment_qr_codes
WHERE user_id = $1
ORDER BY is_primary DESC, provider ASC;

-- name: GetPaymentQRByProvider :one
SELECT * FROM payment_qr_codes
WHERE user_id = $1 AND provider = $2;

-- name: DeletePaymentQR :exec
DELETE FROM payment_qr_codes
WHERE id = $1 AND user_id = $2;

-- name: UnsetPrimaryPaymentQRs :exec
UPDATE payment_qr_codes
SET is_primary = false
WHERE user_id = $1;

-- name: SetPrimaryPaymentQR :exec
UPDATE payment_qr_codes
SET is_primary = true, updated_at = now()
WHERE id = $1 AND user_id = $2;

-- name: UpdatePaymentQRPhone :one
UPDATE payment_qr_codes
SET phone_number = $3, updated_at = now()
WHERE id = $1 AND user_id = $2
RETURNING *;
