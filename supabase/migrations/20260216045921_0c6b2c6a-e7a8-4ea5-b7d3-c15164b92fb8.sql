
-- Create storage bucket for academy chat file attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('academy-chat-files', 'academy-chat-files', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload chat files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'academy-chat-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow anyone to view chat files (public bucket)
CREATE POLICY "Chat files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'academy-chat-files');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own chat files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'academy-chat-files' AND auth.uid()::text = (storage.foldername(name))[1]);
