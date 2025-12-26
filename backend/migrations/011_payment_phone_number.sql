-- +goose Up
-- Add phone_number column to payment_qr_codes table
ALTER TABLE payment_qr_codes ADD COLUMN phone_number text;

-- +goose Down
ALTER TABLE payment_qr_codes DROP COLUMN IF EXISTS phone_number;
