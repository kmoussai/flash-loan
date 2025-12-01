-- ============================================
-- Flash-Loan Database Schema Update
-- Adds interest and principal columns to loan_payments table
-- ============================================

-- 1️⃣ Add interest and principal columns to loan_payments table
ALTER TABLE public.loan_payments
  ADD COLUMN IF NOT EXISTS interest numeric(12,2),
  ADD COLUMN IF NOT EXISTS principal numeric(12,2);

-- 2️⃣ Create indexes for interest and principal lookups
CREATE INDEX IF NOT EXISTS idx_loan_payments_interest 
  ON public.loan_payments(interest) 
  WHERE interest IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_loan_payments_principal 
  ON public.loan_payments(principal) 
  WHERE principal IS NOT NULL;

-- 3️⃣ Add comments for documentation
COMMENT ON COLUMN public.loan_payments.interest IS
'Amount of this payment that goes toward interest. Calculated from the payment schedule. Can be null for ad-hoc payments or if not calculated.';

COMMENT ON COLUMN public.loan_payments.principal IS
'Amount of this payment that goes toward principal/loan capital. Calculated from the payment schedule. Can be null for ad-hoc payments or if not calculated.';

