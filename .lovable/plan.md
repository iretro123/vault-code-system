

## Fix: Show full-size images in Trade Floor chat (no cropping)

Two places where images get cropped:

### 1. Regular chat attachments (line 1102)
Currently: `max-w-[360px] max-h-[280px] object-contain` — the `max-h-[280px]` cuts tall images.
**Fix:** Remove `max-h-[280px]`, keep `max-w-[360px]` and `object-contain` so images scale naturally to full height while staying width-constrained.

### 2. Trade card chart image (line 125-132)
Currently: `w-[200px] h-full object-cover` — crops the image to fit a fixed side panel.
**Fix:** Change from a side-panel layout to a bottom image section that shows the full chart. Remove `object-cover`, use `object-contain` with `w-full` and no fixed height so the full image displays.

**File:** `src/components/academy/RoomChat.tsx` — two small edits, no logic changes.

