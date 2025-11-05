-- Migration: Remove Flinks-specific columns and consolidate to ibv_provider_data
-- This migration removes deprecated Flinks columns since we now use the modular IBV system
-- All provider-specific data (including Flinks) is stored in ibv_provider_data JSONB

-- Step 1: Ensure all Flinks data is migrated to ibv_provider_data
-- This updates any applications that might have been missed
UPDATE public.loan_applications
SET 
  ibv_provider = 'flinks',
  ibv_status = CASE 
    WHEN flinks_verification_status = 'verified' THEN 'verified'::public.ibv_status
    WHEN flinks_verification_status = 'failed' THEN 'failed'::public.ibv_status
    WHEN flinks_verification_status = 'cancelled' THEN 'cancelled'::public.ibv_status
    ELSE 'pending'::public.ibv_status
  END,
  ibv_provider_data = CASE
    WHEN ibv_provider_data IS NULL AND flinks_login_id IS NOT NULL THEN
      jsonb_build_object(
        'flinks_login_id', flinks_login_id,
        'flinks_request_id', flinks_request_id,
        'flinks_institution', flinks_institution,
        'flinks_connected_at', flinks_connected_at
      )
    ELSE ibv_provider_data
  END,
  ibv_verified_at = CASE 
    WHEN ibv_verified_at IS NULL 
      AND flinks_verification_status = 'verified' 
      AND flinks_connected_at IS NOT NULL 
      THEN flinks_connected_at
    ELSE ibv_verified_at
  END
WHERE flinks_login_id IS NOT NULL 
  AND (ibv_provider IS NULL OR ibv_provider_data IS NULL);

-- Step 2: Drop indexes for Flinks columns (no longer needed)
DROP INDEX IF EXISTS idx_loan_applications_flinks_login_id;
DROP INDEX IF EXISTS idx_loan_applications_flinks_request_id;
DROP INDEX IF EXISTS idx_loan_applications_flinks_verification_status;
DROP INDEX IF EXISTS idx_loan_applications_flinks_institution;

-- Step 3: Drop deprecated Flinks columns
ALTER TABLE public.loan_applications
DROP COLUMN IF EXISTS flinks_login_id,
DROP COLUMN IF EXISTS flinks_request_id,
DROP COLUMN IF EXISTS flinks_institution,
DROP COLUMN IF EXISTS flinks_verification_status,
DROP COLUMN IF EXISTS flinks_connected_at;

-- Step 4: Create a view for backward compatibility (optional)
CREATE OR REPLACE VIEW public.loan_applications_with_flinks AS
SELECT 
  *,
  CASE 
    WHEN ibv_provider = 'flinks' THEN ibv_provider_data->>'flinks_login_id'
    ELSE NULL 
  END AS flinks_login_id,
  CASE 
    WHEN ibv_provider = 'flinks' THEN ibv_provider_data->>'flinks_request_id'
    ELSE NULL 
  END AS flinks_request_id,
  CASE 
    WHEN ibv_provider = 'flinks' THEN ibv_provider_data->>'flinks_institution'
    ELSE NULL 
  END AS flinks_institution,
  CASE 
    WHEN ibv_provider = 'flinks' AND ibv_status = 'verified' THEN 'verified'
    WHEN ibv_provider = 'flinks' AND ibv_status = 'failed' THEN 'failed'
    WHEN ibv_provider = 'flinks' AND ibv_status = 'cancelled' THEN 'cancelled'
    WHEN ibv_provider = 'flinks' THEN 'pending'
    ELSE NULL 
  END AS flinks_verification_status
FROM public.loan_applications;

COMMENT ON VIEW public.loan_applications_with_flinks IS 
  'Backward compatibility view for Flinks-specific columns. Use base loan_applications table with ibv_provider_data instead.';

