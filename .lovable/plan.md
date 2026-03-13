

# Show Percentage Inside Progress Rings

## Change

In `src/components/academy/community/CockpitPanel.tsx`, update the `ProgressRing` component to display the percentage (e.g. "60%") inside the ring instead of the raw count value.

### File: `src/components/academy/community/CockpitPanel.tsx`

**Line 46** — Replace `{value}` with `{Math.round(pct * 100)}%`

Also bump the font size slightly from `9px` to `8px` to fit the "%" symbol, and keep the bold weight.

