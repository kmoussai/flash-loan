-- ============================================
-- Atomic Loan Application Submission Function
-- This function handles the entire loan application process as a single transaction
-- If any step fails, all changes are rolled back
-- ============================================

-- Verify prerequisites exist
DO $$
BEGIN
  -- Check if required types exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loan_type') THEN
    RAISE EXCEPTION 'Type loan_type does not exist. Run migration 20251022120000 first.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'income_source_type') THEN
    RAISE EXCEPTION 'Type income_source_type does not exist. Run migration 20251022120000 first.';
  END IF;
  
  -- Check if required tables exist
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    RAISE EXCEPTION 'Table users does not exist. Run migration 20251022120000 first.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'addresses') THEN
    RAISE EXCEPTION 'Table addresses does not exist. Run migration 20251022120000 first.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'loan_applications') THEN
    RAISE EXCEPTION 'Table loan_applications does not exist. Run migration 20251022120000 first.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'references') THEN
    RAISE EXCEPTION 'Table references does not exist. Run migration 20251022120000 first.';
  END IF;
END $$;

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
  p_furniture_loan numeric DEFAULT NULL
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
  
  -- Step 2: Update/Insert client profile
  INSERT INTO public.users (
    id,
    first_name,
    last_name,
    email,
    phone,
    date_of_birth,
    preferred_language,
    residence_status,
    gross_salary,
    rent_or_mortgage_cost,
    heating_electricity_cost,
    car_loan,
    furniture_loan
  ) VALUES (
    v_client_id,
    p_first_name,
    p_last_name,
    p_email,
    p_phone,
    p_date_of_birth,
    p_preferred_language,
    p_residence_status,
    p_gross_salary,
    p_rent_or_mortgage_cost,
    p_heating_electricity_cost,
    p_car_loan,
    p_furniture_loan
  )
  ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    date_of_birth = EXCLUDED.date_of_birth,
    preferred_language = EXCLUDED.preferred_language,
    residence_status = EXCLUDED.residence_status,
    gross_salary = EXCLUDED.gross_salary,
    rent_or_mortgage_cost = EXCLUDED.rent_or_mortgage_cost,
    heating_electricity_cost = EXCLUDED.heating_electricity_cost,
    car_loan = EXCLUDED.car_loan,
    furniture_loan = EXCLUDED.furniture_loan,
    updated_at = now();
  
  -- Step 3: Create address
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
    p_apartment_number,
    p_city,
    p_province,
    p_postal_code,
    p_moving_date,
    true
  )
  RETURNING id INTO v_address_id;
  
  -- Step 4: Update user's current_address_id
  UPDATE public.users
  SET current_address_id = v_address_id
  WHERE id = v_client_id;
  
  -- Step 5: Create loan application
  INSERT INTO public.loan_applications (
    client_id,
    address_id,
    loan_amount,
    loan_type,
    income_source,
    income_fields,
    application_status,
    bankruptcy_plan,
    submitted_at
  ) VALUES (
    v_client_id,
    v_address_id,
    p_loan_amount,
    p_loan_type,
    p_income_source,
    p_income_fields,
    'pending',
    p_bankruptcy_plan,
    now()
  )
  RETURNING id INTO v_application_id;
  
  -- Step 6: Create references
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
  
  -- Step 7: Build result
  v_result := jsonb_build_object(
    'success', true,
    'client_id', v_client_id,
    'address_id', v_address_id,
    'application_id', v_application_id,
    'is_previous_borrower', v_is_previous_borrower
  );
  
  -- If we get here, all operations succeeded
  -- Transaction will be committed automatically
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Any error will cause automatic rollback
    RAISE EXCEPTION 'Loan application submission failed: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.submit_loan_application TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_loan_application TO service_role;

-- Add comment
COMMENT ON FUNCTION public.submit_loan_application IS 
'Atomically submits a loan application with all related data. 
If any step fails, the entire transaction is rolled back.
This ensures data consistency across users, addresses, loan_applications, and references tables.';

