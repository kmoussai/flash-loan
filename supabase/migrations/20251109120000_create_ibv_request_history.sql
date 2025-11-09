-- Create table to track multiple IBV (bank verification) requests per loan application
CREATE TABLE IF NOT EXISTS public.loan_application_ibv_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_application_id uuid NOT NULL REFERENCES public.loan_applications (id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  provider public.ibv_provider NOT NULL,
  status public.ibv_status NOT NULL DEFAULT 'pending',
  request_guid text,
  request_url text,
  provider_data jsonb DEFAULT NULL,
  results jsonb DEFAULT NULL,
  error_details jsonb DEFAULT NULL,
  note text DEFAULT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_request_guid_not_empty CHECK (request_guid IS NULL OR length(trim(request_guid)) > 0),
  CONSTRAINT uq_ibv_requests_request_guid UNIQUE (request_guid)
);

-- Ensure we can efficiently look up requests by application and request GUID
CREATE INDEX IF NOT EXISTS idx_ibv_requests_application_id
  ON public.loan_application_ibv_requests (loan_application_id);

CREATE INDEX IF NOT EXISTS idx_ibv_requests_client_id
  ON public.loan_application_ibv_requests (client_id);

-- Trigger to keep updated_at current
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ibv_requests_updated_at
  ON public.loan_application_ibv_requests;

CREATE TRIGGER trg_ibv_requests_updated_at
  BEFORE UPDATE ON public.loan_application_ibv_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_timestamp();

-- Update submit_loan_application function to record IBV request history entries
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
  v_ibv_request_guid text;
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
  IF p_ibv_provider IS NOT NULL THEN
    v_ibv_request_guid := COALESCE(
      p_ibv_provider_data->>'request_guid',
      p_ibv_provider_data->>'request_GUID',
      p_ibv_provider_data->>'requestGuid'
    );

    INSERT INTO public.loan_application_ibv_requests (
      loan_application_id,
      client_id,
      provider,
      status,
      request_guid,
      provider_data,
      requested_at,
      completed_at
    )
    VALUES (
      v_application_id,
      v_client_id,
      p_ibv_provider,
      COALESCE(p_ibv_status, 'pending'::public.ibv_status),
      v_ibv_request_guid,
      p_ibv_provider_data,
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
    ON CONFLICT (request_guid)
    DO UPDATE
    SET
      status = EXCLUDED.status,
      provider_data = COALESCE(EXCLUDED.provider_data, public.loan_application_ibv_requests.provider_data),
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
'Submits a loan application with minimal quick-apply data. Supports optional address, financial, and reference details and stores IBV metadata when available.';

GRANT EXECUTE ON FUNCTION public.submit_loan_application TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_loan_application TO service_role;

