-- ============================================
-- Flash-Loan Database Schema Update
-- Adds remaining_balance column to loan_payments table
-- ============================================

-- 1️⃣ Add remaining_balance column to loan_payments table
ALTER TABLE public.loan_payments
  ADD COLUMN IF NOT EXISTS remaining_balance numeric(12,2);

-- 2️⃣ Create index for remaining_balance lookups
CREATE INDEX IF NOT EXISTS idx_loan_payments_remaining_balance 
  ON public.loan_payments(remaining_balance) 
  WHERE remaining_balance IS NOT NULL;

-- 3️⃣ Add comment for documentation
COMMENT ON COLUMN public.loan_payments.remaining_balance IS
'Remaining loan balance after this payment is applied. This is calculated from the payment schedule breakdown and represents the outstanding principal balance.';

