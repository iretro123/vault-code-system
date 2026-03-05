

## Plan: Compact the Chat Feed Area

Reduce the visual density inside the chat message area only — smaller text, tighter spacing, smaller avatars, and capped image previews — so messages are cleaner and more visible on desktop. The top bar, tabs, and right cockpit panel stay untouched.

### Changes: `src/components/academy/RoomChat.tsx`

All changes are inside the message feed rendering (lines ~930–1130). Nothing outside the chat area is touched.

1. **Avatars**: Reduce from `w-11 h-11` → `w-9 h-9` for group headers, and adjust the avatar column width from `w-11` → `w-9`

2. **Username text**: Reduce from `text-[14px]` → `text-[13px]`

3. **Message body text**: Reduce from `text-[14px]` → `text-[13px]` in the bubble `<p>` tag

4. **Message row padding**: Reduce horizontal padding from `px-6` → `px-4`, and top padding on new groups from `pt-2.5` → `pt-2`

5. **Message gap**: Reduce flex gap from `gap-4` → `gap-3`

6. **Inline image previews**: Cap `max-h` from `400px` → `280px` and add `max-w-[360px]` so images don't dominate the feed — users can still click to open the full lightbox

7. **Grouped message spacing**: Tighten from `mt-3` → `mt-2` between new groups

### Files Modified
- `src/components/academy/RoomChat.tsx` — adjust sizing/spacing classes in the message feed only

