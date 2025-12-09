-- Update get_ibv_transactions function to support Zumrails provider
-- Zumrails stores data in: ibv_provider_data->'account_info'->'Card'->'Accounts'[]->'Transactions'[]

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
  v_card JSONB;
BEGIN
  SELECT ibv_provider, ibv_provider_data
  INTO v_provider, v_provider_data
  FROM public.loan_applications
  WHERE id = p_application_id;

  IF v_provider_data IS NULL THEN
    RETURN;
  END IF;

  -- Handle Zumrails provider
  IF v_provider = 'zumrails' THEN
    -- Extract Card from account_info
    -- The fetchedData is stored as: account_info = { RequestId, CustomerId, Card: {...} }
    -- So path is: account_info.Card
    v_card := v_provider_data->'account_info'->'Card';
    
    -- Fallback: If account_info contains result wrapper (full API response stored)
    IF v_card IS NULL OR jsonb_typeof(v_card) = 'null' THEN
      v_card := v_provider_data->'account_info'->'result'->'Card';
    END IF;
    
    -- Fallback: Direct Card access (if stored at root level)
    IF v_card IS NULL OR jsonb_typeof(v_card) = 'null' THEN
      v_card := v_provider_data->'Card';
    END IF;
    
    IF v_card IS NOT NULL AND jsonb_typeof(v_card->'Accounts') = 'array' THEN
      FOR v_account IN 
        SELECT * FROM jsonb_array_elements(v_card->'Accounts')
      LOOP
        IF jsonb_typeof(v_account->'Transactions') = 'array' THEN
          FOR v_transaction IN
            SELECT * FROM jsonb_array_elements(v_account->'Transactions')
          LOOP
            RETURN QUERY SELECT
              COALESCE(v_transaction->>'Description', 'No description')::TEXT AS description,
              COALESCE(v_transaction->>'Date', '')::TEXT AS date,
              CASE 
                WHEN v_transaction->>'Credit' IS NOT NULL AND v_transaction->>'Credit' != '' 
                THEN (v_transaction->>'Credit')::NUMERIC
                ELSE NULL
              END AS credit,
              CASE 
                WHEN v_transaction->>'Debit' IS NOT NULL AND v_transaction->>'Debit' != '' 
                THEN (v_transaction->>'Debit')::NUMERIC
                ELSE NULL
              END AS debit,
              CASE 
                WHEN v_transaction->>'Balance' IS NOT NULL AND v_transaction->>'Balance' != '' 
                THEN (v_transaction->>'Balance')::NUMERIC
                ELSE NULL
              END AS balance,
              COALESCE((v_transaction->'Category'->>'Name'), NULL)::TEXT AS category,
              '[]'::jsonb AS flags, -- Zumrails doesn't have flags
              v_account_index AS account_index,
              COALESCE(v_account->>'AccountCategory', v_account->>'AccountSubCategory', NULL)::TEXT AS account_type,
              COALESCE(v_account->>'Title', NULL)::TEXT AS account_description,
              COALESCE(v_account->>'AccountNumber', NULL)::TEXT AS account_number,
              COALESCE(v_card->>'InstitutionName', NULL)::TEXT AS institution;
          END LOOP;
        END IF;
        v_account_index := v_account_index + 1;
      END LOOP;
    END IF;
    
    RETURN;
  END IF;

  -- Handle Inverite provider (existing logic)
  IF v_provider != 'inverite' THEN
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
'Extract and flatten transactions from IBV provider data JSONB column.
Supports both Inverite and Zumrails providers:
- Inverite: Extracts from accounts[].transactions array, with fallbacks to account_info.transactions and account_statement.
- Zumrails: Extracts from account_info.Card.Accounts[].Transactions[] array.
Returns transactions as a table for efficient querying without loading entire JSONB object.';

