-- ============================================
-- Flash-Loan Database Schema - Loan Contracts System
-- Adds contract management and updates application status to reflect contract steps
-- ============================================

-- 1️⃣ Update application_status enum to include contract-related statuses
-- Drop existing enum and recreate with new values
-- Note: This requires dropping dependent objects temporarily

-- First, create new enum type with all statuses
DROP TYPE IF EXISTS public.application_status_new CASCADE;
CREATE TYPE public.application_status_new AS ENUM (
  'pending',
  'processing',
  'approved',
  'contract_pending',      -- Contract generated, awaiting signature
  'contract_signed',       -- Contract signed by client
  'rejected',
  'cancelled'
);

-- 2️⃣ Create loan_contracts table
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

-- 3️⃣ Add contract-related timestamps to loan_applications
ALTER TABLE public.loan_applications
ADD COLUMN IF NOT EXISTS contract_generated_at timestamptz,
ADD COLUMN IF NOT EXISTS contract_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS contract_signed_at timestamptz;

-- 4️⃣ Drop dependent views before modifying application_status enum
-- Drop the loan_applications_with_flinks view (no longer needed)
DROP VIEW IF EXISTS public.loan_applications_with_flinks CASCADE;

-- 5️⃣ Migrate existing application_status to new enum
-- Step 1: Add new column with new enum type
ALTER TABLE public.loan_applications
ADD COLUMN IF NOT EXISTS application_status_new public.application_status_new;

-- Step 2: Migrate data (map old statuses to new)
UPDATE public.loan_applications
SET application_status_new = CASE
  WHEN application_status::text = 'pending' THEN 'pending'::public.application_status_new
  WHEN application_status::text = 'processing' THEN 'processing'::public.application_status_new
  WHEN application_status::text = 'approved' THEN 'approved'::public.application_status_new
  WHEN application_status::text = 'rejected' THEN 'rejected'::public.application_status_new
  WHEN application_status::text = 'cancelled' THEN 'cancelled'::public.application_status_new
  ELSE 'pending'::public.application_status_new
END;

-- Step 3: Drop old column and rename new one
ALTER TABLE public.loan_applications
DROP COLUMN IF EXISTS application_status;

ALTER TABLE public.loan_applications
RENAME COLUMN application_status_new TO application_status;

-- Step 4: Set NOT NULL constraint
ALTER TABLE public.loan_applications
ALTER COLUMN application_status SET NOT NULL;

-- Step 5: Set default
ALTER TABLE public.loan_applications
ALTER COLUMN application_status SET DEFAULT 'pending'::public.application_status_new;

-- Step 6: Drop the old enum type and rename the new one
-- First, drop the old enum type (safe now since column was dropped and recreated)
DROP TYPE IF EXISTS public.application_status CASCADE;

-- Rename the new enum type to the original name
ALTER TYPE public.application_status_new RENAME TO application_status;

-- Update the default to use the renamed enum type
ALTER TABLE public.loan_applications
ALTER COLUMN application_status SET DEFAULT 'pending'::public.application_status;

-- 6️⃣ Create indexes for loan_contracts
CREATE INDEX IF NOT EXISTS idx_loan_contracts_application_id ON public.loan_contracts(loan_application_id);
CREATE INDEX IF NOT EXISTS idx_loan_contracts_loan_id ON public.loan_contracts(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_contracts_status ON public.loan_contracts(contract_status);
CREATE INDEX IF NOT EXISTS idx_loan_contracts_sent_at ON public.loan_contracts(sent_at);
CREATE INDEX IF NOT EXISTS idx_loan_contracts_expires_at ON public.loan_contracts(expires_at);

-- 7️⃣ Create function to automatically update application status when contract is signed
CREATE OR REPLACE FUNCTION public.handle_contract_signed()
RETURNS TRIGGER AS $$
BEGIN
  -- When contract is signed, update loan_application status and timestamp
  IF NEW.contract_status = 'signed' AND OLD.contract_status != 'signed' THEN
    UPDATE public.loan_applications
    SET 
      application_status = 'contract_signed'::public.application_status_new,
      contract_signed_at = now()
    WHERE id = NEW.loan_application_id;
  END IF;
  
  -- When contract is generated, update application status
  IF NEW.contract_status = 'generated' AND OLD.contract_status != 'generated' THEN
    UPDATE public.loan_applications
    SET 
      application_status = 'contract_pending'::public.application_status_new,
      contract_generated_at = now()
    WHERE id = NEW.loan_application_id;
  END IF;
  
  -- When contract is sent, update application timestamp
  IF NEW.sent_at IS NOT NULL AND OLD.sent_at IS NULL THEN
    UPDATE public.loan_applications
    SET contract_sent_at = now()
    WHERE id = NEW.loan_application_id;
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

-- 9️⃣ Create function to update updated_at
CREATE OR REPLACE FUNCTION public.update_contract_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 🔟 Create trigger for updated_at
DROP TRIGGER IF EXISTS update_contracts_updated_at ON public.loan_contracts;
CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.loan_contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_contract_updated_at();

-- 1️⃣1️⃣ Update the existing set_submitted_at function to handle new statuses
CREATE OR REPLACE FUNCTION public.set_submitted_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.application_status = 'pending' AND OLD.submitted_at IS NULL THEN
    NEW.submitted_at = now();
  END IF;
  
  IF NEW.application_status = 'approved' AND OLD.approved_at IS NULL THEN
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
  
  -- Set contract_signed_at when status changes to contract_signed
  IF NEW.application_status = 'contract_signed'::public.application_status 
     AND OLD.application_status != 'contract_signed'::public.application_status 
     AND NEW.contract_signed_at IS NULL THEN
    NEW.contract_signed_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1️⃣2️⃣ Enable Row Level Security
ALTER TABLE public.loan_contracts ENABLE ROW LEVEL SECURITY;

-- 1️⃣3️⃣ Create RLS policies for loan_contracts
-- Clients can view their own contracts
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

-- Staff can view all contracts
CREATE POLICY "Staff can view all contracts"
  ON public.loan_contracts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.id = auth.uid()
    )
  );

-- Staff can insert contracts
CREATE POLICY "Staff can insert contracts"
  ON public.loan_contracts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.id = auth.uid()
    )
  );

-- Staff can update contracts
CREATE POLICY "Staff can update contracts"
  ON public.loan_contracts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.staff
      WHERE staff.id = auth.uid()
    )
  );

-- Clients can update their own contracts (for signature)
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

-- 1️⃣4️⃣ Add comments for documentation
COMMENT ON TABLE public.loan_contracts IS 
'Stores loan contracts associated with loan applications. Tracks contract generation, delivery, and signature status.';

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

-- 1️⃣5️⃣ Create view for contracts with application details
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

