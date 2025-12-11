-- ============================================
-- Flash-Loan Database Schema Update
-- Recreate client_profiles and contract_details views with security_invoker = on
-- This addresses Supabase recommendation for proper RLS enforcement on views
-- ============================================

-- ============================================
-- 1. CLIENT_PROFILES VIEW
-- ============================================

-- Drop and recreate the view with security_invoker = on
DROP VIEW IF EXISTS public.client_profiles;

CREATE VIEW public.client_profiles 
WITH (security_invoker = on) 
AS
SELECT 
  u.id,
  u.first_name,
  u.last_name,
  u.email,
  u.phone,
  u.date_of_birth,
  u.preferred_language,
  u.kyc_status,
  u.residence_status,
  u.gross_salary,
  u.rent_or_mortgage_cost,
  u.heating_electricity_cost,
  u.car_loan,
  u.furniture_loan,
  a.id AS address_id,
  a.street_number,
  a.street_name,
  a.apartment_number,
  a.city,
  a.province,
  a.postal_code,
  a.moving_date,
  u.created_at,
  u.updated_at
FROM public.users u
LEFT JOIN public.addresses a ON u.current_address_id = a.id
WHERE a.is_current = true OR a.id IS NULL;

-- Grant permissions on the view
GRANT SELECT ON public.client_profiles TO authenticated;

-- Add comment
COMMENT ON VIEW public.client_profiles IS
'View combining user profiles with current address. RLS is enforced through underlying users and addresses tables. Clients can view their own profile, staff can view all profiles. Created with security_invoker = on to ensure RLS policies from underlying tables are properly enforced.';

-- ============================================
-- 2. CONTRACT_DETAILS VIEW
-- ============================================

-- Drop and recreate the view with security_invoker = on
DROP VIEW IF EXISTS public.contract_details;

CREATE VIEW public.contract_details 
WITH (security_invoker = on) 
AS
SELECT 
  lc.id AS contract_id,
  lc.contract_number,
  lc.loan_application_id,
  lc.loan_id,
  lc.contract_version,
  lc.contract_status,
  lc.contract_terms,
  lc.bank_account,
  lc.client_signed_at,
  lc.staff_signed_at,
  lc.sent_at,
  lc.expires_at,
  la.client_id,
  la.loan_amount,
  la.application_status,
  u.first_name,
  u.last_name,
  u.email,
  u.phone,
  la.created_at AS application_created_at
FROM public.loan_contracts lc
JOIN public.loan_applications la ON lc.loan_application_id = la.id
JOIN public.users u ON la.client_id = u.id;

-- Grant permissions on the view
GRANT SELECT ON public.contract_details TO authenticated;

-- Add comment
COMMENT ON VIEW public.contract_details IS
'View combining loan contracts with application and user details. RLS is enforced through underlying loan_contracts, loan_applications, and users tables. Clients can view their own contracts, staff can view all contracts. Created with security_invoker = on to ensure RLS policies from underlying tables are properly enforced.';
