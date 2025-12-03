-- ============================================
-- Flash-Loan Database Schema Update
-- Creates payment provider system tables and enums
-- Supports multiple payment providers (Accept Pay, future providers)
-- ============================================

-- 1️⃣ Create payment provider enum
DROP TYPE IF EXISTS public.payment_provider CASCADE;
CREATE TYPE public.payment_provider AS ENUM (
  'accept_pay'
  -- Future providers can be added here:
  -- 'stripe', 'paypal', etc.
);

-- 2️⃣ Create transaction type enum
DROP TYPE IF EXISTS public.payment_transaction_type CASCADE;
CREATE TYPE public.payment_transaction_type AS ENUM (
  'disbursement',  -- Money going to borrower (credit)
  'collection'     -- Money coming from borrower (debit)
);

-- 3️⃣ Create payment_transactions table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider public.payment_provider NOT NULL,
  transaction_type public.payment_transaction_type NOT NULL,
  loan_id uuid REFERENCES public.loans(id) ON DELETE CASCADE,
  schedule_id uuid REFERENCES public.loan_payment_schedule(id) ON DELETE SET NULL,
  loan_payment_id uuid REFERENCES public.loan_payments(id) ON DELETE SET NULL,
  
  -- Provider transaction details
  provider_transaction_id text NOT NULL,  -- Provider's transaction ID (can be string or number)
  provider_customer_id text,  -- Provider's customer ID
  
  -- Transaction details
  amount numeric(12,2) NOT NULL,
  process_date date,
  status text NOT NULL,  -- Normalized status: initiated, authorized, pending, processing, completed, failed, cancelled, reversed
  provider_status text NOT NULL,  -- Provider's native status code/string
  
  -- Error tracking
  error_code text,
  error_message text,
  
  -- Timestamps
  authorized_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  
  -- Provider-specific data (stored as JSONB for flexibility)
  provider_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Metadata
  memo text,
  reference text,
  
  -- Audit fields
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT positive_transaction_amount CHECK (amount > 0),
  CONSTRAINT unique_provider_transaction UNIQUE (provider, provider_transaction_id)
);

-- 4️⃣ Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider 
  ON public.payment_transactions(provider);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_loan_id 
  ON public.payment_transactions(loan_id) 
  WHERE loan_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_schedule_id 
  ON public.payment_transactions(schedule_id) 
  WHERE schedule_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_loan_payment_id 
  ON public.payment_transactions(loan_payment_id) 
  WHERE loan_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider_transaction_id 
  ON public.payment_transactions(provider, provider_transaction_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider_customer_id 
  ON public.payment_transactions(provider, provider_customer_id) 
  WHERE provider_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_status 
  ON public.payment_transactions(status);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider_status 
  ON public.payment_transactions(provider_status);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_transaction_type 
  ON public.payment_transactions(transaction_type);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_process_date 
  ON public.payment_transactions(process_date) 
  WHERE process_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at 
  ON public.payment_transactions(created_at DESC);

-- 5️⃣ Create GIN index for JSONB provider_data queries
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider_data 
  ON public.payment_transactions USING GIN (provider_data);

-- 6️⃣ Create trigger for updated_at
DROP TRIGGER IF EXISTS update_payment_transactions_updated_at ON public.payment_transactions;
CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 7️⃣ Enable Row Level Security
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- 8️⃣ Create RLS policies
DROP POLICY IF EXISTS "Users can view their own payment transactions" ON public.payment_transactions;
CREATE POLICY "Users can view their own payment transactions"
  ON public.payment_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.loans
      WHERE loans.id = payment_transactions.loan_id
      AND loans.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff can view all payment transactions" ON public.payment_transactions;
CREATE POLICY "Staff can view all payment transactions"
  ON public.payment_transactions
  FOR SELECT
  USING (public.is_staff());

DROP POLICY IF EXISTS "Staff can manage payment transactions" ON public.payment_transactions;
CREATE POLICY "Staff can manage payment transactions"
  ON public.payment_transactions
  FOR ALL
  USING (public.is_staff());

-- 9️⃣ Add comments for documentation
COMMENT ON TYPE public.payment_provider IS
'Payment provider identifier. Currently supports: accept_pay. Can be extended for future providers.';

COMMENT ON TYPE public.payment_transaction_type IS
'Type of payment transaction: disbursement (money to borrower) or collection (money from borrower).';

COMMENT ON TABLE public.payment_transactions IS
'Unified table for all payment transactions across all payment providers. Stores provider-specific data in JSONB for flexibility.';

COMMENT ON COLUMN public.payment_transactions.provider IS
'Payment provider used for this transaction (e.g., accept_pay)';

COMMENT ON COLUMN public.payment_transactions.transaction_type IS
'Type of transaction: disbursement (credit to borrower) or collection (debit from borrower)';

COMMENT ON COLUMN public.payment_transactions.loan_id IS
'Foreign key to loans table. NULL for transactions not yet linked to a loan.';

COMMENT ON COLUMN public.payment_transactions.schedule_id IS
'Foreign key to loan_payment_schedule table. NULL for disbursements or unscheduled transactions.';

COMMENT ON COLUMN public.payment_transactions.loan_payment_id IS
'Foreign key to loan_payments table. Links payment transaction to actual payment record. NULL for disbursements or transactions not yet linked to a payment.';

COMMENT ON COLUMN public.payment_transactions.provider_transaction_id IS
'Provider''s transaction ID (stored as text to support both numeric and string IDs)';

COMMENT ON COLUMN public.payment_transactions.provider_customer_id IS
'Provider''s customer ID (stored as text to support both numeric and string IDs)';

COMMENT ON COLUMN public.payment_transactions.amount IS
'Transaction amount (must be positive)';

COMMENT ON COLUMN public.payment_transactions.process_date IS
'Scheduled process date for the transaction (YYYY-MM-DD format)';

COMMENT ON COLUMN public.payment_transactions.status IS
'Normalized transaction status: initiated, authorized, pending, processing, completed, failed, cancelled, reversed';

COMMENT ON COLUMN public.payment_transactions.provider_status IS
'Provider''s native status code/string (e.g., "101", "PD", "AA" for Accept Pay)';

COMMENT ON COLUMN public.payment_transactions.error_code IS
'Provider-specific error code if transaction failed (e.g., "904", "R01" for Accept Pay)';

COMMENT ON COLUMN public.payment_transactions.error_message IS
'Human-readable error message for failed transactions';

COMMENT ON COLUMN public.payment_transactions.provider_data IS
'JSONB field storing all provider-specific response data. Allows flexibility for different provider APIs.';

COMMENT ON COLUMN public.payment_transactions.memo IS
'Optional memo/description for the transaction';

COMMENT ON COLUMN public.payment_transactions.reference IS
'Optional reference number for the transaction';

