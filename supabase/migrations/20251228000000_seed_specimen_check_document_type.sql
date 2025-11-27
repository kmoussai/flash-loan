-- Migration: Seed specimen check document type
-- This document type is automatically requested when bank information is requested

INSERT INTO public.document_types (
  name,
  slug,
  mime_whitelist,
  max_size_bytes,
  default_request_kind,
  default_form_schema,
  description
)
VALUES (
  'Specimen Check',
  'specimen_check',
  '["image/jpeg", "image/png", "image/jpg", "application/pdf"]'::jsonb,
  10485760, -- 10MB
  'document',
  '{}'::jsonb,
  'A void cheque or bank statement showing account details for verification.'
)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  mime_whitelist = EXCLUDED.mime_whitelist,
  max_size_bytes = EXCLUDED.max_size_bytes,
  description = EXCLUDED.description;

