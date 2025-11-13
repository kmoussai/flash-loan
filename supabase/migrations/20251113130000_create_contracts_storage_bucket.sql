-- ============================================
-- Flash-Loan Database Schema Update
-- Creates contracts storage bucket for signed contract PDFs
-- ============================================

-- 1️⃣ Create contracts storage bucket (private)
-- Note: Bucket creation via SQL is idempotent - will not error if bucket already exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', false)
ON CONFLICT (id) DO NOTHING;

-- 2️⃣ Storage bucket policies for contracts bucket

-- Policy: Service role can upload contracts (for server-side PDF generation)
DROP POLICY IF EXISTS "Service role can upload contracts" ON storage.objects;
CREATE POLICY "Service role can upload contracts"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (
  bucket_id = 'contracts'
);

-- Policy: Service role can update contract files
DROP POLICY IF EXISTS "Service role can update contract files" ON storage.objects;
CREATE POLICY "Service role can update contract files"
ON storage.objects
FOR UPDATE
TO service_role
USING (bucket_id = 'contracts')
WITH CHECK (bucket_id = 'contracts');

-- Policy: Service role can delete contract files
DROP POLICY IF EXISTS "Service role can delete contract files" ON storage.objects;
CREATE POLICY "Service role can delete contract files"
ON storage.objects
FOR DELETE
TO service_role
USING (bucket_id = 'contracts');

-- Policy: Clients can view their own signed contracts
-- Contract path format: contracts/{contract_id}/signed_{date}_{contract_id}.pdf
DROP POLICY IF EXISTS "Clients can view their own contracts" ON storage.objects;
CREATE POLICY "Clients can view their own contracts"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'contracts' AND
  EXISTS (
    SELECT 1 FROM public.loan_contracts
    JOIN public.loan_applications ON loan_applications.id = loan_contracts.loan_application_id
    WHERE loan_contracts.id::text = (storage.foldername(name))[1]
    AND loan_applications.client_id = auth.uid()
  )
);

-- Policy: Staff can view all contracts
DROP POLICY IF EXISTS "Staff can view all contracts" ON storage.objects;
CREATE POLICY "Staff can view all contracts"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'contracts' AND
  public.is_staff()
);

-- Policy: Staff can upload contract files
DROP POLICY IF EXISTS "Staff can upload contract files" ON storage.objects;
CREATE POLICY "Staff can upload contract files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'contracts' AND
  public.is_staff()
);

-- Policy: Staff can update contract files
DROP POLICY IF EXISTS "Staff can update contract files" ON storage.objects;
CREATE POLICY "Staff can update contract files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'contracts' AND
  public.is_staff()
)
WITH CHECK (
  bucket_id = 'contracts' AND
  public.is_staff()
);

-- Policy: Staff can delete contract files
DROP POLICY IF EXISTS "Staff can delete contract files" ON storage.objects;
CREATE POLICY "Staff can delete contract files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'contracts' AND
  public.is_staff()
);
