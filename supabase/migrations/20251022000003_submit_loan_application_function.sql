-- ============================================
-- Atomic Loan Application Submission Function
-- Final consolidated version with modular IBV support
-- This function handles the entire loan application process as a single transaction
-- ============================================

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
  
  -- IBV Data (modular parameters)
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
  
  -- Step 1: Check if client exists by email or create new
  IF p_client_id IS NOT NULL THEN
    -- Using provided client_id
    SELECT id INTO v_client_id FROM public.users WHERE id = p_client_id;
    
    IF v_client_id IS NULL THEN
      RAISE EXCEPTION 'Client with provided client_id does not exist';
    END IF;
    
    -- Mark as previous borrower
    v_is_previous_borrower := true;
  ELSE
    -- Check if client exists by email
    SELECT id INTO v_client_id FROM public.users WHERE email = p_email;
    
    IF v_client_id IS NULL THEN
      -- This should not happen if called correctly from API
      -- The API should create the auth user first
      RAISE EXCEPTION 'Client ID is required for new users';
    ELSE
      -- Update existing client
      UPDATE public.users
      SET 
        first_name = p_first_name,
        last_name = p_last_name,
        date_of_birth = p_date_of_birth,
        phone = p_phone,
        preferred_language = p_preferred_language,
        residence_status = p_residence_status,
        gross_salary = p_gross_salary,
        rent_or_mortgage_cost = p_rent_or_mortgage_cost,
        heating_electricity_cost = p_heating_electricity_cost,
        car_loan = p_car_loan,
        furniture_loan = p_furniture_loan,
        updated_at = now()
      WHERE id = v_client_id;
      
      v_is_previous_borrower := true;
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
  
  -- Step 2: Get or create address
  -- Check if address exists (simplified check - in production, you'd want more robust matching)
  SELECT id INTO v_address_id
  FROM public.addresses
  WHERE client_id = v_client_id
    AND street_number = p_street_number
    AND street_name = p_street_name
    AND COALESCE(apartment_number, '') = COALESCE(p_apartment_number, '')
    AND city = p_city
    AND province = p_province
    AND postal_code = p_postal_code
  LIMIT 1;
  
  IF v_address_id IS NULL THEN
    -- Create new address
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
    
    -- Mark previous addresses as not current
    UPDATE public.addresses
    SET is_current = false
    WHERE client_id = v_client_id AND id != v_address_id;
  ELSE
    -- Update existing address
    UPDATE public.addresses
    SET 
      moving_date = p_moving_date,
      is_current = true,
      updated_at = now()
    WHERE id = v_address_id;
    
    -- Mark previous addresses as not current
    UPDATE public.addresses
    SET is_current = false
    WHERE client_id = v_client_id AND id != v_address_id;
  END IF;
  
  -- Step 3: Update user's current_address_id
  UPDATE public.users
  SET current_address_id = v_address_id
  WHERE id = v_client_id;
  
  -- Step 4: Create loan application with IBV data
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
    -- IBV data (modular)
    ibv_provider,
    ibv_status,
    ibv_provider_data,
    ibv_verified_at
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
    -- IBV data
    p_ibv_provider,
    p_ibv_status,
    p_ibv_provider_data,
    CASE 
      WHEN p_ibv_status = 'verified' AND p_ibv_provider_data IS NOT NULL THEN now() 
      ELSE NULL 
    END
  )
  RETURNING id INTO v_application_id;
  
  -- Step 5: Insert references
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
  
  -- Step 6: Return result
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
    -- Rollback on any error
    RAISE EXCEPTION 'Error submitting loan application: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.submit_loan_application TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_loan_application TO service_role;

-- Add comment
COMMENT ON FUNCTION public.submit_loan_application IS 
'Atomically submits a loan application with all related data using the modular IBV system.
If any step fails, the entire transaction is rolled back.
This ensures data consistency across users, addresses, loan_applications, and references tables.
IBV data is now stored in ibv_provider_data JSONB field, supporting multiple providers (flinks, inverite, plaid, other).';

