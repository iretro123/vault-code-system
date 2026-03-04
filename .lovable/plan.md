

## Fix TradeFloorHero Header Overlap

**File:** `src/components/academy/community/TradeFloorHero.tsx`

### Changes

1. **Remove Reply and React badges** (lines 35-41): Delete the two `<span>` elements for "↩ Reply" and "😀 React"
2. **Keep**: "VAULT Community" title on left, Guidelines button + "12 Active" indicator on right

This eliminates the overlap by reducing the number of items competing for horizontal space. The subtitle text is already hidden on mobile via `hidden sm:block`, so the remaining elements (title + guidelines + active) will fit cleanly.

