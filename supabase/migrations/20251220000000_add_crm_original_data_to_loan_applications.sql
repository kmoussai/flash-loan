-- ============================================
-- Flash-Loan Database Schema Update
-- Adds CRM original data storage column to loan_applications table
-- ============================================

-- Add CRM original data column (JSONB to store full CRM loan request response)
ALTER TABLE public.loan_applications
  ADD COLUMN IF NOT EXISTS crm_original_data jsonb;

-- Create index for CRM data queries (GIN index for JSONB)
CREATE INDEX IF NOT EXISTS idx_loan_applications_crm_original_data 
  ON public.loan_applications USING GIN (crm_original_data)
  WHERE crm_original_data IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.loan_applications.crm_original_data IS
'Stores the complete original JSON response from CRM API for this loan request/demand. Used for data migration, extracting additional fields not yet mapped to our schema, and maintaining reference to original CRM data.';

