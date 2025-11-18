-- ============================================
-- Flash-Loan Database Schema Update
-- Adds CRM original data storage column to users table
-- ============================================

-- Add CRM original data column (JSONB to store full CRM response)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS crm_original_data jsonb;

-- Create index for CRM data queries (GIN index for JSONB)
CREATE INDEX IF NOT EXISTS idx_users_crm_original_data 
  ON public.users USING GIN (crm_original_data)
  WHERE crm_original_data IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.users.crm_original_data IS
'Stores the complete original JSON response from CRM API for this client. Used for data migration, reference extraction, and accessing fields not yet mapped to our schema.';

