-- ============================================
-- Flash-Loan Database Schema - Contracts and Loans
-- Creates loan contracts, loans, and payments tables
-- ============================================

-- 1️⃣ Create ENUMS for loans and contracts
DROP TYPE IF EXISTS public.loan_status CASCADE;
CREATE TYPE public.loan_status AS ENUM (
  'pending_disbursement',
  'active',
  'completed',
  'defaulted',
  'cancelled'
);

DROP TYPE IF EXISTS public.payment_status CASCADE;
CREATE TYPE public.payment_status AS ENUM (
  'pending',
  'confirmed',
  'failed'
);

-- 2️⃣ Create loans table
CREATE TABLE IF NOT EXISTS public.loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  principal_amount numeric(12,2) NOT NULL,
  interest_rate numeric(5,2) NOT NULL,
  term_months integer NOT NULL,
  disbursement_date date,
  due_date date,
  remaining_balance numeric(12,2) DEFAULT 0,
  status public.loan_status DEFAULT 'pending_disbursement',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3️⃣ Create loan_payments table
CREATE TABLE IF NOT EXISTS public.loan_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  payment_date timestamptz DEFAULT now(),
  method text,
  status public.payment_status DEFAULT 'confirmed',
  created_at timestamptz DEFAULT now()
);

-- 4️⃣ Create loan_contracts table
CREATE TABLE IF NOT EXISTS public.loan_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_application_id uuid NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
  loan_id uuid REFERENCES public.loans(id) ON DELETE SET NULL,
  
  -- Contract generation
  contract_version integer DEFAULT 1,
  contract_terms jsonb NOT NULL,  -- Stores contract details: interest_rate, term_months, fees, etc.
  contract_document_path text,    -- Path to PDF/document in storage if storing files
  
  -- Contract lifecycle
  contract_status text DEFAULT 'draft' CHECK (contract_status IN ('draft', 'generated', 'sent', 'pending_signature', 'signed', 'rejected', 'expired')),
  
  -- Signature tracking
  client_signed_at timestamptz,
  client_signature_data jsonb,    -- E-signature data: IP address, user agent, signature method, etc.
  staff_signed_at timestamptz,     -- If staff signature required
  staff_signature_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  
  -- Contract delivery
  sent_at timestamptz,
  sent_method text,               -- 'email', 'sms', 'portal', etc.
  expires_at timestamptz,         -- Contract expiration date
  
  -- Metadata
  created_by uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  notes text
);

-- 5️⃣ Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_loans_application_id ON public.loans(application_id);
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON public.loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON public.loans(status);
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON public.loan_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_status ON public.loan_payments(status);
CREATE INDEX IF NOT EXISTS idx_loan_payments_payment_date ON public.loan_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_loan_contracts_application_id ON public.loan_contracts(loan_application_id);
CREATE INDEX IF NOT EXISTS idx_loan_contracts_loan_id ON public.loan_contracts(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_contracts_status ON public.loan_contracts(contract_status);
CREATE INDEX IF NOT EXISTS idx_loan_contracts_sent_at ON public.loan_contracts(sent_at);
CREATE INDEX IF NOT EXISTS idx_loan_contracts_expires_at ON public.loan_contracts(expires_at);

-- 6️⃣ Create triggers for updated_at
DROP TRIGGER IF EXISTS update_loans_updated_at ON public.loans;
CREATE TRIGGER update_loans_updated_at
  BEFORE UPDATE ON public.loans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.update_contract_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_contracts_updated_at ON public.loan_contracts;
CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.loan_contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_contract_updated_at();

-- 7️⃣ Create function to automatically update application status when contract is signed
-- Final version: Creates loan when contract is signed and sets status to 'approved'
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

-- 8️⃣ Create trigger for contract status changes
DROP TRIGGER IF EXISTS track_contract_status_changes ON public.loan_contracts;
CREATE TRIGGER track_contract_status_changes
  AFTER UPDATE ON public.loan_contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_contract_signed();

-- 9️⃣ Enable Row Level Security
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_contracts ENABLE ROW LEVEL SECURITY;

-- 🔟 Create RLS policies for loans
DROP POLICY IF EXISTS "Users can view their own loans" ON public.loans;
CREATE POLICY "Users can view their own loans"
  ON public.loans
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Staff can view all loans" ON public.loans;
CREATE POLICY "Staff can view all loans"
  ON public.loans
  FOR SELECT
  USING (public.is_staff());

-- 1️⃣1️⃣ Create RLS policies for loan_payments
DROP POLICY IF EXISTS "Users can view their own loan payments" ON public.loan_payments;
CREATE POLICY "Users can view their own loan payments"
  ON public.loan_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.loans
      WHERE loans.id = loan_payments.loan_id
      AND loans.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff can view all loan payments" ON public.loan_payments;
CREATE POLICY "Staff can view all loan payments"
  ON public.loan_payments
  FOR SELECT
  USING (public.is_staff());

-- 1️⃣2️⃣ Create RLS policies for loan_contracts
DROP POLICY IF EXISTS "Clients can view their own contracts" ON public.loan_contracts;
CREATE POLICY "Clients can view their own contracts"
  ON public.loan_contracts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.loan_applications
      WHERE loan_applications.id = loan_contracts.loan_application_id
      AND loan_applications.client_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff can view all contracts" ON public.loan_contracts;
CREATE POLICY "Staff can view all contracts"
  ON public.loan_contracts
  FOR SELECT
  USING (public.is_staff());

DROP POLICY IF EXISTS "Staff can insert contracts" ON public.loan_contracts;
CREATE POLICY "Staff can insert contracts"
  ON public.loan_contracts
  FOR INSERT
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Staff can update contracts" ON public.loan_contracts;
CREATE POLICY "Staff can update contracts"
  ON public.loan_contracts
  FOR UPDATE
  USING (public.is_staff());

DROP POLICY IF EXISTS "Clients can sign their own contracts" ON public.loan_contracts;
CREATE POLICY "Clients can sign their own contracts"
  ON public.loan_contracts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.loan_applications
      WHERE loan_applications.id = loan_contracts.loan_application_id
      AND loan_applications.client_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.loan_applications
      WHERE loan_applications.id = loan_contracts.loan_application_id
      AND loan_applications.client_id = auth.uid()
    )
  );

-- 1️⃣3️⃣ Create view for contracts with application details
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

-- 1️⃣4️⃣ Add comments for documentation
COMMENT ON TABLE public.loans IS 'Stores active loans created from approved loan applications';
COMMENT ON TABLE public.loan_payments IS 'Tracks payments made against loans';
COMMENT ON TABLE public.loan_contracts IS 'Stores loan contracts associated with loan applications. Tracks contract generation, delivery, and signature status.';
COMMENT ON COLUMN public.loan_contracts.contract_terms IS 
'JSONB field storing contract terms: {
  "interest_rate": number,
  "term_months": number,
  "principal_amount": number,
  "total_amount": number,
  "fees": {
    "origination_fee": number,
    "processing_fee": number,
    "other_fees": number
  },
  "payment_schedule": [...],
  "terms_and_conditions": text,
  "effective_date": timestamp,
  "maturity_date": timestamp
}';
COMMENT ON COLUMN public.loan_contracts.client_signature_data IS 
'JSONB field storing e-signature metadata: {
  "signature_method": "click_to_sign" | "drawn_signature" | "uploaded",
  "ip_address": string,
  "user_agent": string,
  "signed_from_device": string,
  "signature_timestamp": timestamp,
  "signature_hash": string (if storing signature verification hash)
}';

