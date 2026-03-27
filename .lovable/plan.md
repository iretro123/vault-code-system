

## Fix: Preserve Chat Scroll Position When Switching Tabs

### Problem
When users switch to a different browser tab or app tab and return, the `active` prop change and visibility handlers trigger `scrollToBottomInstant()`, resetting the scroll position. The culprit is primarily the effect on line 521-525 that fires every time `active` becomes true.

### Root Cause
Three effects fight to scroll to bottom on re-activation:
1. **Line 521-525**: `useEffect` on `[active]` — unconditionally scrolls to bottom when `active` becomes true, ignoring `userScrolledRef`
2. **Line 527-535**: `useEffect` on `[active, loading, messages.length]` — also scrolls to bottom but respects `userScrolledRef`
3. **`useSmartRefresh`** (line ref in hook): When tab becomes visible after 60s, invalidates queries → messages refetch → triggers the `[messages.length]` effect which resets scroll if `userScrolledRef` was cleared

### Fix (1 file: `RoomChat.tsx`)

**1. Remove the unconditional scroll on `[active]` (lines 521-525)**
This effect ignores user scroll state. Delete it entirely — the other effects already handle initial load.

**2. Guard the `[active, loading, messages.length]` effect (lines 527-535)**
Already has `if (userScrolledRef.current) return;` — this is correct and will handle re-activation properly once the unconditional effect is removed.

**3. Don't reset `userScrolledRef` on `active` changes**
Currently `userScrolledRef` only resets on `roomSlug` change (line 538-540) — this is correct. But the unconditional effect on `[active]` was bypassing it. Removing that effect fixes the issue.

### Summary
- Delete the `useEffect` at lines 521-525 that forces scroll-to-bottom every time `active` changes
- The remaining effects already respect `userScrolledRef`, so scroll position is preserved when switching tabs and returning

