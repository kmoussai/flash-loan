-- ============================================
-- Setup Zum Rails Payment Transactions
-- 
-- This migration sets up the payment_transactions table for Zum Rails integration:
-- 1. Adds zumrails to payment_provider enum
-- 2. Removes schedule_id column (not using loan_payment_schedule)
-- 3. Simplifies table schema - moves all provider-specific fields to provider_data JSONB
-- 
-- ⚠️ IMPORTANT: Review and test this migration carefully before running in production
-- ============================================

-- ============================================
-- STEP 1: Add Zum Rails to payment_provider enum
-- ============================================

-- Add zumrails to payment_provider enum if not already present
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'zumrails' 
    AND enumtypid = 'public.payment_provider'::regtype
  ) THEN
    ALTER TYPE public.payment_provider ADD VALUE 'zumrails';
  END IF;
END $$;

COMMENT ON TYPE public.payment_provider IS
'Payment provider identifier. Supports: accept_pay, zumrails. Can be extended for future providers.';

-- ============================================
-- STEP 2: Remove schedule_id from payment_transactions
-- ============================================

-- Remove schedule_id column and its index (not using loan_payment_schedule)
ALTER TABLE public.payment_transactions 
  DROP COLUMN IF EXISTS schedule_id;

DROP INDEX IF EXISTS idx_payment_transactions_schedule_id;

-- ============================================
-- STEP 3: Migrate existing provider-specific data to provider_data JSONB
-- ============================================

-- Migrate existing data to provider_data JSONB (if any exists)
UPDATE public.payment_transactions
SET provider_data = jsonb_build_object(
  'transaction_id', provider_transaction_id,
  'customer_id', provider_customer_id,
  'status', provider_status,
  'error_code', error_code,
  'error_message', error_message,
  'process_date', process_date,
  'memo', memo,
  'reference', reference,
  'authorized_at', authorized_at,
  'completed_at', completed_at,
  'failed_at', failed_at
) || COALESCE(provider_data, '{}'::jsonb)
WHERE provider_transaction_id IS NOT NULL
  AND (provider_data IS NULL OR provider_data = '{}'::jsonb);

-- ============================================
-- STEP 4: Remove provider-specific columns (simplify schema)
-- ============================================

-- Remove provider-specific columns (keep only essential common fields)
ALTER TABLE public.payment_transactions
  DROP COLUMN IF EXISTS provider_transaction_id,
  DROP COLUMN IF EXISTS provider_customer_id,
  DROP COLUMN IF EXISTS provider_status,
  DROP COLUMN IF EXISTS error_code,
  DROP COLUMN IF EXISTS error_message,
  DROP COLUMN IF EXISTS process_date,
  DROP COLUMN IF EXISTS memo,
  DROP COLUMN IF EXISTS reference,
  DROP COLUMN IF EXISTS authorized_at,
  DROP COLUMN IF EXISTS completed_at,
  DROP COLUMN IF EXISTS failed_at;

-- ============================================
-- STEP 5: Drop indexes that are no longer needed
-- ============================================

DROP INDEX IF EXISTS idx_payment_transactions_provider_transaction_id;
DROP INDEX IF EXISTS idx_payment_transactions_provider_customer_id;
DROP INDEX IF EXISTS idx_payment_transactions_provider_status;
DROP INDEX IF EXISTS idx_payment_transactions_process_date;

-- ============================================
-- STEP 6: Add indexes for JSONB queries (Zum Rails specific)
-- ============================================

-- GIN index on entire provider_data JSONB column for efficient JSONB queries
-- This supports queries on any field within provider_data
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider_data_gin
  ON public.payment_transactions USING GIN (provider_data)
  WHERE provider_data IS NOT NULL;

-- B-tree indexes for exact text matches on commonly queried fields
-- These are more efficient than GIN for simple equality checks on extracted text

-- Index for querying by Zum Rails transaction_id (exact match)
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider_data_transaction_id
  ON public.payment_transactions ((provider_data->>'transaction_id'))
  WHERE provider_data->>'transaction_id' IS NOT NULL;

-- Index for querying by Zum Rails transaction_status (exact match)
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider_data_transaction_status
  ON public.payment_transactions ((provider_data->>'transaction_status'))
  WHERE provider_data->>'transaction_status' IS NOT NULL;

-- Index for querying by Zum Rails client_transaction_id (exact match)
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider_data_client_transaction_id
  ON public.payment_transactions ((provider_data->>'client_transaction_id'))
  WHERE provider_data->>'client_transaction_id' IS NOT NULL;

-- Index for querying by failed transaction events (exact match)
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider_data_failed_event
  ON public.payment_transactions ((provider_data->>'failed_transaction_event'))
  WHERE provider_data->>'failed_transaction_event' IS NOT NULL;

-- ============================================
-- STEP 7: Update table and column comments
-- ============================================

COMMENT ON TABLE public.payment_transactions IS
'Simplified table for all payment transactions. All provider-specific data stored in provider_data JSONB field.
Designed for Zum Rails EFT integration with clean separation between business domain and infrastructure.';

COMMENT ON COLUMN public.payment_transactions.provider IS
'Payment provider identifier (e.g., zumrails)';

COMMENT ON COLUMN public.payment_transactions.transaction_type IS
'Type of transaction: disbursement (credit to borrower) or collection (debit from borrower)';

COMMENT ON COLUMN public.payment_transactions.amount IS
'Transaction amount (must be positive)';

COMMENT ON COLUMN public.payment_transactions.status IS
'Normalized transaction status: initiated, pending, processing, completed, failed, cancelled, reversed';

COMMENT ON COLUMN public.payment_transactions.provider_data IS
'JSONB field storing ALL provider-specific data. Structure varies by provider.
For Zum Rails, includes: transaction_id, client_transaction_id, zumrails_type, transaction_method,
transaction_status, failed_transaction_event, transaction_history, user, wallet, funding_source,
memo, comment, timestamps, and full raw_response from Zum Rails API.
See PAYMENT_TRANSACTIONS_JSONB_GUIDE.md for structure details.';

-- ============================================
-- Verification Queries (run after migration)
-- ============================================

-- Verify zumrails was added to enum
-- SELECT enumlabel FROM pg_enum 
-- WHERE enumtypid = 'public.payment_provider'::regtype
-- ORDER BY enumsortorder;

-- Verify schedule_id was removed
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'payment_transactions' 
-- AND column_name = 'schedule_id'; -- Should return 0 rows

-- Verify provider-specific columns were removed
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'payment_transactions' 
-- AND column_name IN ('provider_transaction_id', 'provider_status', 'memo'); -- Should return 0 rows

-- Verify JSONB indexes were created
-- SELECT indexname FROM pg_indexes 
-- WHERE tablename = 'payment_transactions' 
-- AND indexname LIKE '%provider_data%';
