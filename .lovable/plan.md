

## Fix: Mentions invisible on own (blue) message bubbles

### Problem
The `renderMentions` function at line 177 always uses `text-primary` (blue) and `bg-primary/10` (blue tint) for @mention highlights. When the message is the user's own bubble, the bubble is already blue — so mentions become blue-on-blue and invisible (as shown in the screenshot with `@rz6959`).

### Fix

**File: `src/components/academy/RoomChat.tsx`**

1. Update `renderMentions` to accept an `isOwnBubble` parameter
2. When `isOwnBubble` is true, use `text-white font-semibold bg-white/20 rounded px-0.5` instead of the blue styling
3. Update all call sites of `renderMentions` inside `renderPlainBody` to pass through the `isOwnBubble` flag

This is a ~10 line change across the `renderMentions` function and its 2-3 call sites within `renderPlainBody`.

