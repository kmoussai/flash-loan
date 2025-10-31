CREATE POLICY "Allow service role uploads"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (true);
