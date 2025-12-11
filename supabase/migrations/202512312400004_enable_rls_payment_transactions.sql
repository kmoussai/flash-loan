-- ============================================
-- Flash-Loan Database Schema Update
-- Enable Row Level Security (RLS) on payment_transactions table
-- Admin/Staff only - payment transactions are internal infrastructure data
-- ============================================

-- ============================================
-- Enable RLS on payment_transactions table
-- ============================================

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Drop existing policies (for idempotency)
-- ============================================

DROP POLICY IF EXISTS "Users can view their own payment transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Staff can view all payment transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Staff can manage payment transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Staff can insert payment transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Staff can update payment transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Staff can delete payment transactions" ON public.payment_transactions;

-- ============================================
-- Create RLS policies
-- ============================================

-- Policy for SELECT: Staff can view all payment transactions
-- Staff members (admin, support, intern) can view all transactions
CREATE POLICY "Staff can view all payment transactions"
  ON public.payment_transactions
  FOR SELECT
  USING (public.is_staff());

-- Policy for INSERT: Staff can create new payment transactions
-- Only staff can insert payment transactions (typically created via API/webhooks)
CREATE POLICY "Staff can insert payment transactions"
  ON public.payment_transactions
  FOR INSERT
  WITH CHECK (public.is_staff());

-- Policy for UPDATE: Staff can update payment transactions
-- Staff can update transaction status, provider_data, etc.
CREATE POLICY "Staff can update payment transactions"
  ON public.payment_transactions
  FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Policy for DELETE: Staff can delete payment transactions
-- Staff can delete transactions (typically for cleanup or corrections)
CREATE POLICY "Staff can delete payment transactions"
  ON public.payment_transactions
  FOR DELETE
  USING (public.is_staff());

-- ============================================
-- Add comments for documentation
-- ============================================

COMMENT ON POLICY "Staff can view all payment transactions" ON public.payment_transactions IS
'Allows staff members (admin, support, intern) to view all payment transactions in the system. Uses is_staff() function to verify staff status.';

COMMENT ON POLICY "Staff can insert payment transactions" ON public.payment_transactions IS
'Allows staff members to create new payment transactions. Typically used when creating transactions via API or processing webhooks from payment providers (e.g., Zum Rails). Uses is_staff() function to verify staff status.';

COMMENT ON POLICY "Staff can update payment transactions" ON public.payment_transactions IS
'Allows staff members to update existing payment transactions. Used for updating transaction status, provider_data JSONB, error information, and timestamps. Uses is_staff() function to verify staff status.';

COMMENT ON POLICY "Staff can delete payment transactions" ON public.payment_transactions IS
'Allows staff members to delete payment transactions. Typically used for cleanup, corrections, or removing test data. Uses is_staff() function to verify staff status.';

-- ============================================
-- Verification Queries (run after migration)
-- ============================================

-- Verify RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE schemaname = 'public' AND tablename = 'payment_transactions';
-- Should return: rowsecurity = true

-- Verify policies were created
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE tablename = 'payment_transactions'
-- ORDER BY policyname;
-- Should return 4 policies: Staff can view, Staff can insert, Staff can update, Staff can delete
