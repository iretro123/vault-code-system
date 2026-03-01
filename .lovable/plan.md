

## Add Cover Images to Module Cards

### Current State
- The `academy_modules` table has no image column
- All module cards use the same default image (`course-cover-default.jpg`)

### Plan

**Step 1 — Database: Add `cover_image_url` column**
Add a nullable text column to `academy_modules` so each module can have its own cover image.

```sql
ALTER TABLE academy_modules ADD COLUMN cover_image_url text;
```

**Step 2 — Code: Use `cover_image_url` in the card**
In `AcademyLearn.tsx`, update the `<img>` tag to use `mod.cover_image_url || courseCoverDefault` as the `src`, so it falls back to the default when no image is set.

**Step 3 — You add images (zero credits)**
After this is deployed, go to **Lovable Cloud → Database → Tables → academy_modules**. For each module row, paste an image URL into the `cover_image_url` column. You can use any hosted image URL (e.g. from Imgur, Unsplash, or upload to a storage bucket first).

### Result
- Each module card shows its own unique cover image
- No credits burned to update images — just edit the database table directly
- Cards without a URL still show the default cover

