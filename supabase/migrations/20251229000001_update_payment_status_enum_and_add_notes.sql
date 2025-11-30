-- ============================================
-- Flash-Loan Database Schema Update
-- Updates payment_status enum to include all CRM transaction statuses
-- Adds notes/description column to loan_payments table
-- ============================================

-- 1️⃣ Update payment_status enum to include all statuses from CRM transactions
-- We need to drop dependencies first before dropping the enum type

-- Step 1: Drop the default constraint on the status column
ALTER TABLE public.loan_payments 
  ALTER COLUMN status DROP DEFAULT;

-- Step 2: Create a new enum type with all values
CREATE TYPE public.payment_status_new AS ENUM (
  'pending',           -- Payment scheduled/initiated but not yet processed (maps to "sentForProcessing")
  'confirmed',         -- Payment successfully processed (maps to "inProgress")
  'paid',              -- Payment completed and paid (maps to "paid")
  'failed',            -- Payment failed due to technical or processing error
  'rejected'           -- Explicitly rejected payment (maps to "rejected", e.g., NSF, insufficient funds)
);

-- Step 3: Convert the existing column to use text temporarily
ALTER TABLE public.loan_payments 
  ALTER COLUMN status TYPE text USING status::text;

-- Step 4: Drop the old enum (now safe since column is text and default is removed)
DROP TYPE IF EXISTS public.payment_status;

-- Step 5: Rename the new enum to the original name
ALTER TYPE public.payment_status_new RENAME TO payment_status;

-- Step 6: Convert the column back to the enum type
-- Map old values to new enum (all existing values are preserved)
ALTER TABLE public.loan_payments 
  ALTER COLUMN status TYPE public.payment_status USING 
    CASE status::text
      WHEN 'pending' THEN 'pending'::public.payment_status
      WHEN 'confirmed' THEN 'confirmed'::public.payment_status
      WHEN 'failed' THEN 'failed'::public.payment_status
      ELSE 'pending'::public.payment_status
    END;

-- Step 7: Restore default constraint
ALTER TABLE public.loan_payments
  ALTER COLUMN status SET DEFAULT 'pending';

-- 2️⃣ Add notes/description column to loan_payments table
ALTER TABLE public.loan_payments
  ADD COLUMN IF NOT EXISTS notes text;

-- Create index for notes (for searching/filtering)
CREATE INDEX IF NOT EXISTS idx_loan_payments_notes 
  ON public.loan_payments USING gin(to_tsvector('english', notes))
  WHERE notes IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.loan_payments.notes IS
'Optional notes or description for this payment. Can include payment details, rejection reasons, NSF information, or any other relevant payment notes from CRM or staff.';

COMMENT ON TYPE public.payment_status IS
'Payment status enum:
- pending: Payment scheduled/initiated but not yet processed (maps to CRM "sentForProcessing")
- confirmed: Payment successfully processed/confirmed (maps to CRM "inProgress")
- paid: Payment completed and fully paid (maps to CRM "paid")
- failed: Payment failed due to technical or processing error
- rejected: Payment explicitly rejected (maps to CRM "rejected", e.g., NSF, insufficient funds)';


