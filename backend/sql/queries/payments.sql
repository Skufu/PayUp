-- name: CreatePayment :one
INSERT INTO payments (group_id, sender_id, receiver_id, amount, status, proof_url)
VALUES ($1, $2, $3, $4, 'pending', $5)
RETURNING id, created_at;

-- name: ListPaymentsForReceiverByStatus :many
SELECT id, group_id, sender_id, receiver_id, amount, status, proof_url, created_at
FROM payments
WHERE receiver_id = $1 AND status = $2
ORDER BY created_at DESC;

-- name: GetPaymentForUpdate :one
SELECT id, group_id, sender_id, receiver_id, amount, status
FROM payments
WHERE id = $1
FOR UPDATE;

-- name: UpdatePaymentDecision :exec
UPDATE payments
SET status = $2, decided_by = $3, decided_at = $4
WHERE id = $1;

-- name: CreateTransferExpense :one
INSERT INTO expenses (group_id, title, amount, payer_id, mode, type, created_by)
VALUES ($1, $2, $3, $4, 'transfer', 'transfer', $5)
RETURNING id;

-- name: CountPendingPaymentsBetweenUsers :one
-- Check for pending payments from sender to receiver in a group
SELECT COUNT(*)::int AS count
FROM payments
WHERE sender_id = $1 
  AND receiver_id = $2 
  AND group_id = $3
  AND status = 'pending';
