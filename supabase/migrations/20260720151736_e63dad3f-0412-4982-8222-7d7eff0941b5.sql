DROP POLICY IF EXISTS "Anyone authenticated can read toolkit files" ON storage.objects;
CREATE POLICY "Authenticated users can read toolkit files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'toolkit-files');