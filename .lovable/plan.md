

# Fix: Mobile Chat Viewport Jumping on Send

## Root Cause

`scrollIntoView({ behavior: "smooth" })` is used in three places to scroll to the latest message. On mobile, when the keyboard is open, `scrollIntoView` scrolls **all ancestor scrollable elements** — including the viewport itself. This causes the entire page to shift/jump, which is the behavior shown in the screenshot.

## Fix

Replace all `scrollIntoView` calls with `containerRef.current.scrollTop = containerRef.current.scrollHeight`, which only scrolls the **inner chat container** without touching the viewport.

### `src/components/academy/RoomChat.tsx`

Three locations to fix:

1. **Line 401** — auto-scroll on new messages:
   - `bottomRef.current?.scrollIntoView(...)` → `containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" })`

2. **Line 416** — jumpToLatest button:
   - Same replacement

3. Remove `bottomRef` div from the DOM (no longer needed) or keep it inert

### `src/components/academy/community/ThreadDrawer.tsx`

4. **Line ~88** — thread auto-scroll on new replies:
   - Replace `bottomRef.current?.scrollIntoView(...)` with scrolling the parent container element directly

| File | Change |
|---|---|
| `src/components/academy/RoomChat.tsx` | Replace 3 `scrollIntoView` calls with `containerRef.scrollTo()` |
| `src/components/academy/community/ThreadDrawer.tsx` | Replace `scrollIntoView` with container-scoped scroll |

