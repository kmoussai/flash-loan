-- Migration: Add rent_cost column to addresses table
-- This allows storing monthly rent/mortgage cost per address

ALTER TABLE public.addresses
ADD COLUMN IF NOT EXISTS rent_cost numeric(10, 2);

COMMENT ON COLUMN public.addresses.rent_cost IS 'Monthly rent or mortgage cost for this address in CAD';

