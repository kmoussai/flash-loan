-- Migration: Add Flinks Data Fields to loan_applications table
-- This adds columns to store Flinks Connect data including loginId, requestId, and institution

-- Add Flinks connection fields to loan_applications table
ALTER TABLE public.loan_applications 
ADD COLUMN IF NOT EXISTS flinks_login_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS flinks_request_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS flinks_institution VARCHAR(255),
ADD COLUMN IF NOT EXISTS flinks_verification_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS flinks_connected_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_loan_applications_flinks_login_id 
  ON public.loan_applications(flinks_login_id);

CREATE INDEX IF NOT EXISTS idx_loan_applications_flinks_request_id 
  ON public.loan_applications(flinks_request_id);

CREATE INDEX IF NOT EXISTS idx_loan_applications_flinks_verification_status 
  ON public.loan_applications(flinks_verification_status);

CREATE INDEX IF NOT EXISTS idx_loan_applications_flinks_institution 
  ON public.loan_applications(flinks_institution);

-- Add comments to document the columns
COMMENT ON COLUMN public.loan_applications.flinks_login_id IS 'Unique identifier from Flinks Connect for the bank connection';
COMMENT ON COLUMN public.loan_applications.flinks_request_id IS 'Unique identifier from Flinks Connect for the verification request';
COMMENT ON COLUMN public.loan_applications.flinks_institution IS 'Bank or financial institution name connected through Flinks';
COMMENT ON COLUMN public.loan_applications.flinks_verification_status IS 'Status of Flinks verification: pending, verified, failed, cancelled';
COMMENT ON COLUMN public.loan_applications.flinks_connected_at IS 'Timestamp when Flinks connection was established';
