-- Migration: Add employment request kind and template

-- 1) Extend request_kind enum with employment option
DO $$
BEGIN
  ALTER TYPE public.request_kind ADD VALUE IF NOT EXISTS 'employment';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

