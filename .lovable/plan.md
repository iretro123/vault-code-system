

## Fix: Scroll Captured by Outer Layout Instead of Chat

### Root Cause
`AcademyLayout` line 133: `<main className="flex-1 overflow-y-auto pb-20 md:pb-6">` makes the outer container scrollable. When you scroll inside the community page, the browser scrolls the `<main>` element (moving the entire panel + tabs) instead of the inner chat `div` with `overflow-y-auto`.

### Fix
The community page already sets `h-[calc(100vh-4rem)] overflow-hidden` on its root — it's designed to fill the viewport and manage its own scroll. The problem is the parent `<main>` also scrolls.

**Edit `src/pages/academy/AcademyCommunity.tsx`**
- Add `overflow-hidden` to the outermost wrapper so the AcademyLayout main's scroll has nothing to scroll (content fits exactly). Change the root div to use `h-full` instead of `h-[calc(100vh-4rem)]` since the parent main is already flex-1.

Specifically:
- Line 33: Change `h-[calc(100vh-4rem)] overflow-hidden` → `h-full overflow-hidden` so it fills the available main area exactly without exceeding it, preventing the outer main from having scrollable overflow.

This is a single className tweak — the inner chat's `overflow-y-auto` already handles message scrolling correctly once the outer container stops competing.

