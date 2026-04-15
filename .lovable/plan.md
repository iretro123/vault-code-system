

## Fix PersonalNudgeCard Mobile Layout

### The Problem
On mobile (390px), the card uses a single horizontal row: accent bar → icon → text → CTA button → Done button → X. The buttons take ~200px, leaving only ~120px for the message text, causing it to wrap into a tall, narrow column.

### The Fix

**File: `src/components/academy/dashboard/PersonalNudgeCard.tsx`**

Switch to a **stacked layout on mobile**:
- **Top row:** Icon + message text (full width, no competition from buttons)
- **Bottom row:** CTA button + Done + X aligned right

On desktop (`md:` breakpoint), keep the current single-row layout.

Changes to the JSX (lines 129–170):
1. Change the inner container from `flex items-center` to `flex flex-col md:flex-row md:items-center`
2. Top section: icon + text in a `flex items-start gap-3` row (full width)
3. Bottom section: buttons in a `flex items-center gap-1.5 mt-2 md:mt-0 self-end md:self-auto` row
4. Increase text line-height slightly on mobile for readability

One file, layout restructure only. No logic changes.

