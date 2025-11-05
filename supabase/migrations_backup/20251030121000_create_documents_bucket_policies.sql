-- Migration: Create Storage Bucket and Policies for document requests uploads
-- Bucket: documents (private)

-- 1) Create bucket if not exists (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- 2) Policies on storage.objects for 'documents' bucket

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

-- Allow authenticated users to delete their own files (app enforces business rules)
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
  EXISTS (SELECT 1 FROM public.staff WHERE id = auth.uid())
);

-- Allow staff to delete any file
DROP POLICY IF EXISTS "Staff can delete any docs" ON storage.objects;
CREATE POLICY "Staff can delete any docs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (SELECT 1 FROM public.staff WHERE id = auth.uid())
);

-- Note: No UPDATE policy; replace by delete + upload


