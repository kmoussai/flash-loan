-- ============================================
-- Update application_status enum to better reflect the flow
-- Add 'pre_approved' status before 'approved'
-- 'approved' should mean contract is signed and loan is created
-- ============================================

-- Drop dependent views first
DROP VIEW IF EXISTS public.loan_applications_with_flinks CASCADE;
DROP VIEW IF EXISTS public.contract_details CASCADE;

-- Create new enum type with better status names
DROP TYPE IF EXISTS public.application_status_new CASCADE;
CREATE TYPE public.application_status_new AS ENUM (
  'pending',           -- Application submitted
  'processing',        -- Being reviewed by staff
  'pre_approved',      -- Application approved, ready for contract generation
  'contract_pending',  -- Contract generated, awaiting signature
  'contract_signed',   -- Contract signed (but not yet approved/loan created)
  'approved',          -- Final state: Contract signed AND loan created
  'rejected',
  'cancelled'
);

-- Add new column with new enum type
ALTER TABLE public.loan_applications
ADD COLUMN IF NOT EXISTS application_status_new public.application_status_new;

-- Migrate existing data
-- Map old statuses to new ones
UPDATE public.loan_applications
SET application_status_new = CASE
  WHEN application_status::text = 'pending' THEN 'pending'::public.application_status_new
  WHEN application_status::text = 'processing' THEN 'processing'::public.application_status_new
  WHEN application_status::text = 'approved' THEN 'pre_approved'::public.application_status_new  -- Old 'approved' becomes 'pre_approved'
  WHEN application_status::text = 'contract_pending' THEN 'contract_pending'::public.application_status_new
  WHEN application_status::text = 'contract_signed' THEN 'contract_signed'::public.application_status_new
  WHEN application_status::text = 'rejected' THEN 'rejected'::public.application_status_new
  WHEN application_status::text = 'cancelled' THEN 'cancelled'::public.application_status_new
  ELSE 'pending'::public.application_status_new
END;

-- For applications that already have contracts signed, set to 'approved' if loan exists
UPDATE public.loan_applications la
SET application_status_new = 'approved'::public.application_status_new
WHERE la.application_status::text = 'contract_signed'
  AND EXISTS (
    SELECT 1 FROM public.loans l
    WHERE l.application_id = la.id
  );

-- Drop old column and rename new one
ALTER TABLE public.loan_applications
DROP COLUMN IF EXISTS application_status;

ALTER TABLE public.loan_applications
RENAME COLUMN application_status_new TO application_status;

-- Set NOT NULL constraint
ALTER TABLE public.loan_applications
ALTER COLUMN application_status SET NOT NULL;

-- Set default
ALTER TABLE public.loan_applications
ALTER COLUMN application_status SET DEFAULT 'pending'::public.application_status_new;

-- Drop the old enum type and rename the new one
DROP TYPE IF EXISTS public.application_status CASCADE;

ALTER TYPE public.application_status_new RENAME TO application_status;

-- Update the default
ALTER TABLE public.loan_applications
ALTER COLUMN application_status SET DEFAULT 'pending'::public.application_status;

-- Update handle_contract_signed function to set status to 'approved' when loan is created
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
      
      -- Set status to 'approved' (final state: contract signed AND loan created)
      UPDATE public.loan_applications
      SET 
        application_status = 'approved'::public.application_status,
        contract_signed_at = now()
      WHERE id = v_application_id;
    ELSE
      -- Contract signed but loan creation failed or already exists
      -- Keep status as 'contract_signed'
      UPDATE public.loan_applications
      SET 
        application_status = 'contract_signed'::public.application_status,
        contract_signed_at = now()
      WHERE id = v_application_id;
    END IF;
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

-- Update set_submitted_at function to handle new statuses
CREATE OR REPLACE FUNCTION public.set_submitted_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.application_status = 'pending' AND OLD.submitted_at IS NULL THEN
    NEW.submitted_at = now();
  END IF;
  
  IF NEW.application_status = 'pre_approved'::public.application_status AND OLD.approved_at IS NULL THEN
    NEW.approved_at = now();
  END IF;
  
  IF NEW.application_status = 'approved'::public.application_status 
     AND OLD.application_status != 'approved'::public.application_status 
     AND OLD.approved_at IS NULL THEN
    NEW.approved_at = now();
  END IF;
  
  IF NEW.application_status = 'rejected' AND OLD.rejected_at IS NULL THEN
    NEW.rejected_at = now();
  END IF;
  
  -- Set contract_generated_at when status changes to contract_pending
  IF NEW.application_status = 'contract_pending'::public.application_status 
     AND OLD.application_status != 'contract_pending'::public.application_status 
     AND NEW.contract_generated_at IS NULL THEN
    NEW.contract_generated_at = now();
  END IF;
  
  -- Set contract_signed_at when status changes to contract_signed or approved
  IF (NEW.application_status = 'contract_signed'::public.application_status 
      OR NEW.application_status = 'approved'::public.application_status)
     AND OLD.application_status NOT IN ('contract_signed'::public.application_status, 'approved'::public.application_status)
     AND NEW.contract_signed_at IS NULL THEN
    NEW.contract_signed_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate contract_details view with updated status
CREATE OR REPLACE VIEW public.contract_details AS
SELECT 
  lc.id as contract_id,
  lc.loan_application_id,
  lc.loan_id,
  lc.contract_version,
  lc.contract_status,
  lc.contract_terms,
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
  la.created_at as application_created_at
FROM public.loan_contracts lc
JOIN public.loan_applications la ON lc.loan_application_id = la.id
JOIN public.users u ON la.client_id = u.id;

-- Grant access to view
GRANT SELECT ON public.contract_details TO authenticated;

