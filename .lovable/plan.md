

## Fix Horizontal Scroll on Mobile in Community Chat

### Root Cause
Multiple elements in `RoomChat.tsx` use fixed pixel `max-w` values that exceed mobile viewport width (~375px), causing horizontal overflow:

1. **Attached images**: `max-w-[520px]` on `<img>` and filename `<span>` (line 1100-1102)
2. **Trade cards**: `max-w-[560px]` on trade card and recap card containers (lines 106, 161)
3. **Inline markdown images**: `max-w-[300px]` on rendered inline images (line 198)
4. **Trade card image column**: fixed `w-[200px]` shrink-0 (line 125)
5. **Main message scroll container** (line 759): no `overflow-x-hidden`, so any wide child causes page-level horizontal scroll

### Fix (single file: `src/components/academy/RoomChat.tsx`)

1. **Main scroll container** (line 759): Add `overflow-x-hidden` so horizontal overflow is clipped
2. **Attached images** (line 1100): Change `max-w-[520px]` → `max-w-full` (both the img and filename span)
3. **Trade card** (line 106): Change `max-w-[560px]` → `max-w-full`
4. **Recap card** (line 161): Change `max-w-[560px]` → `max-w-full`
5. **Inline markdown images** (line 198): Change `max-w-[300px]` → `max-w-[min(300px,100%)]` or just `max-w-full`
6. **Trade card image column** (line 125): Add `hidden sm:block` so the side image stacks or hides on mobile, preventing forced width

These are all className string changes — no logic changes needed.

