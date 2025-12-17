-- ============================================
-- Create App Configurations Table
-- 
-- This table stores application-wide configuration settings,
-- particularly for payment providers like ZumRails.
-- Sensitive fields (API keys, passwords) are encrypted using pgcrypto.
-- ============================================

-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create app_configurations table
CREATE TABLE IF NOT EXISTS public.app_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Configuration category (e.g., 'payment_provider', 'email', 'general')
  category text NOT NULL,
  
  -- Configuration key (e.g., 'zumrails', 'accept_pay')
  config_key text NOT NULL,
  
  -- Configuration data stored as JSONB
  -- For ZumRails: { apiBaseUrl, customerId, walletId, fundingSourceId, ... }
  -- Sensitive fields (username, password, apiKey) are encrypted
  config_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Encrypted sensitive fields (stored separately for security)
  -- These are encrypted using pgcrypto with a key from environment
  encrypted_username bytea,
  encrypted_password bytea,
  encrypted_api_key bytea,
  
  -- Metadata
  description text,
  is_active boolean DEFAULT true,
  
  -- Audit fields
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.staff(id),
  updated_by uuid REFERENCES public.staff(id),
  
  -- Constraints
  CONSTRAINT unique_category_key UNIQUE (category, config_key)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_app_configurations_category 
  ON public.app_configurations(category);

CREATE INDEX IF NOT EXISTS idx_app_configurations_key 
  ON public.app_configurations(config_key);

CREATE INDEX IF NOT EXISTS idx_app_configurations_category_key 
  ON public.app_configurations(category, config_key);

CREATE INDEX IF NOT EXISTS idx_app_configurations_active 
  ON public.app_configurations(is_active) WHERE is_active = true;

-- GIN index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_app_configurations_config_data_gin 
  ON public.app_configurations USING GIN (config_data);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_app_configurations_updated_at ON public.app_configurations;
CREATE TRIGGER update_app_configurations_updated_at
  BEFORE UPDATE ON public.app_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.app_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admin only (configurations are sensitive)
DROP POLICY IF EXISTS "Admin can view app configurations" ON public.app_configurations;
CREATE POLICY "Admin can view app configurations"
  ON public.app_configurations
  FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admin can insert app configurations" ON public.app_configurations;
CREATE POLICY "Admin can insert app configurations"
  ON public.app_configurations
  FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin can update app configurations" ON public.app_configurations;
CREATE POLICY "Admin can update app configurations"
  ON public.app_configurations
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin can delete app configurations" ON public.app_configurations;
CREATE POLICY "Admin can delete app configurations"
  ON public.app_configurations
  FOR DELETE
  USING (public.is_admin());

-- Helper function to encrypt sensitive data
-- Uses a secret key from environment variable (set via Supabase dashboard)
-- Note: In production, set the encryption key via Supabase dashboard: Settings > Database > Custom Config > app.encryption_key
CREATE OR REPLACE FUNCTION public.encrypt_config_value(value text)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encryption_key text;
BEGIN
  -- Try to get encryption key from custom config (set in Supabase dashboard)
  BEGIN
    encryption_key := current_setting('app.encryption_key', true);
  EXCEPTION WHEN OTHERS THEN
    encryption_key := NULL;
  END;
  
  -- Fallback: Use environment variable or default (for development only)
  IF encryption_key IS NULL OR encryption_key = '' THEN
    -- In production, you should set this via Supabase dashboard
    -- For development, you can use a fixed key (CHANGE IN PRODUCTION!)
    encryption_key := COALESCE(
      current_setting('app.encryption_key', false),
      'dev-key-change-in-production-min-32-chars!!'
    );
  END IF;
  
  -- Encrypt the value
  RETURN pgp_sym_encrypt(value, encryption_key);
END;
$$;

-- Helper function to decrypt sensitive data
CREATE OR REPLACE FUNCTION public.decrypt_config_value(encrypted_value bytea)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encryption_key text;
BEGIN
  -- Try to get encryption key from custom config
  BEGIN
    encryption_key := current_setting('app.encryption_key', true);
  EXCEPTION WHEN OTHERS THEN
    encryption_key := NULL;
  END;
  
  -- Fallback: Use environment variable or default (for development only)
  IF encryption_key IS NULL OR encryption_key = '' THEN
    encryption_key := COALESCE(
      current_setting('app.encryption_key', false),
      'dev-key-change-in-production-min-32-chars!!'
    );
  END IF;
  
  -- Decrypt the value
  RETURN pgp_sym_decrypt(encrypted_value, encryption_key);
EXCEPTION
  WHEN OTHERS THEN
    -- Return null if decryption fails
    RETURN NULL;
END;
$$;

-- Add comments
COMMENT ON TABLE public.app_configurations IS
'Stores application-wide configuration settings. Sensitive fields (username, password, API keys) are encrypted using pgcrypto.';

COMMENT ON COLUMN public.app_configurations.category IS
'Configuration category (e.g., payment_provider, email, general).';

COMMENT ON COLUMN public.app_configurations.config_key IS
'Unique configuration key within category (e.g., zumrails, accept_pay).';

COMMENT ON COLUMN public.app_configurations.config_data IS
'JSONB field storing non-sensitive configuration data (URLs, IDs, etc.).';

COMMENT ON COLUMN public.app_configurations.encrypted_username IS
'Encrypted username field using pgcrypto.';

COMMENT ON COLUMN public.app_configurations.encrypted_password IS
'Encrypted password field using pgcrypto.';

COMMENT ON COLUMN public.app_configurations.encrypted_api_key IS
'Encrypted API key field using pgcrypto.';

COMMENT ON FUNCTION public.encrypt_config_value IS
'Encrypts a text value using pgcrypto. Uses app.encryption_key setting.';

COMMENT ON FUNCTION public.decrypt_config_value IS
'Decrypts an encrypted bytea value using pgcrypto. Returns NULL if decryption fails.';

