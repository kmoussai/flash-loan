-- ============================================
-- Create loan automatically when contract is signed
-- ============================================

-- Update the handle_contract_signed function to also create a loan record
CREATE OR REPLACE FUNCTION public.handle_contract_signed()
RETURNS TRIGGER AS $$
DECLARE
  v_application_id uuid;
  v_client_id uuid;
  v_loan_amount numeric;
  v_interest_rate numeric;
  v_contract_terms jsonb;
  v_loan_id uuid;
BEGIN
  v_application_id := NEW.loan_application_id;
  
  -- When contract is signed, create loan record and update application status
  IF NEW.contract_status = 'signed' AND OLD.contract_status != 'signed' THEN
    -- Get application details
    SELECT 
      la.client_id,
      la.loan_amount,
      COALESCE(la.interest_rate, 29.0),
      lc.contract_terms
    INTO 
      v_client_id,
      v_loan_amount,
      v_interest_rate,
      v_contract_terms
    FROM public.loan_applications la
    JOIN public.loan_contracts lc ON lc.loan_application_id = la.id
    WHERE la.id = v_application_id
      AND lc.id = NEW.id;
    
    -- Create loan record if it doesn't exist
    INSERT INTO public.loans (
      application_id,
      user_id,
      principal_amount,
      interest_rate,
      term_months,
      remaining_balance,
      status
    )
    SELECT 
      v_application_id,
      v_client_id,
      v_loan_amount,
      v_interest_rate,
      (v_contract_terms->>'term_months')::integer,
      (v_contract_terms->>'total_amount')::numeric,
      'pending_disbursement'::public.loan_status
    WHERE NOT EXISTS (
      SELECT 1 FROM public.loans 
      WHERE application_id = v_application_id
    )
    RETURNING id INTO v_loan_id;
    
    -- Update contract with loan_id if loan was created
    IF v_loan_id IS NOT NULL THEN
      UPDATE public.loan_contracts
      SET loan_id = v_loan_id
      WHERE id = NEW.id;
    END IF;
    
    -- Update loan_application status and timestamp
    UPDATE public.loan_applications
    SET 
      application_status = 'contract_signed'::public.application_status,
      contract_signed_at = now()
    WHERE id = v_application_id;
  END IF;
  
  -- When contract is generated, update application status
  IF NEW.contract_status = 'generated' AND OLD.contract_status != 'generated' THEN
    UPDATE public.loan_applications
    SET 
      application_status = 'contract_pending'::public.application_status,
      contract_generated_at = now()
    WHERE id = v_application_id;
  END IF;
  
  -- When contract is sent, update application timestamp
  IF NEW.sent_at IS NOT NULL AND OLD.sent_at IS NULL THEN
    UPDATE public.loan_applications
    SET contract_sent_at = now()
    WHERE id = v_application_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

