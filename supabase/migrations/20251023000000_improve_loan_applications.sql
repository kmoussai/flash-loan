-- Improvements to loan_applications table
-- Add missing fields from the application form

-- Add pre-qualification field
ALTER TABLE public.loan_applications
ADD COLUMN IF NOT EXISTS bankruptcy_plan boolean DEFAULT false;

-- Add timestamp fields for tracking application lifecycle
ALTER TABLE public.loan_applications
ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS rejected_at timestamptz;

-- Add staff notes and rejection reason
ALTER TABLE public.loan_applications
ADD COLUMN IF NOT EXISTS staff_notes text,
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Update loan amount constraint to include maximum
ALTER TABLE public.loan_applications
DROP CONSTRAINT IF EXISTS positive_loan_amount,
ADD CONSTRAINT valid_loan_amount CHECK (loan_amount > 0 AND loan_amount <= 1500);

-- Add comment documenting the income_fields JSONB structure
COMMENT ON COLUMN public.loan_applications.income_fields IS 
'JSONB field storing dynamic income-related data based on income_source type.
Expected schemas:
- employed: {occupation, company_name, supervisor_name, work_phone, post, payroll_frequency, date_hired, next_pay_date}
- employment-insurance: {employment_insurance_start_date, next_deposit_date}
- self-employed: {paid_by_direct_deposit, self_employed_phone, deposits_frequency, self_employed_start_date, next_deposit_date}
- csst-saaq: {next_deposit_date}
- parental-insurance: {next_deposit_date}
- retirement-plan: {next_deposit_date}';

-- Create a function to automatically set submitted_at when application status changes to pending
CREATE OR REPLACE FUNCTION public.set_submitted_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.application_status = 'pending' AND OLD.submitted_at IS NULL THEN
    NEW.submitted_at = now();
  END IF;
  
  IF NEW.application_status = 'approved' AND OLD.approved_at IS NULL THEN
    NEW.approved_at = now();
  END IF;
  
  IF NEW.application_status = 'rejected' AND OLD.rejected_at IS NULL THEN
    NEW.rejected_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tracking status changes
DROP TRIGGER IF EXISTS track_application_status_changes ON public.loan_applications;
CREATE TRIGGER track_application_status_changes
  BEFORE UPDATE ON public.loan_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_submitted_at();

-- Create an index on submitted_at for reporting
CREATE INDEX IF NOT EXISTS idx_loan_applications_submitted_at ON public.loan_applications(submitted_at DESC);

