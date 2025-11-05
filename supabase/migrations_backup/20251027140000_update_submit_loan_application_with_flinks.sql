-- Migration: Update submit_loan_application function to include Flinks data
-- This adds Flinks connection parameters and fixes ON CONFLICT issues

CREATE OR REPLACE FUNCTION public.submit_loan_application(
  -- REQUIRED PARAMETERS (no defaults)
  -- Personal Information
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_date_of_birth date,
  p_preferred_language text,
  
  -- Address Information
  p_street_number text,
  p_street_name text,
  p_apartment_number text,
  p_city text,
  p_province text,
  p_postal_code text,
  p_moving_date date,
  
  -- Loan Details
  p_loan_amount numeric,
  p_loan_type public.loan_type,
  p_income_source public.income_source_type,
  p_income_fields jsonb,
  p_bankruptcy_plan boolean,
  
  -- References (as JSONB array)
  p_references jsonb,
  
  -- OPTIONAL PARAMETERS (with defaults - must come last)
  -- Client ID (if existing user)
  p_client_id uuid DEFAULT NULL,
  
  -- Financial Obligations (Quebec only - nullable)
  p_residence_status text DEFAULT NULL,
  p_gross_salary numeric DEFAULT NULL,
  p_rent_or_mortgage_cost numeric DEFAULT NULL,
  p_heating_electricity_cost numeric DEFAULT NULL,
  p_car_loan numeric DEFAULT NULL,
  p_furniture_loan numeric DEFAULT NULL,
  
  -- Flinks Connection Data (new parameters)
  p_flinks_login_id text DEFAULT NULL,
  p_flinks_request_id text DEFAULT NULL,
  p_flinks_institution text DEFAULT NULL,
  p_flinks_verification_status text DEFAULT 'pending'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_address_id uuid;
  v_application_id uuid;
  v_is_previous_borrower boolean := false;
  v_reference jsonb;
  v_result jsonb;
BEGIN
  -- Start transaction (implicit in function)
  
  -- Step 1: Determine or use client ID
  IF p_client_id IS NOT NULL THEN
    v_client_id := p_client_id;
    v_is_previous_borrower := true;
  ELSE
    -- Check if user exists by email
    SELECT id INTO v_client_id
    FROM public.users
    WHERE email = p_email
    LIMIT 1;
    
    IF v_client_id IS NOT NULL THEN
      v_is_previous_borrower := true;
    ELSE
      -- This should not happen if called correctly from API
      -- The API should create the auth user first
      RAISE EXCEPTION 'Client ID is required for new users';
    END IF;
  END IF;
  
  -- Check if client has previous applications
  IF EXISTS (
    SELECT 1 FROM public.loan_applications 
    WHERE client_id = v_client_id 
    LIMIT 1
  ) THEN
    v_is_previous_borrower := true;
  END IF;
  
  -- Step 2: Update user profile (simple UPDATE, no ON CONFLICT needed)
  UPDATE public.users SET
    first_name = p_first_name,
    last_name = p_last_name,
    phone = p_phone,
    date_of_birth = p_date_of_birth,
    preferred_language = p_preferred_language,
    residence_status = p_residence_status,
    gross_salary = p_gross_salary,
    rent_or_mortgage_cost = p_rent_or_mortgage_cost,
    heating_electricity_cost = p_heating_electricity_cost,
    car_loan = p_car_loan,
    furniture_loan = p_furniture_loan,
    updated_at = now()
  WHERE id = v_client_id;
  
  -- Step 3: Mark old addresses as not current
  UPDATE public.addresses
  SET is_current = false
  WHERE client_id = v_client_id;
  
  -- Step 4: Insert new address
  INSERT INTO public.addresses (
    client_id,
    address_type,
    street_number,
    street_name,
    apartment_number,
    city,
    province,
    postal_code,
    moving_date,
    is_current
  ) VALUES (
    v_client_id,
    'current',
    p_street_number,
    p_street_name,
    NULLIF(p_apartment_number, ''),
    p_city,
    p_province,
    p_postal_code,
    p_moving_date,
    true
  )
  RETURNING id INTO v_address_id;
  
  -- Step 5: Update user's current_address_id
  UPDATE public.users
  SET current_address_id = v_address_id
  WHERE id = v_client_id;
  
  -- Step 6: Create loan application with Flinks data
  INSERT INTO public.loan_applications (
    client_id,
    address_id,
    loan_amount,
    loan_type,
    income_source,
    income_fields,
    application_status,
    bankruptcy_plan,
    submitted_at,
    -- Flinks data
    flinks_login_id,
    flinks_request_id,
    flinks_institution,
    flinks_verification_status,
    flinks_connected_at
  ) VALUES (
    v_client_id,
    v_address_id,
    p_loan_amount,
    p_loan_type,
    p_income_source,
    p_income_fields,
    'pending',
    p_bankruptcy_plan,
    now(),
    -- Flinks data
    p_flinks_login_id,
    p_flinks_request_id,
    p_flinks_institution,
    p_flinks_verification_status,
    CASE WHEN p_flinks_login_id IS NOT NULL THEN now() ELSE NULL END
  )
  RETURNING id INTO v_application_id;
  
  -- Step 7: Insert references
  IF p_references IS NOT NULL AND jsonb_array_length(p_references) > 0 THEN
    FOR v_reference IN SELECT * FROM jsonb_array_elements(p_references)
    LOOP
      INSERT INTO public.references (
        loan_application_id,
        first_name,
        last_name,
        phone,
        relationship
      ) VALUES (
        v_application_id,
        v_reference->>'first_name',
        v_reference->>'last_name',
        v_reference->>'phone',
        v_reference->>'relationship'
      );
    END LOOP;
  END IF;
  
  -- Step 8: Return result
  v_result := jsonb_build_object(
    'application_id', v_application_id,
    'client_id', v_client_id,
    'address_id', v_address_id,
    'is_previous_borrower', v_is_previous_borrower,
    'flinks_connected', CASE WHEN p_flinks_login_id IS NOT NULL THEN true ELSE false END
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback on any error
    RAISE EXCEPTION 'Error submitting loan application: %', SQLERRM;
END;
$$;
