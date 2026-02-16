-- Drop existing avatar policies
DROP POLICY IF EXISTS "avatars_read_auth" ON storage.objects;
DROP POLICY IF EXISTS "avatars_upload_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;

-- Recreate without role restriction (auth.uid() check is sufficient security)
CREATE POLICY "avatars_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid() IS NOT NULL
  AND name LIKE (auth.uid()::text || '/%')
);

CREATE POLICY "avatars_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid() IS NOT NULL
  AND name LIKE (auth.uid()::text || '/%')
)
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid() IS NOT NULL
  AND name LIKE (auth.uid()::text || '/%')
);

CREATE POLICY "avatars_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid() IS NOT NULL
  AND name LIKE (auth.uid()::text || '/%')
);