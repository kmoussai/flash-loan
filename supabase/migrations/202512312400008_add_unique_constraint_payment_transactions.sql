-- ============================================
-- Add Unique Constraint to Prevent Duplicate Transactions
-- 
-- This migration adds a unique constraint on (loan_payment_id, provider) 
-- to prevent multiple active transactions for the same loan payment.
-- 
-- The constraint only applies to non-cancelled/non-failed transactions,
-- allowing cancelled transactions to be replaced with new ones.
-- ============================================

-- STEP 1: Clean up existing duplicate transactions
-- For each loan_payment_id with multiple active transactions, keep the oldest one
-- and mark the rest as cancelled with a note explaining why

DO $$
DECLARE
  duplicate_record RECORD;
  kept_id uuid;
  cancelled_count integer := 0;
BEGIN
  -- Find all loan_payment_ids that have multiple active ZumRails transactions
  FOR duplicate_record IN
    SELECT 
      loan_payment_id,
      COUNT(*) as transaction_count
    FROM public.payment_transactions
    WHERE loan_payment_id IS NOT NULL
      AND provider = 'zumrails'
      AND status NOT IN ('cancelled', 'failed')
    GROUP BY loan_payment_id
    HAVING COUNT(*) > 1
  LOOP
    -- For each duplicate group, keep the oldest transaction (by created_at)
    -- and cancel all others
    WITH ranked_transactions AS (
      SELECT 
        id,
        created_at,
        ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn
      FROM public.payment_transactions
      WHERE loan_payment_id = duplicate_record.loan_payment_id
        AND provider = 'zumrails'
        AND status NOT IN ('cancelled', 'failed')
    )
    SELECT id INTO kept_id
    FROM ranked_transactions
    WHERE rn = 1;

    -- Cancel all other transactions for this loan_payment_id (keep the oldest)
    UPDATE public.payment_transactions
    SET 
      status = 'cancelled',
      provider_data = jsonb_set(
        COALESCE(provider_data, '{}'::jsonb),
        '{cancellation_reason}',
        '"Duplicate transaction removed by migration - keeping oldest transaction"'
      ),
      updated_at = now()
    WHERE loan_payment_id = duplicate_record.loan_payment_id
      AND provider = 'zumrails'
      AND status NOT IN ('cancelled', 'failed')
      AND id != kept_id;

    cancelled_count := cancelled_count + (duplicate_record.transaction_count - 1);
    
    RAISE NOTICE 'Cleaned up duplicates for loan_payment_id %: kept 1, cancelled %', 
      duplicate_record.loan_payment_id, 
      (duplicate_record.transaction_count - 1);
  END LOOP;

  RAISE NOTICE 'Migration cleanup complete: cancelled % duplicate transaction(s)', cancelled_count;
END $$;

-- STEP 2: Add unique partial index to prevent duplicate active transactions per loan_payment_id
-- This ensures that for each loan_payment_id and provider combination,
-- there can only be ONE active transaction (not cancelled or failed)
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_transactions_unique_active_payment
  ON public.payment_transactions (loan_payment_id, provider)
  WHERE loan_payment_id IS NOT NULL
    AND provider = 'zumrails'
    AND status NOT IN ('cancelled', 'failed');

-- Add comment explaining the constraint
COMMENT ON INDEX idx_payment_transactions_unique_active_payment IS
'Prevents duplicate active ZumRails transactions for the same loan_payment_id. 
Allows cancelled/failed transactions to be replaced with new ones.';

