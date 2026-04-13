

## Make Nudge Card Actionable: "Done" Confirmation + Auto-Resolve

### The Problem
Right now the nudge card has only a tiny X to dismiss and a CTA button. If a user watches a lesson, there's no way to confirm "I did this" — the nudge just sits there until they dismiss it or leave and come back. It feels broken.

### The Fix

**1. Add a "Done" / "✓" confirmation button next to the CTA**
- When tapped: dismisses the current nudge, re-runs the waterfall, and shows the **next relevant nudge** (or nothing if all clear)
- This makes the card feel alive — complete one task, the next one surfaces

**2. Auto-refresh on route return**
- When the user navigates away (e.g., to Learn page) and comes back to Dashboard, the component re-fetches fresh data and resolves the correct nudge automatically
- Uses a `visibilitychange` listener + route-based re-mount so it always reflects current state

**3. Better button layout**
- CTA button (solid accent): "Watch Lesson 1 →" — routes them to the page
- Done button (outline/ghost): "✓ Done" — marks complete, surfaces next nudge
- X dismiss stays but is secondary (just hides for the day without progressing)

### Flow Example
1. User sees: "You haven't started a lesson yet. The first one is 10 minutes." → [Watch Lesson 1] [✓ Done] [x]
2. User clicks "Watch Lesson 1" → goes to Learn page, watches it, comes back → card auto-resolves to next nudge
3. OR user clicks "✓ Done" → card re-fetches, skips lesson nudge (if lesson now completed), shows next one
4. If all clear → shows "You're on track today" or hides entirely

### File Changed

| File | Change |
|------|--------|
| `src/components/academy/dashboard/PersonalNudgeCard.tsx` | Add "Done" button, re-resolve logic on done/return, auto-refresh on visibility change |

