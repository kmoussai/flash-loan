-- ============================================
-- Flash-Loan Database Schema Update
-- Ensures RLS policies are properly set up for loan_payments
-- Staff can view all payments, clients can view their own payments
-- ============================================

-- Ensure RLS is enabled on loan_payments
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;

-- 1️⃣ Drop existing policies (if any) to recreate them cleanly
DROP POLICY IF EXISTS "Users can view their own loan payments" ON public.loan_payments;
DROP POLICY IF EXISTS "Staff can view all loan payments" ON public.loan_payments;

-- 2️⃣ Create policy for clients to view their own payments
-- Clients can only see payments for loans they own
CREATE POLICY "Users can view their own loan payments"
  ON public.loan_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.loans
      WHERE loans.id = loan_payments.loan_id
      AND loans.user_id = auth.uid()
    )
  );

-- 3️⃣ Create policy for staff to view all payments
-- Staff members (admin, support, intern) can view all payments
CREATE POLICY "Staff can view all loan payments"
  ON public.loan_payments
  FOR SELECT
  USING (public.is_staff());

-- Add comment for documentation
COMMENT ON POLICY "Users can view their own loan payments" ON public.loan_payments IS
'Allows clients to view payment records for loans they own. Checks ownership via loan_payments -> loans -> user_id relationship.';

COMMENT ON POLICY "Staff can view all loan payments" ON public.loan_payments IS
'Allows staff members (admin, support, intern) to view all payment records in the system. Uses is_staff() function to verify staff status.';

