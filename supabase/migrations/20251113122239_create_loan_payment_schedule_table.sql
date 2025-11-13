-- ============================================
-- Flash-Loan Database Schema Update
-- Creates loan_payment_schedule table for tracking scheduled payments
-- ============================================

-- 1️⃣ Create ENUM for payment schedule status
DROP TYPE IF EXISTS public.payment_schedule_status CASCADE;
CREATE TYPE public.payment_schedule_status AS ENUM (
  'pending',      -- Payment scheduled but not yet requested
  'scheduled',    -- Payment request created in Accept Pay
  'authorized',   -- Payment authorized in Accept Pay
  'collected',    -- Payment successfully collected
  'missed',        -- Payment due date passed without collection
  'failed',        -- Payment collection failed
  'cancelled'     -- Payment schedule cancelled
);

-- 2️⃣ Create loan_payment_schedule table
CREATE TABLE IF NOT EXISTS public.loan_payment_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  amount numeric(12,2) NOT NULL,
  payment_number integer NOT NULL,
  status public.payment_schedule_status DEFAULT 'pending',
  accept_pay_transaction_id integer,
  loan_payment_id uuid REFERENCES public.loan_payments(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure payment numbers are unique per loan
  CONSTRAINT unique_loan_payment_number UNIQUE (loan_id, payment_number),
  
  -- Ensure amounts are positive
  CONSTRAINT positive_payment_amount CHECK (amount > 0)
);

-- 3️⃣ Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_loan_payment_schedule_loan_id 
  ON public.loan_payment_schedule(loan_id);

CREATE INDEX IF NOT EXISTS idx_loan_payment_schedule_scheduled_date 
  ON public.loan_payment_schedule(scheduled_date);

CREATE INDEX IF NOT EXISTS idx_loan_payment_schedule_status 
  ON public.loan_payment_schedule(status);

CREATE INDEX IF NOT EXISTS idx_loan_payment_schedule_accept_pay_transaction_id 
  ON public.loan_payment_schedule(accept_pay_transaction_id) 
  WHERE accept_pay_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_loan_payment_schedule_loan_payment_id 
  ON public.loan_payment_schedule(loan_payment_id) 
  WHERE loan_payment_id IS NOT NULL;

-- 4️⃣ Create trigger for updated_at
DROP TRIGGER IF EXISTS update_loan_payment_schedule_updated_at ON public.loan_payment_schedule;
CREATE TRIGGER update_loan_payment_schedule_updated_at
  BEFORE UPDATE ON public.loan_payment_schedule
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5️⃣ Enable Row Level Security
ALTER TABLE public.loan_payment_schedule ENABLE ROW LEVEL SECURITY;

-- 6️⃣ Create RLS policies
DROP POLICY IF EXISTS "Users can view their own payment schedules" ON public.loan_payment_schedule;
CREATE POLICY "Users can view their own payment schedules"
  ON public.loan_payment_schedule
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.loans
      WHERE loans.id = loan_payment_schedule.loan_id
      AND loans.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff can view all payment schedules" ON public.loan_payment_schedule;
CREATE POLICY "Staff can view all payment schedules"
  ON public.loan_payment_schedule
  FOR SELECT
  USING (public.is_staff());

DROP POLICY IF EXISTS "Staff can manage payment schedules" ON public.loan_payment_schedule;
CREATE POLICY "Staff can manage payment schedules"
  ON public.loan_payment_schedule
  FOR ALL
  USING (public.is_staff());

-- 7️⃣ Add comments for documentation
COMMENT ON TABLE public.loan_payment_schedule IS
'Tracks scheduled payments for loans. Links to Accept Pay transactions and actual payment records.';

COMMENT ON COLUMN public.loan_payment_schedule.loan_id IS
'Foreign key to loans table';

COMMENT ON COLUMN public.loan_payment_schedule.scheduled_date IS
'Scheduled due date for this payment';

COMMENT ON COLUMN public.loan_payment_schedule.amount IS
'Scheduled payment amount';

COMMENT ON COLUMN public.loan_payment_schedule.payment_number IS
'Sequential payment number (1, 2, 3, etc.) for this loan';

COMMENT ON COLUMN public.loan_payment_schedule.status IS
'Current status of the scheduled payment';

COMMENT ON COLUMN public.loan_payment_schedule.accept_pay_transaction_id IS
'Accept Pay transaction ID when payment collection is initiated';

COMMENT ON COLUMN public.loan_payment_schedule.loan_payment_id IS
'Links to actual loan_payments record when payment is collected';

