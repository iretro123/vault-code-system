

# Fix: Tap-to-Reveal Popover for Performance Intelligence Cards on Mobile

## Approach
Instead of expanding the cards or adding more vertical space, make each summary card (Grade, Leak, Edge, Next) **tappable**. On tap, a small **Popover** appears showing the full text — keeping the grid compact and the design tight.

## Changes

### `src/pages/academy/AcademyTrade.tsx` (lines ~929-952)

1. Import `Popover, PopoverTrigger, PopoverContent` from `@/components/ui/popover`
2. Wrap each of the 4 grid cells in a `Popover`:
   - The existing card becomes the `PopoverTrigger` (keep `truncate`, keep current sizing)
   - `PopoverContent`: dark glassmorphic mini-card (`bg-black/90 backdrop-blur border-white/10 rounded-xl p-3 max-w-[220px]`) showing:
     - Label (e.g., "Leak") in uppercase muted text
     - Full untruncated text below in `text-xs text-foreground/90`
   - `side="top"` so it floats above the card without pushing content down
3. Grade card gets a slightly different popover — show the letter grade large + a one-line explanation if available

No layout changes, no extra height, no new components. Uses the existing Popover primitive which already handles touch dismiss and portal rendering.

### Files
- `src/pages/academy/AcademyTrade.tsx` — wrap 4 summary cells in Popover

