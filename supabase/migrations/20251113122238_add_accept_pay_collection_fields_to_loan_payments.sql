-- ============================================
-- Flash-Loan Database Schema Update
-- Adds Accept Pay payment collection tracking fields to loan_payments table
-- ============================================

-- 1️⃣ Add Accept Pay payment collection tracking columns
ALTER TABLE public.loan_payments
  ADD COLUMN IF NOT EXISTS accept_pay_customer_id integer,
  ADD COLUMN IF NOT EXISTS accept_pay_transaction_id integer,
  ADD COLUMN IF NOT EXISTS process_date date,
  ADD COLUMN IF NOT EXISTS accept_pay_status text,
  ADD COLUMN IF NOT EXISTS accept_pay_reference text,
  ADD COLUMN IF NOT EXISTS authorized_at timestamptz,
  ADD COLUMN IF NOT EXISTS authorization_status text,
  ADD COLUMN IF NOT EXISTS collection_initiated_at timestamptz,
  ADD COLUMN IF NOT EXISTS collection_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS error_code text,
  ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS voided_at timestamptz,
  ADD COLUMN IF NOT EXISTS void_reason text;

-- 2️⃣ Create indexes for Accept Pay payment collection tracking
CREATE INDEX IF NOT EXISTS idx_loan_payments_accept_pay_customer_id 
  ON public.loan_payments(accept_pay_customer_id) 
  WHERE accept_pay_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_loan_payments_accept_pay_transaction_id 
  ON public.loan_payments(accept_pay_transaction_id) 
  WHERE accept_pay_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_loan_payments_accept_pay_status 
  ON public.loan_payments(accept_pay_status) 
  WHERE accept_pay_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_loan_payments_process_date 
  ON public.loan_payments(process_date) 
  WHERE process_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_loan_payments_authorization_status 
  ON public.loan_payments(authorization_status) 
  WHERE authorization_status IS NOT NULL;

-- 3️⃣ Add comments for documentation
COMMENT ON COLUMN public.loan_payments.accept_pay_customer_id IS
'Accept Pay Global customer ID - Links to Accept Pay customer for this payment';

COMMENT ON COLUMN public.loan_payments.accept_pay_transaction_id IS
'Accept Pay transaction ID for the payment collection (debit transaction)';

COMMENT ON COLUMN public.loan_payments.process_date IS
'Scheduled process date for payment collection (must be >= MinProcessDate from Accept Pay API)';

COMMENT ON COLUMN public.loan_payments.accept_pay_status IS
'Accept Pay transaction status: 101 (initiated), 102 (sent), PD (pending), AA (approved), or error codes (9XX/RXX)';

COMMENT ON COLUMN public.loan_payments.accept_pay_reference IS
'Accept Pay reference number for the payment transaction';

COMMENT ON COLUMN public.loan_payments.authorized_at IS
'Timestamp when payment transaction was authorized in Accept Pay';

COMMENT ON COLUMN public.loan_payments.authorization_status IS
'Authorization status: authorized, unauthorized, or null';

COMMENT ON COLUMN public.loan_payments.collection_initiated_at IS
'Timestamp when payment collection transaction was created in Accept Pay';

COMMENT ON COLUMN public.loan_payments.collection_completed_at IS
'Timestamp when payment collection was successfully completed (status = AA)';

COMMENT ON COLUMN public.loan_payments.error_code IS
'Accept Pay error code if payment collection failed (9XX for EFT, RXX for ACH)';

COMMENT ON COLUMN public.loan_payments.retry_count IS
'Number of retry attempts for failed payment collections';

COMMENT ON COLUMN public.loan_payments.voided_at IS
'Timestamp when payment transaction was voided in Accept Pay';

COMMENT ON COLUMN public.loan_payments.void_reason IS
'Reason for voiding the payment transaction';

