-- Migration: Add rent_cost parameter to submit_loan_application function
-- This allows storing rent cost per address when submitting loan applications

-- Drop existing versions of submit_loan_application to allow signature change
DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN
    SELECT proname, oidvectortypes(proargtypes) AS args
    FROM pg_proc
    WHERE proname = 'submit_loan_application'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', func_record.proname, func_record.args);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.submit_loan_application(
  -- Core applicant information
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_date_of_birth date,
  p_preferred_language text,

  -- Minimal loan preferences
  p_province text,
  p_loan_amount numeric,
  p_income_source public.income_source_type DEFAULT NULL,
  p_income_fields jsonb DEFAULT '{}'::jsonb,
  p_bankruptcy_plan boolean DEFAULT false,
  p_references jsonb DEFAULT '[]'::jsonb,

  -- Optional identifiers/data captured in full application
  p_client_id uuid DEFAULT NULL,
  p_street_number text DEFAULT NULL,
  p_street_name text DEFAULT NULL,
  p_apartment_number text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_postal_code text DEFAULT NULL,
  p_moving_date date DEFAULT NULL,
  p_residence_status text DEFAULT NULL,
  p_gross_salary numeric DEFAULT NULL,
  p_rent_or_mortgage_cost numeric DEFAULT NULL,
  p_heating_electricity_cost numeric DEFAULT NULL,
  p_car_loan numeric DEFAULT NULL,
  p_furniture_loan numeric DEFAULT NULL,
  
  -- Address rent cost (new parameter)
  p_rent_cost numeric DEFAULT NULL,

  -- IBV metadata
  p_ibv_provider public.ibv_provider DEFAULT NULL,
  p_ibv_status public.ibv_status DEFAULT NULL,
  p_ibv_provider_data jsonb DEFAULT NULL
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
  
  -- Step 1: Locate or validate client
  IF p_client_id IS NOT NULL THEN
    SELECT id INTO v_client_id FROM public.users WHERE id = p_client_id;

    IF v_client_id IS NULL THEN
      RAISE EXCEPTION 'Client with provided client_id does not exist';
    END IF;

    v_is_previous_borrower := true;
  ELSE
    SELECT id INTO v_client_id FROM public.users WHERE email = p_email;

    IF v_client_id IS NULL THEN
      RAISE EXCEPTION 'Client ID is required for new users';
    END IF;
  END IF;

  -- Update client profile with latest basics
  UPDATE public.users
  SET
    first_name = p_first_name,
    last_name = p_last_name,
    date_of_birth = p_date_of_birth,
    phone = p_phone,
    email = p_email,
    preferred_language = p_preferred_language,
    residence_status = COALESCE(p_residence_status, residence_status),
    gross_salary = COALESCE(p_gross_salary, gross_salary),
    rent_or_mortgage_cost = COALESCE(p_rent_or_mortgage_cost, rent_or_mortgage_cost),
    heating_electricity_cost = COALESCE(p_heating_electricity_cost, heating_electricity_cost),
    car_loan = COALESCE(p_car_loan, car_loan),
    furniture_loan = COALESCE(p_furniture_loan, furniture_loan),
    updated_at = now()
  WHERE id = v_client_id;

  -- Determine previous borrower status
  IF EXISTS (
    SELECT 1 FROM public.loan_applications
    WHERE client_id = v_client_id
    LIMIT 1
  ) THEN
    v_is_previous_borrower := true;
  END IF;

  -- Step 2: Create or update address when provided
  IF p_street_number IS NOT NULL
     AND p_street_name IS NOT NULL
     AND p_city IS NOT NULL
     AND p_postal_code IS NOT NULL THEN
    SELECT id INTO v_address_id
    FROM public.addresses
    WHERE client_id = v_client_id
      AND street_number = p_street_number
      AND street_name = p_street_name
      AND COALESCE(apartment_number, '') = COALESCE(p_apartment_number, '')
      AND city = p_city
      AND postal_code = p_postal_code
    LIMIT 1;
  
    IF v_address_id IS NULL THEN
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
        rent_cost,
        is_current
      ) VALUES (
        v_client_id,
        'current',
        p_street_number,
        p_street_name,
        NULLIF(p_apartment_number, ''),
        p_city,
        COALESCE(p_province, 'Quebec'),
        p_postal_code,
        p_moving_date,
        p_rent_cost,
        true
      )
      RETURNING id INTO v_address_id;

      UPDATE public.addresses
      SET is_current = false
      WHERE client_id = v_client_id AND id <> v_address_id;
    ELSE
      UPDATE public.addresses
      SET
        moving_date = COALESCE(p_moving_date, moving_date),
        province = COALESCE(p_province, province),
        rent_cost = COALESCE(p_rent_cost, rent_cost),
        is_current = true,
        updated_at = now()
      WHERE id = v_address_id;

      UPDATE public.addresses
      SET is_current = false
      WHERE client_id = v_client_id AND id <> v_address_id;
    END IF;
  
    UPDATE public.users
    SET current_address_id = v_address_id
    WHERE id = v_client_id;
  ELSE
    v_address_id := NULL;
  END IF;

  -- Step 3: Create loan application with optional data
  INSERT INTO public.loan_applications (
    client_id,
    address_id,
    loan_amount,
    income_source,
    income_fields,
    application_status,
    bankruptcy_plan,
    submitted_at,
    ibv_provider,
    ibv_status,
    ibv_provider_data,
    ibv_verified_at
  ) VALUES (
    v_client_id,
    v_address_id,
    p_loan_amount,
    p_income_source,
    COALESCE(p_income_fields, '{}'::jsonb),
    'pending',
    COALESCE(p_bankruptcy_plan, false),
    now(),
    p_ibv_provider,
    p_ibv_status,
    p_ibv_provider_data,
    CASE WHEN p_ibv_status = 'verified' AND p_ibv_provider_data IS NOT NULL THEN now() ELSE NULL END
  )
  RETURNING id INTO v_application_id;

  -- Step 4: Insert references when provided
  IF p_references IS NOT NULL
     AND jsonb_typeof(p_references) = 'array'
     AND jsonb_array_length(p_references) > 0 THEN
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

  -- Step 5: Return outcome payload
  v_result := jsonb_build_object(
    'application_id', v_application_id,
    'client_id', v_client_id,
    'address_id', v_address_id,
    'is_previous_borrower', v_is_previous_borrower,
    'ibv_connected', CASE WHEN p_ibv_provider IS NOT NULL THEN true ELSE false END
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error submitting loan application: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.submit_loan_application IS
'Submits a loan application with minimal quick-apply data. Supports optional address, financial, and reference details and stores IBV metadata when available. Now includes rent_cost parameter for storing monthly rent/mortgage cost per address.';

GRANT EXECUTE ON FUNCTION public.submit_loan_application TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_loan_application TO service_role;

