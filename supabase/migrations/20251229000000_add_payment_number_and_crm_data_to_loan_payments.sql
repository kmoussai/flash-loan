-- ============================================
-- Flash-Loan Database Schema Update
-- Adds payment_number and crm_original_data columns to loan_payments table
-- ============================================

-- 1️⃣ Add payment_number column (for tracking payment sequence)
ALTER TABLE public.loan_payments
  ADD COLUMN IF NOT EXISTS payment_number integer;

-- Create index for payment_number lookups
CREATE INDEX IF NOT EXISTS idx_loan_payments_payment_number 
  ON public.loan_payments(loan_id, payment_number)
  WHERE payment_number IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.loan_payments.payment_number IS
'Sequential payment number for this loan (1, 2, 3, etc.). Used to track payment order and match with scheduled payments. Can be null for ad-hoc payments.';

-- 2️⃣ Add CRM original data column (JSONB to store full CRM transaction response)
ALTER TABLE public.loan_payments
  ADD COLUMN IF NOT EXISTS crm_original_data jsonb;

-- Create index for CRM data queries (GIN index for JSONB)
CREATE INDEX IF NOT EXISTS idx_loan_payments_crm_original_data 
  ON public.loan_payments USING GIN (crm_original_data)
  WHERE crm_original_data IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.loan_payments.crm_original_data IS
'Stores the complete original JSON response from CRM API for this payment/transaction. Used for data migration, extracting additional fields not yet mapped to our schema, and maintaining reference to original CRM data.';

