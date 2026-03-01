
-- Create public storage bucket for course cover images
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-covers', 'course-covers', true);

-- Allow anyone to read files (public bucket)
CREATE POLICY "Public read access for course covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-covers');

-- Allow operators to upload/update files
CREATE POLICY "Operators can upload course covers"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'course-covers' AND has_role(auth.uid(), 'operator'::app_role));

-- Allow operators to update files
CREATE POLICY "Operators can update course covers"
ON storage.objects FOR UPDATE
USING (bucket_id = 'course-covers' AND has_role(auth.uid(), 'operator'::app_role));

-- Allow operators to delete files
CREATE POLICY "Operators can delete course covers"
ON storage.objects FOR DELETE
USING (bucket_id = 'course-covers' AND has_role(auth.uid(), 'operator'::app_role));
