-- ============================================
-- Flash-Loan Database Schema Update
-- Adds 'deferred', 'manual', 'cancelled', and 'rebate' to payment_status enum
-- ============================================

-- Add new enum values to payment_status
-- Note: ALTER TYPE ... ADD VALUE cannot be run inside a transaction block
-- Each ADD VALUE must be in a separate statement

-- Add 'deferred' status (for payments that have been deferred to the end)
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'deferred';

-- Add 'manual' status (for manually processed payments)
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'manual';

-- Add 'cancelled' status (for cancelled payments)
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'cancelled';

-- Add 'rebate' status (for rebate payments/credits)
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'rebate';

-- Update enum comment to document new values
COMMENT ON TYPE public.payment_status IS
'Payment status enum:
- pending: Payment scheduled/initiated but not yet processed (maps to CRM "sentForProcessing")
- confirmed: Payment successfully processed/confirmed (maps to CRM "inProgress")
- paid: Payment completed and fully paid (maps to CRM "paid")
- failed: Payment failed due to technical or processing error
- rejected: Payment explicitly rejected (maps to CRM "rejected", e.g., NSF, insufficient funds)
- deferred: Payment has been deferred to the end of the payment schedule
- manual: Payment processed manually by staff
- cancelled: Payment has been cancelled
- rebate: Rebate payment or credit applied to the loan';

