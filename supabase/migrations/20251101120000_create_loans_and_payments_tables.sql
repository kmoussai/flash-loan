-- ============================================
-- Flash-Loan Database Schema - Loans and Payments
-- Creates loans and loan_payments tables for managing approved loans
-- ============================================

-- 1️⃣ Create ENUMS first
DROP TYPE IF EXISTS public.loan_status CASCADE;
CREATE TYPE public.loan_status AS ENUM (
  'pending_disbursement',
  'active',
  'completed',
  'defaulted',
  'cancelled'
);

DROP TYPE IF EXISTS public.payment_status CASCADE;
CREATE TYPE public.payment_status AS ENUM (
  'pending',
  'confirmed',
  'failed'
);

-- 2️⃣ Create loans table
CREATE TABLE IF NOT EXISTS public.loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  principal_amount numeric(12,2) NOT NULL,
  interest_rate numeric(5,2) NOT NULL,
  term_months integer NOT NULL,
  disbursement_date date,
  due_date date,
  remaining_balance numeric(12,2) DEFAULT 0,
  status public.loan_status DEFAULT 'pending_disbursement',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3️⃣ Create loan_payments table
CREATE TABLE IF NOT EXISTS public.loan_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  payment_date timestamptz DEFAULT now(),
  method text,
  status public.payment_status DEFAULT 'confirmed',
  created_at timestamptz DEFAULT now()
);

-- 4️⃣ Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_loans_application_id ON public.loans(application_id);
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON public.loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON public.loans(status);
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON public.loan_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_status ON public.loan_payments(status);
CREATE INDEX IF NOT EXISTS idx_loan_payments_payment_date ON public.loan_payments(payment_date);

-- 5️⃣ Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6️⃣ Create trigger for loans.updated_at
DROP TRIGGER IF EXISTS update_loans_updated_at ON public.loans;
CREATE TRIGGER update_loans_updated_at
  BEFORE UPDATE ON public.loans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 7️⃣ Enable Row Level Security
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;

-- 8️⃣ Create RLS policies (basic - should be customized based on requirements)
-- Users can view their own loans
CREATE POLICY "Users can view their own loans"
  ON public.loans
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view their own loan payments
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

