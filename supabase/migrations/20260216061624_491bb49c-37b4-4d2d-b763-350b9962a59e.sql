-- Drop all existing avatar storage policies
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Update bucket: raise file size limit to 5MB
UPDATE storage.buckets 
SET file_size_limit = 5242880
WHERE id = 'avatars';

-- Recreate policies using (name LIKE uid || '/%') instead of foldername()
-- SELECT: anyone can view avatars (public bucket)
CREATE POLICY "Avatars are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- INSERT: authenticated users can upload to their own folder
CREATE POLICY "Users upload own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- UPDATE: authenticated users can update their own files
CREATE POLICY "Users update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- DELETE: authenticated users can delete their own files  
CREATE POLICY "Users delete own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = (auth.uid())::text
);