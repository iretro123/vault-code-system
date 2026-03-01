

## Create a Storage Bucket for Course Cover Images

The `cover_image_url` column is already in `academy_modules` — you just need a place to upload images and get URLs.

### Plan

**Step 1 — Create a `course-covers` storage bucket (public)**
A database migration will create a public storage bucket with RLS policies allowing authenticated users to read and operators to upload/manage files.

**Step 2 — Upload workflow (zero credits)**
After the bucket is created:
1. Go to **Lovable Cloud → Storage**
2. Open the `course-covers` bucket
3. Upload your cover images
4. Copy the public URL for each image
5. Go to **Database → Tables → academy_modules**
6. Paste the URL into the `cover_image_url` column for each module

No code changes needed — the UI already reads `cover_image_url` and displays it.

