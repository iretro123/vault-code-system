

## Bug: Chat File Upload Failing

### Root Cause

The `supabase.storage.from("academy-chat-files").upload()` SDK call fails due to a known JWT injection issue in this project. Avatar uploads already solved this by using direct `fetch` with explicit `Authorization: Bearer` headers. Chat file uploads (both button and drag-drop) still use the broken SDK method.

### Fix

**File: `src/components/academy/RoomChat.tsx`**

1. Create a shared helper function `uploadChatFile(file: File, path: string)` that uses direct `fetch` to the storage API (same pattern as avatar uploads in `AcademyProfileForm.tsx`):
   - Get `accessToken` from `supabase.auth.getSession()`
   - Use `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
   - POST to `${supabaseUrl}/storage/v1/object/academy-chat-files/${path}`
   - Include `apikey`, `authorization: Bearer ${accessToken}` headers

2. Replace `supabase.storage.from("academy-chat-files").upload(path, file)` in both:
   - `handleFileUpload` (line 360-362)
   - `processDroppedFile` (line 402-404)
   
   with calls to the new `uploadChatFile` helper.

3. Keep everything else identical: validation, path generation, public URL retrieval, attachment creation, error toasts, drag-drop handlers.

No other files need changes. No database/migration changes needed.

