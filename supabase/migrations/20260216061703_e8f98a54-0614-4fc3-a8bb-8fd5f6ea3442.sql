-- Drop existing avatar policies to avoid conflicts
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;

-- Create new policies using LIKE instead of foldername()
CREATE POLICY "avatars_read_auth"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars');

CREATE POLICY "avatars_upload_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND name LIKE (auth.uid()::text || '/%')
);

CREATE POLICY "avatars_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND name LIKE (auth.uid()::text || '/%')
)
WITH CHECK (
  bucket_id = 'avatars'
  AND name LIKE (auth.uid()::text || '/%')
);

CREATE POLICY "avatars_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND name LIKE (auth.uid()::text || '/%')
);

-- Also keep public SELECT for unauthenticated avatar display
CREATE POLICY "avatars_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');