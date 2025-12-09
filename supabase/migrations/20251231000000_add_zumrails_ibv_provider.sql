-- ============================================
-- Add Zumrails to IBV Provider Enum
-- ============================================

-- Add zumrails to the ibv_provider enum type
ALTER TYPE public.ibv_provider ADD VALUE IF NOT EXISTS 'zumrails';

-- Add comment
COMMENT ON TYPE public.ibv_provider IS 
  'IBV provider types: flinks, inverite, plaid, zumrails, other';

