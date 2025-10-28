-- Migration: Add Modular IBV Support
-- This migration replaces Flinks-specific columns with a provider-agnostic approach
-- using an IBV provider enum and a JSONB field for provider-specific data

-- Step 1: Create IBV provider enum type
CREATE TYPE public.ibv_provider AS ENUM ('flinks', 'inverite', 'plaid', 'other');

-- Step 2: Create IBV status enum type
CREATE TYPE public.ibv_status AS ENUM ('pending', 'processing', 'verified', 'failed', 'cancelled', 'expired');

-- Step 3: Add new provider-agnostic IBV columns
ALTER TABLE public.loan_applications 
ADD COLUMN IF NOT EXISTS ibv_provider public.ibv_provider DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ibv_status public.ibv_status DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ibv_provider_data JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ibv_verified_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Step 4: Migrate existing Flinks data to new schema
UPDATE public.loan_applications
SET 
  ibv_provider = 'flinks',
  ibv_status = CASE 
    WHEN flinks_verification_status = 'verified' THEN 'verified'::public.ibv_status
    WHEN flinks_verification_status = 'failed' THEN 'failed'::public.ibv_status
    WHEN flinks_verification_status = 'cancelled' THEN 'cancelled'::public.ibv_status
    ELSE 'pending'::public.ibv_status
  END,
  ibv_provider_data = jsonb_build_object(
    'flinks_login_id', flinks_login_id,
    'flinks_request_id', flinks_request_id,
    'flinks_institution', flinks_institution,
    'flinks_connected_at', flinks_connected_at
  ),
  ibv_verified_at = CASE 
    WHEN flinks_verification_status = 'verified' THEN flinks_connected_at
    ELSE NULL
  END
WHERE flinks_login_id IS NOT NULL;

-- Step 5: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_loan_applications_ibv_provider 
  ON public.loan_applications(ibv_provider);

CREATE INDEX IF NOT EXISTS idx_loan_applications_ibv_status 
  ON public.loan_applications(ibv_status);

CREATE INDEX IF NOT EXISTS idx_loan_applications_ibv_provider_data 
  ON public.loan_applications USING GIN (ibv_provider_data);

-- Step 6: Add comments for documentation
COMMENT ON COLUMN public.loan_applications.ibv_provider IS 
  'The IBV provider used for bank verification (flinks, inverite, plaid, other)';

COMMENT ON COLUMN public.loan_applications.ibv_status IS 
  'Status of IBV verification: pending, processing, verified, failed, cancelled, expired';

COMMENT ON COLUMN public.loan_applications.ibv_provider_data IS 
  'Provider-specific IBV data stored as JSONB. Structure varies by provider:
   - Flinks: {login_id, request_id, institution, connected_at}
   - Inverite: {session_id, applicant_id, request_guid}
   - Plaid: {item_id, request_id, institution}
   - Other: {provider-specific fields}';

COMMENT ON COLUMN public.loan_applications.ibv_verified_at IS 
  'Timestamp when IBV verification was successfully completed';

-- Step 7: Create helper function to get IBV provider field
CREATE OR REPLACE FUNCTION public.get_ibv_provider_field(
  p_application_id UUID,
  p_field TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_provider_data JSONB;
  v_result JSONB;
BEGIN
  -- Get the IBV provider data JSON
  SELECT ibv_provider_data INTO v_provider_data
  FROM public.loan_applications
  WHERE id = p_application_id;

  -- If no data, return NULL
  IF v_provider_data IS NULL THEN
    RETURN NULL;
  END IF;

  -- Extract the field
  v_result := v_provider_data -> p_field;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_ibv_provider_field(UUID, TEXT) IS 
  'Extract a specific field from IBV provider data JSON (e.g., ''flinks_login_id'', ''inverite_session_id'')';

-- Step 8: Create function to check if application has verified IBV
CREATE OR REPLACE FUNCTION public.has_verified_ibv(p_application_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status public.ibv_status;
BEGIN
  SELECT ibv_status INTO v_status
  FROM public.loan_applications
  WHERE id = p_application_id;

  RETURN v_status = 'verified';
END;
$$;

COMMENT ON FUNCTION public.has_verified_ibv(UUID) IS 
  'Check if a loan application has a verified IBV status';

-- Note: We're NOT dropping the old Flinks columns yet to maintain backward compatibility
-- A future migration can remove them after full transition

