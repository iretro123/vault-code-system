
-- 1. Add screenshot_url column to trade_entries
ALTER TABLE public.trade_entries ADD COLUMN IF NOT EXISTS screenshot_url text DEFAULT NULL;

-- 2. Create trade-screenshots storage bucket (public reads)
INSERT INTO storage.buckets (id, name, public)
VALUES ('trade-screenshots', 'trade-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS: authenticated users can upload to their own folder
CREATE POLICY "Users can upload own trade screenshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'trade-screenshots'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. RLS: anyone can read trade screenshots (public bucket)
CREATE POLICY "Public read trade screenshots"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'trade-screenshots');

-- 5. RLS: users can delete their own screenshots
CREATE POLICY "Users can delete own trade screenshots"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'trade-screenshots'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
