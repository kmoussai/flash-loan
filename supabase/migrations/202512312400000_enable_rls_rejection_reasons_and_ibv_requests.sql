-- ============================================
-- Flash-Loan Database Schema Update
-- Enable Row Level Security (RLS) on rejection_reasons and loan_application_ibv_requests tables
-- Only staff members can interact with these tables
-- ============================================

-- ============================================
-- 1. REJECTION_REASONS TABLE
-- ============================================

-- Enable RLS on rejection_reasons table
ALTER TABLE public.rejection_reasons ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (for idempotency)
DROP POLICY IF EXISTS "Staff can view rejection reasons" ON public.rejection_reasons;
DROP POLICY IF EXISTS "Staff can insert rejection reasons" ON public.rejection_reasons;
DROP POLICY IF EXISTS "Staff can update rejection reasons" ON public.rejection_reasons;
DROP POLICY IF EXISTS "Staff can delete rejection reasons" ON public.rejection_reasons;

-- Policy for SELECT: Staff can view all rejection reasons
CREATE POLICY "Staff can view rejection reasons"
  ON public.rejection_reasons
  FOR SELECT
  USING (public.is_staff());

-- Policy for INSERT: Staff can create new rejection reasons
CREATE POLICY "Staff can insert rejection reasons"
  ON public.rejection_reasons
  FOR INSERT
  WITH CHECK (public.is_staff());

-- Policy for UPDATE: Staff can update rejection reasons
CREATE POLICY "Staff can update rejection reasons"
  ON public.rejection_reasons
  FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Policy for DELETE: Staff can delete rejection reasons
CREATE POLICY "Staff can delete rejection reasons"
  ON public.rejection_reasons
  FOR DELETE
  USING (public.is_staff());

-- Add comments for documentation
COMMENT ON POLICY "Staff can view rejection reasons" ON public.rejection_reasons IS
'Allows staff members (admin, support, intern) to view all rejection reasons. Uses is_staff() function to verify staff status.';

COMMENT ON POLICY "Staff can insert rejection reasons" ON public.rejection_reasons IS
'Allows staff members to create new rejection reasons. Uses is_staff() function to verify staff status.';

COMMENT ON POLICY "Staff can update rejection reasons" ON public.rejection_reasons IS
'Allows staff members to update existing rejection reasons. Uses is_staff() function to verify staff status.';

COMMENT ON POLICY "Staff can delete rejection reasons" ON public.rejection_reasons IS
'Allows staff members to delete rejection reasons. Uses is_staff() function to verify staff status.';

-- ============================================
-- 2. LOAN_APPLICATION_IBV_REQUESTS TABLE
-- ============================================

-- Enable RLS on loan_application_ibv_requests table
ALTER TABLE public.loan_application_ibv_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (for idempotency)
DROP POLICY IF EXISTS "Staff can view IBV requests" ON public.loan_application_ibv_requests;
DROP POLICY IF EXISTS "Staff can insert IBV requests" ON public.loan_application_ibv_requests;
DROP POLICY IF EXISTS "Staff can update IBV requests" ON public.loan_application_ibv_requests;
DROP POLICY IF EXISTS "Staff can delete IBV requests" ON public.loan_application_ibv_requests;

-- Policy for SELECT: Staff can view all IBV requests
CREATE POLICY "Staff can view IBV requests"
  ON public.loan_application_ibv_requests
  FOR SELECT
  USING (public.is_staff());

-- Policy for INSERT: Staff can create new IBV requests
CREATE POLICY "Staff can insert IBV requests"
  ON public.loan_application_ibv_requests
  FOR INSERT
  WITH CHECK (public.is_staff());

-- Policy for UPDATE: Staff can update IBV requests
CREATE POLICY "Staff can update IBV requests"
  ON public.loan_application_ibv_requests
  FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- Policy for DELETE: Staff can delete IBV requests
CREATE POLICY "Staff can delete IBV requests"
  ON public.loan_application_ibv_requests
  FOR DELETE
  USING (public.is_staff());

-- Add comments for documentation
COMMENT ON POLICY "Staff can view IBV requests" ON public.loan_application_ibv_requests IS
'Allows staff members (admin, support, intern) to view all IBV (Identity/Bank Verification) requests. Uses is_staff() function to verify staff status.';

COMMENT ON POLICY "Staff can insert IBV requests" ON public.loan_application_ibv_requests IS
'Allows staff members to create new IBV requests. Uses is_staff() function to verify staff status.';

COMMENT ON POLICY "Staff can update IBV requests" ON public.loan_application_ibv_requests IS
'Allows staff members to update existing IBV requests. Uses is_staff() function to verify staff status.';

COMMENT ON POLICY "Staff can delete IBV requests" ON public.loan_application_ibv_requests IS
'Allows staff members to delete IBV requests. Uses is_staff() function to verify staff status.';
