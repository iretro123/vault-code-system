

## Fix: Calendar "Next Up" Card — Mobile Layout

### Problem
On mobile (390px), the `NextUpCard` uses a horizontal `flex-wrap` layout for the event info + countdown timer. The three large timer pills (48px min-width each + colons + gaps) consume ~200px, leaving the event name truncated and the card feeling cramped.

### Fix
Stack the layout vertically on mobile — event info on top, countdown timer centered below it. On desktop (sm+), keep the current side-by-side layout.

### Changes in `src/components/academy/community/EconomicCalendarTab.tsx`

**Line 172** — The `flex items-center justify-between gap-4 flex-wrap` container:
- Change to `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4`
- This stacks vertically on mobile, side-by-side on desktop

**Lines 96-112** — The `Pill` component:
- Reduce pill size on mobile: `min-w-[40px] text-lg` → `sm:min-w-[48px] sm:text-xl`

**Line 197** — The countdown container:
- Add `justify-center` so the pills center nicely when stacked on mobile

One file, ~5 lines changed. No logic changes, pure layout fix.

