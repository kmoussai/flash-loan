-- ============================================================
-- Create rejection_reasons lookup table
-- Used to provide a standardized list of rejection reasons
-- for loan applications (and potentially other entities).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rejection_reasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Short machine-friendly code (e.g. 'NoJob', 'TooManyNSF')
  code text NOT NULL UNIQUE,
  -- Human readable label for admins (e.g. 'No Job / Unemployed')
  label text NOT NULL,
  -- Optional longer description or guidance for staff
  description text,
  -- Whether this reason is available for selection in UI
  is_active boolean NOT NULL DEFAULT true,
  -- Optional category for analytics (e.g. 'income', 'repayment_history')
  category text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Basic index to support active filter and code lookups
CREATE INDEX IF NOT EXISTS idx_rejection_reasons_active
  ON public.rejection_reasons (is_active);

CREATE INDEX IF NOT EXISTS idx_rejection_reasons_code
  ON public.rejection_reasons (code);

-- Seed initial reasons based on CRM mappings and common manual reasons
INSERT INTO public.rejection_reasons (code, label, description, category)
VALUES
  ('NoJob', 'No Job', 'Applicant does not have a job or stable employment income.', 'income'),
  ('TooManyNSF', 'Too Many NSF', 'Bank statements show too many non-sufficient funds (NSF) transactions.', 'repayment_history'),
  ('StoppedPayments', 'Stopped Payments', 'Applicant has stopped payments on previous loan(s).', 'repayment_history'),
  ('InCollections', 'In Collections', 'Applicant is currently in collections with a creditor.', 'credit'),
  ('NoCapacity', 'No Capacity', 'Applicant does not have sufficient income to support requested loan.', 'affordability'),
  ('LoanAlreadyInProgress', 'Loan Already In Progress', 'Applicant already has a loan in progress.', 'existing_relationship'),
  ('AlreadyRejected', 'Already Rejected', 'Application or client profile has already been rejected.', 'process'),
  ('TooManyRequests', 'Too Many Requests', 'Too many loan requests in a short period.', 'fraud_risk'),
  ('DuplicateRequest', 'Duplicate Request', 'This appears to be a duplicate of an existing application.', 'process'),
  ('IncompleteDocuments', 'Incomplete / Missing Documents', 'Required documents are missing, incomplete, or not satisfactory.', 'documentation'),
  ('FraudRisk', 'Fraud', 'Suspected fraud, identity mismatch, or other high-risk indicators.', 'fraud_risk'),
  ('Other', 'Other', 'Other reason not covered by the predefined list (details in notes).', 'other')
ON CONFLICT (code) DO NOTHING;

-- Trigger to keep updated_at current
CREATE OR REPLACE FUNCTION public.update_rejection_reasons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_rejection_reasons_updated_at ON public.rejection_reasons;
CREATE TRIGGER update_rejection_reasons_updated_at
  BEFORE UPDATE ON public.rejection_reasons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_rejection_reasons_updated_at();


