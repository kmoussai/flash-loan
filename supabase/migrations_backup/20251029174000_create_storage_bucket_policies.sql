-- Migration: Create Storage Bucket Policies for ID Documents
-- Description: Sets up Row Level Security policies for the id-documents storage bucket
-- 
-- IMPORTANT: This migration assumes the storage bucket "id-documents" has been created.
-- Create it manually via Supabase Dashboard or CLI:
--   supabase storage create id-documents --public false
--
-- The bucket should be private (not public) as files are accessed via signed URLs

-- Enable RLS on storage.objects (if not already enabled)
-- Note: RLS on storage.objects is typically enabled by default, but this ensures it

-- Policy 1: Clients can upload files to their own folder
-- Files are stored in format: {user_id}/{timestamp}_{random}.{ext}
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

-- Policy 3: Clients can delete their own files (only pending documents)
-- This is checked at the application level, but we allow delete for their folder
DROP POLICY IF EXISTS "Clients can delete their own files" ON storage.objects;
CREATE POLICY "Clients can delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'id-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Staff can view all files in the bucket
DROP POLICY IF EXISTS "Staff can view all files" ON storage.objects;
CREATE POLICY "Staff can view all files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'id-documents' AND
  EXISTS (
    SELECT 1 FROM public.staff
    WHERE id = auth.uid()
  )
);

-- Policy 5: Staff can delete any file in the bucket
DROP POLICY IF EXISTS "Staff can delete any file" ON storage.objects;
CREATE POLICY "Staff can delete any file"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'id-documents' AND
  EXISTS (
    SELECT 1 FROM public.staff
    WHERE id = auth.uid()
  )
);

-- Note: No UPDATE policy needed as file updates aren't supported
-- To replace a file, delete and re-upload

