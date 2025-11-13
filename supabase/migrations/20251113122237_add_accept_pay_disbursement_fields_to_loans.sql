-- ============================================
-- Flash-Loan Database Schema Update
-- Adds Accept Pay disbursement tracking fields to loans table
-- ============================================

-- 1️⃣ Add Accept Pay disbursement tracking columns
ALTER TABLE public.loans
  ADD COLUMN IF NOT EXISTS accept_pay_customer_id integer,
  ADD COLUMN IF NOT EXISTS disbursement_transaction_id integer,
  ADD COLUMN IF NOT EXISTS disbursement_process_date date,
  ADD COLUMN IF NOT EXISTS disbursement_status text,
  ADD COLUMN IF NOT EXISTS disbursement_authorized_at timestamptz,
  ADD COLUMN IF NOT EXISTS disbursement_initiated_at timestamptz,
  ADD COLUMN IF NOT EXISTS disbursement_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS disbursement_error_code text,
  ADD COLUMN IF NOT EXISTS disbursement_reference text;

-- 2️⃣ Create indexes for Accept Pay disbursement tracking
CREATE INDEX IF NOT EXISTS idx_loans_accept_pay_customer_id 
  ON public.loans(accept_pay_customer_id) 
  WHERE accept_pay_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_loans_disbursement_transaction_id 
  ON public.loans(disbursement_transaction_id) 
  WHERE disbursement_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_loans_disbursement_status 
  ON public.loans(disbursement_status) 
  WHERE disbursement_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_loans_disbursement_process_date 
  ON public.loans(disbursement_process_date) 
  WHERE disbursement_process_date IS NOT NULL;

-- 3️⃣ Add comments for documentation
COMMENT ON COLUMN public.loans.accept_pay_customer_id IS
'Accept Pay Global customer ID - Links to Accept Pay customer for this loan';

COMMENT ON COLUMN public.loans.disbursement_transaction_id IS
'Accept Pay transaction ID for the disbursement (credit transaction)';

COMMENT ON COLUMN public.loans.disbursement_process_date IS
'Scheduled process date for disbursement (must be >= MinProcessDate from Accept Pay API)';

COMMENT ON COLUMN public.loans.disbursement_status IS
'Accept Pay transaction status: 101 (initiated), 102 (sent), PD (pending), AA (approved), or error codes (9XX/RXX)';

COMMENT ON COLUMN public.loans.disbursement_authorized_at IS
'Timestamp when disbursement transaction was authorized in Accept Pay';

COMMENT ON COLUMN public.loans.disbursement_initiated_at IS
'Timestamp when disbursement transaction was created in Accept Pay';

COMMENT ON COLUMN public.loans.disbursement_completed_at IS
'Timestamp when disbursement was successfully completed (status = AA)';

COMMENT ON COLUMN public.loans.disbursement_error_code IS
'Accept Pay error code if disbursement failed (9XX for EFT, RXX for ACH)';

COMMENT ON COLUMN public.loans.disbursement_reference IS
'Accept Pay reference number for the disbursement transaction';

