

## Add File Attachments + Luxury UI Polish for DM System

### Current State
- `dm_messages` table has NO `attachments` column — only `id, thread_id, sender_id, body, created_at, read_at`
- The existing `academy-chat-files` storage bucket (public, 15MB limit) already handles uploads in RoomChat — we can reuse the same bucket and upload pattern
- Both `InboxDrawer.tsx` (member side) and `AdminDMsTab.tsx` (admin side) need attachment support and visual upgrade

### Changes

**1. Database migration — add attachments column to dm_messages**
- `ALTER TABLE dm_messages ADD COLUMN attachments jsonb DEFAULT '[]'::jsonb;`
- Same format as `academy_messages.attachments`: `[{type, url, filename, size, mime}]`

**2. Storage — reuse existing `academy-chat-files` bucket**
- Upload path: `dm/{thread_id}/{user_id}/{timestamp}_{filename}`
- Add RLS policy for the new `dm/` prefix path (authenticated users can upload to their own folder)

**3. `src/hooks/useDirectMessages.ts` — update types + sendDmMessage**
- Add `attachments` field to `DmMessage` interface
- Update `sendDmMessage` to accept optional attachments array and include in insert

**4. `src/components/academy/InboxDrawer.tsx` — member DM thread view**
- Add file upload button (paperclip icon) next to the input bar
- Reuse the same upload logic pattern from `RoomChat.tsx` (file validation, storage upload, public URL)
- Render attachments in message bubbles (image preview for images, file link for others)
- Luxury UI polish:
  - Subtle gradient on input bar background
  - Refined bubble shadows with `shadow-[0_1px_3px_rgba(0,0,0,0.3)]`
  - Upgrade header with frosted-glass effect (`backdrop-blur-md`)
  - Better spacing, subtle divider glow
  - Attachment preview with rounded corners and hover overlay

**5. `src/components/admin/AdminDMsTab.tsx` — admin thread view**
- Same attachment upload + rendering in `ThreadConversation`
- Luxury UI polish:
  - Premium card styling with subtle border glow
  - Thread list rows with refined hover states and better typography
  - Frosted input bar
  - Image thumbnails in bubbles with lightbox support
  - Empty state with premium styling

**6. Shared `DmAttachmentRenderer` component**
- Small inline component to render image thumbnails (clickable → lightbox using existing `ImageLightbox`) and file download links inside message bubbles
- Used by both InboxDrawer and AdminDMsTab

### Technical Details
- Upload flow mirrors RoomChat: validate MIME/size → upload to storage via fetch API → get public URL → attach to message insert
- Allowed types: PNG, JPG, GIF, PDF, MP4 (same as community chat)
- Max file size: 15MB (same limit)
- Attachments stored as JSONB array: `[{type: "image"|"file", url, filename, size, mime}]`

