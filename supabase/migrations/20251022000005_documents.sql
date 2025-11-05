-- ============================================
-- Flash-Loan Database Schema - Documents System
-- ID documents, document requests, and storage policies
-- ============================================

-- 1️⃣ Create ENUMS for documents
DROP TYPE IF EXISTS public.document_type CASCADE;
CREATE TYPE public.document_type AS ENUM (
  'drivers_license',
  'passport',
  'health_card',
  'social_insurance',
  'permanent_resident_card',
  'citizenship_card',
  'birth_certificate',
  'other'
);

DROP TYPE IF EXISTS public.document_status CASCADE;
CREATE TYPE public.document_status AS ENUM (
  'pending',
  'under_review',
  'approved',
  'rejected',
  'expired'
);

DROP TYPE IF EXISTS public.document_request_status CASCADE;
CREATE TYPE public.document_request_status AS ENUM ('requested', 'uploaded', 'verified', 'rejected', 'expired');

-- 2️⃣ Create id_documents table
CREATE TABLE IF NOT EXISTS public.id_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  document_type public.document_type NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL, -- Path in Supabase Storage
  file_name VARCHAR(255) NOT NULL, -- Original filename
  file_size BIGINT NOT NULL, -- File size in bytes
  mime_type VARCHAR(100) NOT NULL, -- e.g., 'image/jpeg', 'image/png', 'application/pdf'
  status public.document_status DEFAULT 'pending',
  rejection_reason TEXT,
  verified_by UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  expires_at DATE, -- If document has expiration date
  notes TEXT, -- Admin notes
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT id_documents_client_id_check CHECK (client_id IS NOT NULL),
  CONSTRAINT id_documents_file_path_check CHECK (file_path IS NOT NULL AND file_path != ''),
  CONSTRAINT id_documents_file_size_check CHECK (file_size > 0 AND file_size <= 10485760) -- Max 10MB
);

-- 3️⃣ Create document_types table
CREATE TABLE IF NOT EXISTS public.document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  mime_whitelist jsonb NOT NULL DEFAULT '[]'::jsonb,
  max_size_bytes bigint NOT NULL DEFAULT 10485760, -- default 10MB
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4️⃣ Create document_request_groups table
CREATE TABLE IF NOT EXISTS public.document_request_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_application_id uuid NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
  expires_at timestamptz NULL,
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5️⃣ Create document_requests table
CREATE TABLE IF NOT EXISTS public.document_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_application_id uuid NOT NULL REFERENCES public.loan_applications(id) ON DELETE CASCADE,
  document_type_id uuid NOT NULL REFERENCES public.document_types(id) ON DELETE RESTRICT,
  group_id uuid REFERENCES public.document_request_groups(id) ON DELETE SET NULL,
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

-- 6️⃣ Create document_uploads table (history of uploads per request)
CREATE TABLE IF NOT EXISTS public.document_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_request_id uuid NOT NULL REFERENCES public.document_requests(id) ON DELETE CASCADE,
  file_key text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

-- 7️⃣ Create indexes
CREATE INDEX IF NOT EXISTS idx_id_documents_client_id ON public.id_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_id_documents_status ON public.id_documents(status);
CREATE INDEX IF NOT EXISTS idx_id_documents_document_type ON public.id_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_id_documents_created_at ON public.id_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_types_slug ON public.document_types(slug);
CREATE INDEX IF NOT EXISTS idx_document_requests_application_id ON public.document_requests(loan_application_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_status ON public.document_requests(status);
CREATE INDEX IF NOT EXISTS idx_document_requests_type ON public.document_requests(document_type_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_group_id ON public.document_requests(group_id);
CREATE INDEX IF NOT EXISTS idx_document_uploads_request_id ON public.document_uploads(document_request_id);

-- 8️⃣ Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_id_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_id_documents_updated_at ON public.id_documents;
CREATE TRIGGER trigger_update_id_documents_updated_at
  BEFORE UPDATE ON public.id_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_id_documents_updated_at();

DROP TRIGGER IF EXISTS update_document_requests_updated_at ON public.document_requests;
CREATE TRIGGER update_document_requests_updated_at
  BEFORE UPDATE ON public.document_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_document_request_groups_updated_at ON public.document_request_groups;
CREATE TRIGGER update_document_request_groups_updated_at
  BEFORE UPDATE ON public.document_request_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 9️⃣ Seed common document types (idempotent on slug)
INSERT INTO public.document_types (name, slug, mime_whitelist, max_size_bytes)
VALUES
  ('ID', 'id', '["image/jpeg","image/png","application/pdf"]'::jsonb, 10485760),
  ('Passport', 'passport', '["image/jpeg","image/png","application/pdf"]'::jsonb, 10485760),
  ('Proof of address', 'proof-of-address', '["image/jpeg","image/png","application/pdf"]'::jsonb, 10485760),
  ('Payslip / Payroll', 'payslip', '["image/jpeg","image/png","application/pdf"]'::jsonb, 10485760),
  ('Bank statement', 'bank-statement', '["application/pdf","image/jpeg","image/png"]'::jsonb, 20971520),
  ('Driver license', 'driver-license', '["image/jpeg","image/png","application/pdf"]'::jsonb, 10485760)
ON CONFLICT (slug) DO NOTHING;

-- 🔟 Enable Row Level Security
ALTER TABLE public.id_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_request_groups ENABLE ROW LEVEL SECURITY;

-- 1️⃣1️⃣ RLS Policies for id_documents
DROP POLICY IF EXISTS "Clients can view their own ID documents" ON public.id_documents;
CREATE POLICY "Clients can view their own ID documents"
  ON public.id_documents
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM public.users 
      WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Clients can insert their own ID documents" ON public.id_documents;
CREATE POLICY "Clients can insert their own ID documents"
  ON public.id_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id IN (
      SELECT id FROM public.users 
      WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Clients can update their own pending ID documents" ON public.id_documents;
CREATE POLICY "Clients can update their own pending ID documents"
  ON public.id_documents
  FOR UPDATE
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM public.users 
      WHERE id = auth.uid()
    )
    AND status = 'pending'
  );

DROP POLICY IF EXISTS "Clients can delete their own pending ID documents" ON public.id_documents;
CREATE POLICY "Clients can delete their own pending ID documents"
  ON public.id_documents
  FOR DELETE
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM public.users 
      WHERE id = auth.uid()
    )
    AND status = 'pending'
  );

DROP POLICY IF EXISTS "Staff can view all ID documents" ON public.id_documents;
CREATE POLICY "Staff can view all ID documents"
  ON public.id_documents
  FOR SELECT
  TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS "Staff can update ID document status" ON public.id_documents;
CREATE POLICY "Staff can update ID document status"
  ON public.id_documents
  FOR UPDATE
  TO authenticated
  USING (public.is_staff());

-- 1️⃣2️⃣ RLS Policies for document_types (public read)
DROP POLICY IF EXISTS "Anyone can view document types" ON public.document_types;
CREATE POLICY "Anyone can view document types"
  ON public.document_types
  FOR SELECT
  TO authenticated
  USING (true);

-- 1️⃣3️⃣ RLS Policies for document_requests
DROP POLICY IF EXISTS "Clients can view their own document requests" ON public.document_requests;
CREATE POLICY "Clients can view their own document requests"
  ON public.document_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.loan_applications
      WHERE loan_applications.id = document_requests.loan_application_id
      AND loan_applications.client_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff can manage document requests" ON public.document_requests;
CREATE POLICY "Staff can manage document requests"
  ON public.document_requests
  FOR ALL
  TO authenticated
  USING (public.is_staff());

-- 1️⃣4️⃣ RLS Policies for document_uploads
DROP POLICY IF EXISTS "Clients can view their own document uploads" ON public.document_uploads;
CREATE POLICY "Clients can view their own document uploads"
  ON public.document_uploads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.document_requests dr
      JOIN public.loan_applications la ON dr.loan_application_id = la.id
      WHERE dr.id = document_uploads.document_request_id
      AND la.client_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff can view all document uploads" ON public.document_uploads;
CREATE POLICY "Staff can view all document uploads"
  ON public.document_uploads
  FOR SELECT
  TO authenticated
  USING (public.is_staff());

-- 1️⃣5️⃣ Storage bucket policies for id-documents bucket
-- Policy 1: Clients can upload files to their own folder
DROP POLICY IF EXISTS "Clients can upload files to their folder" ON storage.objects;
CREATE POLICY "Clients can upload files to their folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'id-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Clients can view their own files
DROP POLICY IF EXISTS "Clients can view their own files" ON storage.objects;
CREATE POLICY "Clients can view their own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'id-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Clients can delete their own files
DROP POLICY IF EXISTS "Clients can delete their own files" ON storage.objects;
CREATE POLICY "Clients can delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'id-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Staff can view all files
DROP POLICY IF EXISTS "Staff can view all files" ON storage.objects;
CREATE POLICY "Staff can view all files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'id-documents' AND
  public.is_staff()
);

-- Policy 5: Staff can delete any file
DROP POLICY IF EXISTS "Staff can delete any file" ON storage.objects;
CREATE POLICY "Staff can delete any file"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'id-documents' AND
  public.is_staff()
);

-- Policy 6: Service role can upload
DROP POLICY IF EXISTS "Allow service role uploads" ON storage.objects;
CREATE POLICY "Allow service role uploads"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (true);

-- 1️⃣6️⃣ Storage bucket policies for documents bucket
-- Create bucket if not exists (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload into their own folder: documents/{user_id}/{request_id}/...
DROP POLICY IF EXISTS "Users can upload their own docs" ON storage.objects;
CREATE POLICY "Users can upload their own docs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to list/view their own files
DROP POLICY IF EXISTS "Users can view their own docs" ON storage.objects;
CREATE POLICY "Users can view their own docs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own files
DROP POLICY IF EXISTS "Users can delete their own docs" ON storage.objects;
CREATE POLICY "Users can delete their own docs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow staff to view all files
DROP POLICY IF EXISTS "Staff can view all docs" ON storage.objects;
CREATE POLICY "Staff can view all docs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  public.is_staff()
);

-- Allow staff to delete any file
DROP POLICY IF EXISTS "Staff can delete any docs" ON storage.objects;
CREATE POLICY "Staff can delete any docs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  public.is_staff()
);

-- 1️⃣7️⃣ Comments for documentation
COMMENT ON TABLE public.id_documents IS 'Stores identification documents uploaded by clients for KYC verification';
COMMENT ON COLUMN public.id_documents.file_path IS 'Path to file in Supabase Storage bucket (id-documents)';
COMMENT ON COLUMN public.id_documents.status IS 'Verification status of the document';
COMMENT ON COLUMN public.id_documents.expires_at IS 'Expiration date of the document if applicable';
COMMENT ON TABLE public.document_types IS 'Master list of acceptable document categories with MIME and size constraints';
COMMENT ON TABLE public.document_requests IS 'Requests to applicants for specific document types tied to a loan application';
COMMENT ON TABLE public.document_uploads IS 'History of uploads for each document request';
COMMENT ON COLUMN public.document_requests.request_token_hash IS 'Hashed token used to verify magic link for uploads';
COMMENT ON COLUMN public.document_requests.uploaded_file_key IS 'Latest uploaded file storage key for convenience (also tracked in document_uploads)';

