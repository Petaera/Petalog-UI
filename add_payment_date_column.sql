-- Add payment_date column to logs-man to track when payment is actually received
ALTER TABLE "logs-man"
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ NULL;

-- Optional: backfill payment_date for records that were paid immediately (non-credit)
-- UPDATE "logs-man"
-- SET payment_date = COALESCE(approved_at, exit_time, created_at)
-- WHERE approval_status = 'approved' AND payment_mode IS NOT NULL AND LOWER(payment_mode) <> 'credit' AND payment_date IS NULL;

