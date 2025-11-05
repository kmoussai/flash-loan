-- ============================================
-- Flash-Loan Database Schema - IBV System
-- Modular IBV (Instant Bank Verification) support
-- Supports multiple providers: Flinks, Inverite, Plaid, Other
-- ============================================

-- 1️⃣ Create IBV provider enum type
CREATE TYPE public.ibv_provider AS ENUM ('flinks', 'inverite', 'plaid', 'other');

-- 2️⃣ Create IBV status enum type
CREATE TYPE public.ibv_status AS ENUM ('pending', 'processing', 'verified', 'failed', 'cancelled', 'expired');

-- 3️⃣ Add IBV columns to loan_applications table
-- ibv_provider: Which provider was used
-- ibv_status: Status of verification
-- ibv_provider_data: Provider-specific data (JSONB) - stores raw provider data
-- ibv_results: Processed/summarized IBV data (JSONB) - stores aggregated results
-- ibv_verified_at: When verification was completed
ALTER TABLE public.loan_applications 
ADD COLUMN IF NOT EXISTS ibv_provider public.ibv_provider DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ibv_status public.ibv_status DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ibv_provider_data JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ibv_results JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ibv_verified_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 4️⃣ Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_loan_applications_ibv_provider 
  ON public.loan_applications(ibv_provider);

CREATE INDEX IF NOT EXISTS idx_loan_applications_ibv_status 
  ON public.loan_applications(ibv_status);

CREATE INDEX IF NOT EXISTS idx_loan_applications_ibv_provider_data 
  ON public.loan_applications USING GIN (ibv_provider_data);

CREATE INDEX IF NOT EXISTS idx_loan_applications_ibv_results 
  ON public.loan_applications USING GIN (ibv_results);

-- 5️⃣ Add comments for documentation
COMMENT ON COLUMN public.loan_applications.ibv_provider IS 
  'The IBV provider used for bank verification (flinks, inverite, plaid, other)';

COMMENT ON COLUMN public.loan_applications.ibv_status IS 
  'Status of IBV verification: pending, processing, verified, failed, cancelled, expired';

COMMENT ON COLUMN public.loan_applications.ibv_provider_data IS 
  'Provider-specific IBV data stored as JSONB. Structure varies by provider:
   - Flinks: {flinks_login_id, flinks_request_id, flinks_institution, flinks_connected_at}
   - Inverite: {session_id, applicant_id, request_guid, accounts, account_info, account_stats}
   - Plaid: {item_id, request_id, institution, access_token}
   - Other: {provider-specific fields}';

COMMENT ON COLUMN public.loan_applications.ibv_results IS 
  'Processed/summarized IBV data stored as JSONB. Contains aggregated results:
   - accounts_count: number
   - aggregates: {total_deposits, total_withdrawals, average_balance, etc.}
   - request_guid: string (for Inverite)
   - risk_score: number (calculated)';

COMMENT ON COLUMN public.loan_applications.ibv_verified_at IS 
  'Timestamp when IBV verification was successfully completed';

-- 6️⃣ Create helper function to get IBV provider field
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
  SELECT ibv_provider_data INTO v_provider_data
  FROM public.loan_applications
  WHERE id = p_application_id;

  IF v_provider_data IS NULL THEN
    RETURN NULL;
  END IF;

  v_result := v_provider_data -> p_field;
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_ibv_provider_field(UUID, TEXT) IS 
  'Extract a specific field from IBV provider data JSON (e.g., ''flinks_login_id'', ''inverite_session_id'')';

-- 7️⃣ Create function to check if application has verified IBV
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

-- 8️⃣ Create function to extract transactions from IBV provider data JSONB
-- This function extracts and flattens transactions from Inverite ibv_provider_data
CREATE OR REPLACE FUNCTION public.get_ibv_transactions(
  p_application_id UUID,
  p_limit INTEGER DEFAULT NULL
)
RETURNS TABLE (
  description TEXT,
  date TEXT,
  credit NUMERIC,
  debit NUMERIC,
  balance NUMERIC,
  category TEXT,
  flags JSONB,
  account_index INTEGER,
  account_type TEXT,
  account_description TEXT,
  account_number TEXT,
  institution TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_provider_data JSONB;
  v_provider TEXT;
  v_account JSONB;
  v_account_index INTEGER := 0;
  v_transaction JSONB;
BEGIN
  SELECT ibv_provider, ibv_provider_data
  INTO v_provider, v_provider_data
  FROM public.loan_applications
  WHERE id = p_application_id;

  IF v_provider != 'inverite' OR v_provider_data IS NULL THEN
    RETURN;
  END IF;

  -- Extract transactions from accounts array (primary path)
  IF jsonb_typeof(v_provider_data->'accounts') = 'array' THEN
    FOR v_account IN 
      SELECT * FROM jsonb_array_elements(v_provider_data->'accounts')
    LOOP
      IF jsonb_typeof(v_account->'transactions') = 'array' THEN
        FOR v_transaction IN
          SELECT * FROM jsonb_array_elements(v_account->'transactions')
        LOOP
          RETURN QUERY SELECT
            COALESCE((v_transaction->>'details'), (v_transaction->>'description'), 'No description')::TEXT AS description,
            COALESCE(v_transaction->>'date', '')::TEXT AS date,
            CASE 
              WHEN v_transaction->>'credit' IS NOT NULL AND v_transaction->>'credit' != '' 
              THEN (v_transaction->>'credit')::NUMERIC
              ELSE NULL
            END AS credit,
            CASE 
              WHEN v_transaction->>'debit' IS NOT NULL AND v_transaction->>'debit' != '' 
              THEN (v_transaction->>'debit')::NUMERIC
              ELSE NULL
            END AS debit,
            CASE 
              WHEN v_transaction->>'balance' IS NOT NULL AND v_transaction->>'balance' != '' 
              THEN (v_transaction->>'balance')::NUMERIC
              ELSE NULL
            END AS balance,
            COALESCE(v_transaction->>'category', NULL)::TEXT AS category,
            COALESCE(v_transaction->'flags', '[]'::jsonb) AS flags,
            v_account_index AS account_index,
            COALESCE(v_account->>'type', NULL)::TEXT AS account_type,
            COALESCE(v_account->>'account_description', NULL)::TEXT AS account_description,
            COALESCE(v_account->>'account', NULL)::TEXT AS account_number,
            COALESCE(v_account->>'institution', NULL)::TEXT AS institution;
        END LOOP;
      END IF;
      v_account_index := v_account_index + 1;
    END LOOP;
  -- Fallback: Check account_info.transactions
  ELSIF jsonb_typeof(v_provider_data->'account_info'->'transactions') = 'array' THEN
    FOR v_transaction IN
      SELECT * FROM jsonb_array_elements(v_provider_data->'account_info'->'transactions')
    LOOP
      RETURN QUERY SELECT
        COALESCE((v_transaction->>'details'), (v_transaction->>'description'), 'No description')::TEXT AS description,
        COALESCE(v_transaction->>'date', '')::TEXT AS date,
        CASE 
          WHEN v_transaction->>'credit' IS NOT NULL AND v_transaction->>'credit' != '' 
          THEN (v_transaction->>'credit')::NUMERIC
          ELSE NULL
        END AS credit,
        CASE 
          WHEN v_transaction->>'debit' IS NOT NULL AND v_transaction->>'debit' != '' 
          THEN (v_transaction->>'debit')::NUMERIC
          ELSE NULL
        END AS debit,
        CASE 
          WHEN v_transaction->>'balance' IS NOT NULL AND v_transaction->>'balance' != '' 
          THEN (v_transaction->>'balance')::NUMERIC
          ELSE NULL
        END AS balance,
        COALESCE(v_transaction->>'category', NULL)::TEXT AS category,
        COALESCE(v_transaction->'flags', '[]'::jsonb) AS flags,
        0 AS account_index,
        NULL::TEXT AS account_type,
        NULL::TEXT AS account_description,
        NULL::TEXT AS account_number,
        NULL::TEXT AS institution;
    END LOOP;
  -- Fallback: Legacy account_statement format
  ELSIF jsonb_typeof(v_provider_data->'account_statement') = 'array' THEN
    FOR v_transaction IN
      SELECT * FROM jsonb_array_elements(v_provider_data->'account_statement')
    LOOP
      RETURN QUERY SELECT
        COALESCE((v_transaction->>'details'), (v_transaction->>'description'), 'No description')::TEXT AS description,
        COALESCE(v_transaction->>'date', '')::TEXT AS date,
        CASE 
          WHEN v_transaction->>'credit' IS NOT NULL AND v_transaction->>'credit' != '' 
          THEN (v_transaction->>'credit')::NUMERIC
          ELSE NULL
        END AS credit,
        CASE 
          WHEN v_transaction->>'debit' IS NOT NULL AND v_transaction->>'debit' != '' 
          THEN (v_transaction->>'debit')::NUMERIC
          ELSE NULL
        END AS debit,
        CASE 
          WHEN v_transaction->>'balance' IS NOT NULL AND v_transaction->>'balance' != '' 
          THEN (v_transaction->>'balance')::NUMERIC
          ELSE NULL
        END AS balance,
        COALESCE(v_transaction->>'category', NULL)::TEXT AS category,
        COALESCE(v_transaction->'flags', '[]'::jsonb) AS flags,
        0 AS account_index,
        NULL::TEXT AS account_type,
        NULL::TEXT AS account_description,
        NULL::TEXT AS account_number,
        NULL::TEXT AS institution;
    END LOOP;
  END IF;
  
  RETURN;
END;
$$;

COMMENT ON FUNCTION public.get_ibv_transactions(UUID, INTEGER) IS 
'Extract and flatten transactions from Inverite ibv_provider_data JSONB column. 
Extracts transactions from accounts[].transactions array, with fallbacks to account_info.transactions and account_statement.
Returns transactions as a table for efficient querying without loading entire JSONB object.';

