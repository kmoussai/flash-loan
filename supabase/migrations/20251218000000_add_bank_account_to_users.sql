-- ============================================
-- Add bank_account JSONB column to users table
-- ============================================

-- Add bank_account column to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS bank_account jsonb;

-- Add comment describing bank account payload
COMMENT ON COLUMN public.users.bank_account IS
'JSON payload containing client bank account metadata (bank_name, account_number, transit_number, institution_number, account_name). Populated from IBV results when available.';

-- Create index for bank_account queries (useful for finding users with/without bank accounts)
CREATE INDEX IF NOT EXISTS idx_users_bank_account ON public.users USING gin (bank_account);

-- Add check constraint to ensure bank_account has required fields if present
ALTER TABLE public.users
ADD CONSTRAINT check_bank_account_fields 
CHECK (
  bank_account IS NULL OR (
    bank_account ? 'bank_name' AND
    bank_account ? 'account_number' AND
    bank_account ? 'transit_number' AND
    bank_account ? 'institution_number'
  )
);

