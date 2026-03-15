

# Fix: Compliance Ring Positioning + Contrast

## Issues Found

1. **88% text escapes its container**: Line 649 uses `absolute` positioning on the text overlay inside the ring, but the parent `div` (line 640) is NOT `relative`. This causes the percentage to float relative to the nearest positioned ancestor and scroll independently.

2. **Low contrast on "This week" label**: `text-foreground/40` is too dim.

## Changes

### File: `src/pages/academy/AcademyTrade.tsx` (lines 639-653)

**Fix the compliance ring container:**
- Add `relative` to the parent div (line 640) so the `absolute` text overlay stays anchored inside the SVG ring
- Bump "This week" label from `text-foreground/40` to `text-foreground/60`

That's it — a 2-line fix. The `absolute` div on line 649 will now position correctly within its `relative` parent instead of floating free.

