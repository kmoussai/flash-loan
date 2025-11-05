-- ============================================
-- Add interest_rate to loan_applications
-- Allows interest rate to be set per application and used for contract generation
-- ============================================

-- Add interest_rate column to loan_applications
ALTER TABLE public.loan_applications
ADD COLUMN IF NOT EXISTS interest_rate numeric(5,2) DEFAULT 29.00;

-- Add comment
COMMENT ON COLUMN public.loan_applications.interest_rate IS 
'Annual interest rate percentage for this loan application. Default: 29.00%. Can be adjusted before contract generation.';

-- Create index for reporting/querying
CREATE INDEX IF NOT EXISTS idx_loan_applications_interest_rate 
ON public.loan_applications(interest_rate);

