-- ============================================
-- Refactor loan_application_ibv_requests to use JSONB-only storage
-- This migration consolidates all IBV request refactoring into one file
-- ============================================
-- 
-- Changes:
-- 1. Remove request_guid text column (provider-specific)
-- 2. Store all provider identifiers in provider_data JSONB
-- 3. Clean up duplicates
-- 4. Add proper unique constraints
-- 5. Update database functions
--
-- Provider identifier storage:
-- - Inverite: provider_data.request_guid
-- - Zumrails: provider_data.customerId
-- - Flinks: provider_data.flinks_request_id
-- - Plaid: provider_data.item_id
-- - Other: provider_data.request_id or provider_data.id

-- Step 1: Drop old constraints that might conflict
ALTER TABLE public.loan_application_ibv_requests 
DROP CONSTRAINT IF EXISTS uq_ibv_requests_request_guid,
DROP CONSTRAINT IF EXISTS uq_ibv_requests_provider_request_guid,
DROP CONSTRAINT IF EXISTS uq_ibv_requests_application_provider;

-- Step 2: Migrate existing request_guid values to provider_data JSONB FIRST
-- This preserves data before we clean up duplicates
-- This preserves existing data when removing the text column
UPDATE public.loan_application_ibv_requests
SET provider_data = COALESCE(provider_data, '{}'::jsonb) || 
  CASE 
    WHEN provider = 'inverite' AND request_guid IS NOT NULL THEN
      jsonb_build_object('request_guid', request_guid)
    WHEN provider = 'zumrails' AND request_guid IS NOT NULL THEN
      jsonb_build_object('customerId', request_guid)
    WHEN provider = 'flinks' AND request_guid IS NOT NULL THEN
      jsonb_build_object('flinks_request_id', request_guid)
    WHEN provider = 'plaid' AND request_guid IS NOT NULL THEN
      jsonb_build_object('item_id', request_guid)
    WHEN request_guid IS NOT NULL THEN
      jsonb_build_object('request_id', request_guid)
    ELSE
      '{}'::jsonb
  END
WHERE request_guid IS NOT NULL 
  AND (
    -- Only update if the identifier is not already in provider_data
    (provider = 'inverite' AND (provider_data->>'request_guid' IS NULL))
    OR (provider = 'zumrails' AND (provider_data->>'customerId' IS NULL))
    OR (provider = 'flinks' AND (provider_data->>'flinks_request_id' IS NULL))
    OR (provider = 'plaid' AND (provider_data->>'item_id' IS NULL))
    OR (provider NOT IN ('inverite', 'zumrails', 'flinks', 'plaid') 
        AND (provider_data->>'request_id' IS NULL))
  );

-- Step 3: Clean up duplicate rows AFTER migrating data
-- Keep the most recent row for each (loan_application_id, provider) combination
DELETE FROM public.loan_application_ibv_requests
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY loan_application_id, provider 
        ORDER BY requested_at DESC, created_at DESC
      ) as rn
    FROM public.loan_application_ibv_requests
  ) ranked
  WHERE rn > 1
);

-- Step 4: Remove the request_guid text column (data already migrated to provider_data)
ALTER TABLE public.loan_application_ibv_requests 
DROP COLUMN IF EXISTS request_guid;

-- Step 5: Add unique constraint on (loan_application_id, provider)
-- This ensures only one IBV request per provider per loan application
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'uq_ibv_requests_application_provider'
  ) THEN
    ALTER TABLE public.loan_application_ibv_requests
    ADD CONSTRAINT uq_ibv_requests_application_provider 
    UNIQUE (loan_application_id, provider);
  END IF;
END $$;

-- Step 6: Create index on provider_data for efficient JSONB queries
CREATE INDEX IF NOT EXISTS idx_ibv_requests_provider_data_gin 
  ON public.loan_application_ibv_requests USING GIN (provider_data);

-- Step 7: Create helper function to extract provider-specific identifier
CREATE OR REPLACE FUNCTION public.get_ibv_request_identifier(
  p_provider_data JSONB,
  p_provider public.ibv_provider
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE p_provider
    WHEN 'inverite' THEN
      RETURN COALESCE(
        p_provider_data->>'request_guid',
        p_provider_data->>'request_GUID',
        p_provider_data->>'requestGuid'
      );
    WHEN 'zumrails' THEN
      RETURN p_provider_data->>'customerId';
    WHEN 'flinks' THEN
      RETURN COALESCE(
        p_provider_data->>'flinks_request_id',
        p_provider_data->>'request_id'
      );
    WHEN 'plaid' THEN
      RETURN COALESCE(
        p_provider_data->>'item_id',
        p_provider_data->>'request_id'
      );
    ELSE
      RETURN COALESCE(
        p_provider_data->>'request_guid',
        p_provider_data->>'request_id',
        p_provider_data->>'id'
      );
  END CASE;
END;
$$;

COMMENT ON FUNCTION public.get_ibv_request_identifier(JSONB, public.ibv_provider) IS
'Extracts the provider-specific identifier from provider_data JSONB based on provider type.
- Inverite: request_guid, request_GUID, requestGuid
- Zumrails: customerId
- Flinks: flinks_request_id, request_id
- Plaid: item_id, request_id
- Other: request_guid, request_id, id';

-- Step 8: Drop all existing overloads of submit_loan_application to avoid conflicts
-- We'll create a single version with all optional parameters
DROP FUNCTION IF EXISTS public.submit_loan_application CASCADE;

-- Step 9: Create submit_loan_application function with updated signature
CREATE OR REPLACE FUNCTION public.submit_loan_application(
  -- Core applicant information
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_date_of_birth date,
  p_preferred_language text,
  p_loan_amount numeric, -- Required parameter - must come before optional parameters

  -- Minimal loan preferences (optional with defaults)
  p_province text DEFAULT NULL,
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
  v_effective_income_fields jsonb := COALESCE(p_income_fields, '{}'::jsonb);
  v_effective_references jsonb := COALESCE(p_references, '[]'::jsonb);
  v_result jsonb;
BEGIN
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
    v_effective_income_fields,
    'pending',
    COALESCE(p_bankruptcy_plan, false),
    now(),
    p_ibv_provider,
    p_ibv_status,
    p_ibv_provider_data,
    CASE WHEN p_ibv_status = 'verified' AND p_ibv_provider_data IS NOT NULL THEN now() ELSE NULL END
  )
  RETURNING id INTO v_application_id;

  -- Step 4: Record IBV request history when provided
  -- All provider-specific identifiers are now stored in provider_data JSONB
  IF p_ibv_provider IS NOT NULL AND p_ibv_provider_data IS NOT NULL THEN
    -- Insert or update IBV request
    -- Use ON CONFLICT on (loan_application_id, provider) to update if exists
    INSERT INTO public.loan_application_ibv_requests (
      loan_application_id,
      client_id,
      provider,
      status,
      provider_data,
      request_url,
      requested_at,
      completed_at
    )
    VALUES (
      v_application_id,
      v_client_id,
      p_ibv_provider,
      COALESCE(p_ibv_status, 'pending'::public.ibv_status),
      p_ibv_provider_data,
      COALESCE(
        (p_ibv_provider_data->>'iframe_url'),
        (p_ibv_provider_data->>'start_url'),
        (p_ibv_provider_data->>'request_url')
      ),
      now(),
      CASE
        WHEN p_ibv_status IN (
          'verified'::public.ibv_status,
          'failed'::public.ibv_status,
          'cancelled'::public.ibv_status,
          'expired'::public.ibv_status
        ) THEN now()
        ELSE NULL
      END
    )
    ON CONFLICT (loan_application_id, provider)
    DO UPDATE
    SET
      provider_data = COALESCE(EXCLUDED.provider_data, public.loan_application_ibv_requests.provider_data),
      status = EXCLUDED.status,
      request_url = COALESCE(
        EXCLUDED.request_url, 
        public.loan_application_ibv_requests.request_url
      ),
      completed_at = CASE
        WHEN EXCLUDED.status IN (
          'verified'::public.ibv_status,
          'failed'::public.ibv_status,
          'cancelled'::public.ibv_status,
          'expired'::public.ibv_status
        ) THEN now()
        ELSE public.loan_application_ibv_requests.completed_at
      END,
      updated_at = now();
  END IF;

  -- Step 5: Insert references when provided
  IF v_effective_references IS NOT NULL
     AND jsonb_typeof(v_effective_references) = 'array'
     AND jsonb_array_length(v_effective_references) > 0 THEN
    FOR v_reference IN SELECT * FROM jsonb_array_elements(v_effective_references)
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

  -- Step 6: Return outcome payload
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
'Submits a loan application with minimal quick-apply data. Supports optional address, financial, and reference details and stores IBV metadata when available. All provider-specific identifiers are stored in provider_data JSONB.';

GRANT EXECUTE ON FUNCTION public.submit_loan_application TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_loan_application TO service_role;
