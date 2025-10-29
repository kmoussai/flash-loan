-- Migration: Create ID Documents Table
-- Description: Allows clients to upload identification documents (driver's license, passport, health card, etc.)

-- Create enum for document types
CREATE TYPE document_type AS ENUM (
  'drivers_license',
  'passport',
  'health_card',
  'social_insurance',
  'permanent_resident_card',
  'citizenship_card',
  'birth_certificate',
  'other'
);

-- Create enum for document verification status
CREATE TYPE document_status AS ENUM (
  'pending',
  'under_review',
  'approved',
  'rejected',
  'expired'
);

-- Create id_documents table
CREATE TABLE IF NOT EXISTS public.id_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  document_type document_type NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL, -- Path in Supabase Storage
  file_name VARCHAR(255) NOT NULL, -- Original filename
  file_size BIGINT NOT NULL, -- File size in bytes
  mime_type VARCHAR(100) NOT NULL, -- e.g., 'image/jpeg', 'image/png', 'application/pdf'
  status document_status DEFAULT 'pending',
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

-- Create index on client_id for fast lookups
CREATE INDEX idx_id_documents_client_id ON public.id_documents(client_id);

-- Create index on status for filtering
CREATE INDEX idx_id_documents_status ON public.id_documents(status);

-- Create index on document_type for filtering
CREATE INDEX idx_id_documents_document_type ON public.id_documents(document_type);

-- Create index on created_at for sorting
CREATE INDEX idx_id_documents_created_at ON public.id_documents(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.id_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Clients can view their own documents
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

-- RLS Policy: Clients can insert their own documents
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

-- RLS Policy: Clients can update their own pending documents
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

-- RLS Policy: Clients can delete their own pending documents
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

-- RLS Policy: Staff can view all documents
CREATE POLICY "Staff can view all ID documents"
  ON public.id_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff 
      WHERE id = auth.uid()
    )
  );

-- RLS Policy: Staff can update document status
CREATE POLICY "Staff can update ID document status"
  ON public.id_documents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff 
      WHERE id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_id_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER trigger_update_id_documents_updated_at
  BEFORE UPDATE ON public.id_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_id_documents_updated_at();

-- Add comment to table
COMMENT ON TABLE public.id_documents IS 'Stores identification documents uploaded by clients for KYC verification';
COMMENT ON COLUMN public.id_documents.file_path IS 'Path to file in Supabase Storage bucket (id-documents)';
COMMENT ON COLUMN public.id_documents.status IS 'Verification status of the document';
COMMENT ON COLUMN public.id_documents.expires_at IS 'Expiration date of the document if applicable';

