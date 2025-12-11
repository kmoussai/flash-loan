-- ============================================
-- Create Payment Provider Data Table
-- 
-- This table stores payment provider-specific data for each user/provider combination.
-- Simple structure: client_id, provider, and all provider data in JSONB.
-- ============================================

-- Create payment_provider_data table
CREATE TABLE IF NOT EXISTS public.payment_provider_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider public.payment_provider NOT NULL,
  
  -- All provider-specific data stored in JSONB
  -- For Zum Rails: { userId, walletId, fundingSourceId, ... }
  -- For Accept Pay: { customerId, customerStatus, ... }
  -- For future providers: flexible structure
  provider_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Audit fields
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT unique_client_provider UNIQUE (client_id, provider)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_payment_provider_data_client_id 
  ON public.payment_provider_data(client_id);

CREATE INDEX IF NOT EXISTS idx_payment_provider_data_provider 
  ON public.payment_provider_data(provider);

CREATE INDEX IF NOT EXISTS idx_payment_provider_data_client_provider 
  ON public.payment_provider_data(client_id, provider);

-- GIN index for JSONB queries on provider_data
CREATE INDEX IF NOT EXISTS idx_payment_provider_data_provider_data_gin 
  ON public.payment_provider_data USING GIN (provider_data);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_payment_provider_data_updated_at ON public.payment_provider_data;
CREATE TRIGGER update_payment_provider_data_updated_at
  BEFORE UPDATE ON public.payment_provider_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.payment_provider_data ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admin/Staff only (payment provider data is internal infrastructure)
DROP POLICY IF EXISTS "Staff can view payment provider data" ON public.payment_provider_data;
CREATE POLICY "Staff can view payment provider data"
  ON public.payment_provider_data
  FOR SELECT
  USING (public.is_staff());

DROP POLICY IF EXISTS "Staff can insert payment provider data" ON public.payment_provider_data;
CREATE POLICY "Staff can insert payment provider data"
  ON public.payment_provider_data
  FOR INSERT
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Staff can update payment provider data" ON public.payment_provider_data;
CREATE POLICY "Staff can update payment provider data"
  ON public.payment_provider_data
  FOR UPDATE
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "Staff can delete payment provider data" ON public.payment_provider_data;
CREATE POLICY "Staff can delete payment provider data"
  ON public.payment_provider_data
  FOR DELETE
  USING (public.is_staff());

-- Add comments for documentation
COMMENT ON TABLE public.payment_provider_data IS
'Stores payment provider-specific data for each user/provider combination. Allows storing provider IDs (userId, walletId, fundingSourceId, etc.) and metadata without cluttering the users table. Supports multiple providers per user.';

COMMENT ON COLUMN public.payment_provider_data.client_id IS
'Foreign key to users table. Links provider data to a specific client/user.';

COMMENT ON COLUMN public.payment_provider_data.provider IS
'Payment provider identifier (e.g., zumrails, accept_pay).';

COMMENT ON COLUMN public.payment_provider_data.provider_data IS
'JSONB field storing all provider-specific data. Structure varies by provider:
- Zum Rails: { userId, walletId, fundingSourceId, ... }
- Accept Pay: { customerId, customerStatus, ... }
- Future providers: flexible structure';

COMMENT ON POLICY "Staff can view payment provider data" ON public.payment_provider_data IS
'Allows staff members (admin, support, intern) to view payment provider data. Uses is_staff() function to verify staff status.';

COMMENT ON POLICY "Staff can insert payment provider data" ON public.payment_provider_data IS
'Allows staff members to create payment provider data records. Typically used when setting up provider accounts for users.';

COMMENT ON POLICY "Staff can update payment provider data" ON public.payment_provider_data IS
'Allows staff members to update payment provider data. Used for updating provider IDs, metadata, or status.';

COMMENT ON POLICY "Staff can delete payment provider data" ON public.payment_provider_data IS
'Allows staff members to delete payment provider data. Typically used for cleanup or when provider account is removed.';
