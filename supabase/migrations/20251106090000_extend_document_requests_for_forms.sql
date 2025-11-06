-- Migration: Extend document request system to support non-document info requests
-- Adds request_kind enum, form schema column, and request_form_submissions table

-- 1) Create enum for request kinds
DO $$
BEGIN
  CREATE TYPE public.request_kind AS ENUM ('document', 'address', 'reference', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- 2) Add request_kind and form_schema columns to document_requests
ALTER TABLE public.document_requests
  ADD COLUMN IF NOT EXISTS request_kind public.request_kind NOT NULL DEFAULT 'document';

ALTER TABLE public.document_requests
  ADD COLUMN IF NOT EXISTS form_schema jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 3) Backfill existing rows to request_kind = 'document'
UPDATE public.document_requests
SET request_kind = 'document'
WHERE request_kind IS NULL;

-- 4) Create table to capture structured submissions for non-document requests
CREATE TABLE IF NOT EXISTS public.request_form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_request_id uuid NOT NULL REFERENCES public.document_requests(id) ON DELETE CASCADE,
  submitted_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5) Indexes and trigger for updated_at
CREATE INDEX IF NOT EXISTS idx_request_form_submissions_request_id ON public.request_form_submissions(document_request_id);

DO $$
BEGIN
  CREATE TRIGGER update_request_form_submissions_updated_at
  BEFORE UPDATE ON public.request_form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- 6) Enable Row Level Security for new table
ALTER TABLE public.request_form_submissions ENABLE ROW LEVEL SECURITY;

-- 7) RLS policies
-- Clients associated to the loan application may view their own submissions
DROP POLICY IF EXISTS "Clients can view their own form submissions" ON public.request_form_submissions;
CREATE POLICY "Clients can view their own form submissions"
  ON public.request_form_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.document_requests dr
      JOIN public.loan_applications la ON dr.loan_application_id = la.id
      WHERE dr.id = request_form_submissions.document_request_id
        AND la.client_id = auth.uid()
    )
  );

-- Clients can insert form submissions for their own requests
DROP POLICY IF EXISTS "Clients can insert their own form submissions" ON public.request_form_submissions;
CREATE POLICY "Clients can insert their own form submissions"
  ON public.request_form_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.document_requests dr
      JOIN public.loan_applications la ON dr.loan_application_id = la.id
      WHERE dr.id = request_form_submissions.document_request_id
        AND la.client_id = auth.uid()
    )
  );

-- Staff can manage all form submissions
DROP POLICY IF EXISTS "Staff can manage form submissions" ON public.request_form_submissions;
CREATE POLICY "Staff can manage form submissions"
  ON public.request_form_submissions
  FOR ALL
  TO authenticated
  USING (public.is_staff());

-- 8) Comments for clarity
COMMENT ON TYPE public.request_kind IS 'Describes the type of supplemental information requested from clients';
COMMENT ON COLUMN public.document_requests.request_kind IS 'Type of information requested (document, address, reference, other)';
COMMENT ON COLUMN public.document_requests.form_schema IS 'JSON schema/config describing required fields for non-document requests';
COMMENT ON TABLE public.request_form_submissions IS 'Stores structured responses when clients submit non-document information requests';
COMMENT ON COLUMN public.request_form_submissions.form_data IS 'Submitted payload matching the request form schema';


