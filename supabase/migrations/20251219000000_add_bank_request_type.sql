-- Migration: Add bank request kind to enum

-- Extend request_kind enum with bank option
DO $$
BEGIN
  ALTER TYPE public.request_kind ADD VALUE IF NOT EXISTS 'bank';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

