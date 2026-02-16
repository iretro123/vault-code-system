
-- Drop old upload policy and create one that matches room_slug/user_id/filename path
DROP POLICY IF EXISTS "Users can upload chat files" ON storage.objects;

CREATE POLICY "Users can upload chat files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'academy-chat-files'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Update delete policy too
DROP POLICY IF EXISTS "Users can delete own chat files" ON storage.objects;

CREATE POLICY "Users can delete own chat files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'academy-chat-files'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
