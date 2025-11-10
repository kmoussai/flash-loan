-- ============================================
-- Flash-Loan Database Schema Update
-- Adds bank account metadata to loan contracts
-- ============================================

-- 1️⃣ Add bank_account JSONB column
ALTER TABLE public.loan_contracts
  ADD COLUMN IF NOT EXISTS bank_account jsonb;

DROP VIEW IF EXISTS public.contract_details;

-- 2️⃣ Update contract details view to expose bank account info
CREATE OR REPLACE VIEW public.contract_details AS
SELECT 
  lc.id AS contract_id,
  lc.contract_number,
  lc.loan_application_id,
  lc.loan_id,
  lc.contract_version,
  lc.contract_status,
  lc.contract_terms,
  lc.bank_account,
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
  la.created_at AS application_created_at
FROM public.loan_contracts lc
JOIN public.loan_applications la ON lc.loan_application_id = la.id
JOIN public.users u ON la.client_id = u.id;

-- 3️⃣ Comment describing bank account payload
COMMENT ON COLUMN public.loan_contracts.bank_account IS
'Optional JSON payload containing borrower bank account metadata (bank_name, account_number, transit_number, institution_number, account_name, account_holder).';

