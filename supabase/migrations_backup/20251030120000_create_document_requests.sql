-- Migration: Create document request workflow tables and seed types
-- Tables: public.document_types, public.document_requests, public.document_uploads
-- Also creates enum: public.document_request_status

-- 1) Create enum for document request status
DO $$ BEGIN
  CREATE TYPE public.document_request_status AS ENUM ('requested', 'uploaded', 'verified', 'rejected', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Create document_types table
CREATE TABLE IF NOT EXISTS public.document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  mime_whitelist jsonb NOT NULL DEFAULT '[]'::jsonb,
  max_size_bytes bigint NOT NULL DEFAULT 10485760, -- default 10MB
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_types_slug ON public.document_types(slug);

-- 3) Create document_requests table
CREATE TABLE IF NOT EXISTS public.document_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_application_id uuid NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
  document_type_id uuid NOT NULL REFERENCES public.document_types(id) ON DELETE RESTRICT,
  status public.document_request_status NOT NULL DEFAULT 'requested',
  request_token_hash text UNIQUE,
  expires_at timestamptz,
  magic_link_sent_at timestamptz,
  uploaded_file_key text,
  uploaded_meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  requested_by uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_requests_application_id ON public.document_requests(loan_application_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_status ON public.document_requests(status);
CREATE INDEX IF NOT EXISTS idx_document_requests_type ON public.document_requests(document_type_id);

-- 4) Create document_uploads table (history of uploads per request)
CREATE TABLE IF NOT EXISTS public.document_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_request_id uuid NOT NULL REFERENCES public.document_requests(id) ON DELETE CASCADE,
  file_key text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_uploads_request_id ON public.document_uploads(document_request_id);

-- 5) Reuse generic updated_at trigger for document_requests
DO $$ BEGIN
  CREATE TRIGGER update_document_requests_updated_at
  BEFORE UPDATE ON public.document_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6) Seed common document types (idempotent on slug)
INSERT INTO public.document_types (name, slug, mime_whitelist, max_size_bytes)
VALUES
  ('ID', 'id', '["image/jpeg","image/png","application/pdf"]'::jsonb, 10485760),
  ('Passport', 'passport', '["image/jpeg","image/png","application/pdf"]'::jsonb, 10485760),
  ('Proof of address', 'proof-of-address', '["image/jpeg","image/png","application/pdf"]'::jsonb, 10485760),
  ('Payslip / Payroll', 'payslip', '["image/jpeg","image/png","application/pdf"]'::jsonb, 10485760),
  ('Bank statement', 'bank-statement', '["application/pdf","image/jpeg","image/png"]'::jsonb, 20971520),
  ('Driver license', 'driver-license', '["image/jpeg","image/png","application/pdf"]'::jsonb, 10485760)
ON CONFLICT (slug) DO NOTHING;

-- Comments
COMMENT ON TABLE public.document_types IS 'Master list of acceptable document categories with MIME and size constraints';
COMMENT ON TABLE public.document_requests IS 'Requests to applicants for specific document types tied to a loan application';
COMMENT ON TABLE public.document_uploads IS 'History of uploads for each document request';
COMMENT ON COLUMN public.document_requests.request_token_hash IS 'Hashed token used to verify magic link for uploads';
COMMENT ON COLUMN public.document_requests.uploaded_file_key IS 'Latest uploaded file storage key for convenience (also tracked in document_uploads)';


