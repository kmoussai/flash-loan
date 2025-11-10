-- ============================================
-- Flash-Loan Database Schema Update
-- Adds sequential contract_number to loan_contracts
-- ============================================

CREATE SEQUENCE IF NOT EXISTS public.loan_contract_number_seq
  START WITH 100000
  INCREMENT BY 1;

-- 2️⃣ Add contract_number column with default and uniqueness constraint
ALTER TABLE public.loan_contracts
  ADD COLUMN IF NOT EXISTS contract_number integer
    NOT NULL
    DEFAULT nextval('public.loan_contract_number_seq');

ALTER SEQUENCE public.loan_contract_number_seq
  OWNED BY public.loan_contracts.contract_number;
ALTER TABLE public.loan_contracts
  ADD CONSTRAINT loan_contracts_contract_number_unique UNIQUE (contract_number);

-- Ensure existing rows receive a contract number (idempotent for re-runs)
WITH numbered_contracts AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY created_at, id) - 1 AS rn
  FROM public.loan_contracts
  WHERE contract_number IS NULL
)
UPDATE public.loan_contracts lc
SET contract_number = nextval('public.loan_contract_number_seq')
FROM numbered_contracts nc
WHERE lc.id = nc.id;

DROP VIEW IF EXISTS public.contract_details;

-- 3️⃣ Update contract details view to expose contract_number
CREATE OR REPLACE VIEW public.contract_details AS
SELECT 
  lc.id AS contract_id,
  lc.contract_number,
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
  la.created_at AS application_created_at
FROM public.loan_contracts lc
JOIN public.loan_applications la ON lc.loan_application_id = la.id
JOIN public.users u ON la.client_id = u.id;

-- 4️⃣ Comment for clarity
COMMENT ON COLUMN public.loan_contracts.contract_number IS
'Sequential unique contract number assigned automatically for each contract';

