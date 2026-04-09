

## Fix: Drag-and-Drop Images Anywhere in Chat (Discord-style)

### Root Cause
The drag-and-drop event handlers (`onDragEnter`, `onDragLeave`, `onDragOver`, `onDrop`) are currently attached only to the **composer bar div** (line 1755). This is a tiny target at the bottom of the screen. Users dragging a file over the message list area get nothing — the browser's default behavior takes over (opens the file in a new tab or ignores it).

Discord attaches the drop zone to the **entire chat container**, with a full-screen overlay that says "Upload to #channel". We need the same.

### Changes

**File: `src/components/academy/RoomChat.tsx`**

1. **Move drag handlers to the outer chat container** (line 1068, the `div` with `relative flex flex-col h-full`)
   - Add `onDragEnter`, `onDragLeave`, `onDragOver`, `onDrop` to this outer div instead of the composer div
   - Remove the same handlers from the composer div (line 1755–1760)

2. **Add a full-area drop overlay** inside the outer container (like Discord's blue overlay)
   - When `dragOver` is true, render a full-area overlay with a centered "Drop image to upload" message and an upload icon
   - Use `absolute inset-0 z-50` positioning with a semi-transparent primary background
   - The overlay should have `pointer-events-none` on its children but the parent captures the drop

3. **Remove the small composer-only drop overlay** (line 1769–1774) since the full-area one replaces it

### What this fixes
- Users can drag a file anywhere over the chat area and see the drop zone activate
- Visual feedback covers the entire chat, matching Discord's UX
- The actual upload logic (`handleUploadFile`) remains unchanged — only the event target moves up

### Files changed
| File | Change |
|------|--------|
| `src/components/academy/RoomChat.tsx` | Move drag handlers from composer to outer container, add full-area overlay |

