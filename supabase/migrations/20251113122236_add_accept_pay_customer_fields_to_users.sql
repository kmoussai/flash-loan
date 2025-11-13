-- ============================================
-- Flash-Loan Database Schema Update
-- Adds Accept Pay customer tracking fields to users table
-- ============================================

-- 1️⃣ Add Accept Pay customer tracking columns
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS accept_pay_customer_id integer,
  ADD COLUMN IF NOT EXISTS accept_pay_customer_status text,
  ADD COLUMN IF NOT EXISTS accept_pay_customer_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS accept_pay_customer_updated_at timestamptz;

-- 2️⃣ Create index for Accept Pay customer ID lookups
CREATE INDEX IF NOT EXISTS idx_users_accept_pay_customer_id 
  ON public.users(accept_pay_customer_id) 
  WHERE accept_pay_customer_id IS NOT NULL;

-- 3️⃣ Create index for Accept Pay customer status filtering
CREATE INDEX IF NOT EXISTS idx_users_accept_pay_customer_status 
  ON public.users(accept_pay_customer_status) 
  WHERE accept_pay_customer_status IS NOT NULL;

-- 4️⃣ Add comments for documentation
COMMENT ON COLUMN public.users.accept_pay_customer_id IS
'Accept Pay Global customer ID (integer) - Links user to Accept Pay customer record';

COMMENT ON COLUMN public.users.accept_pay_customer_status IS
'Accept Pay customer status: active, suspended, or null if not yet created';

COMMENT ON COLUMN public.users.accept_pay_customer_created_at IS
'Timestamp when Accept Pay customer was created in Accept Pay system';

COMMENT ON COLUMN public.users.accept_pay_customer_updated_at IS
'Timestamp when Accept Pay customer record was last updated';

