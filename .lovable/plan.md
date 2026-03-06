

## Fix "Long Call / Long Put" Pills — Glued Together

**Problem**: The two pill buttons in the Trade card's `SegmentedToggle` ("Long Call" and "Long Put") have no visual separation — they look glued together as one block.

**Root cause**: The `SegmentedToggle` component (line 92) uses `overflow-hidden` on the container and buttons sit flush against each other with no gap or divider.

**Fix** in `src/components/vault-planner/VaultTradePlanner.tsx` (lines 88–107):

1. Add `gap-1` to the flex container to create spacing between pills
2. Add `rounded-lg` to each individual button so they look like separate pills
3. Remove `overflow-hidden` from the container (no longer needed with gap)
4. Keep all existing logic, disabled behavior, and styling intact

Result: Two clearly separated, rounded pill buttons instead of one fused block.

**One file changed**: `src/components/vault-planner/VaultTradePlanner.tsx` — ~5 lines in `SegmentedToggle`.

