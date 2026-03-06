

## Surgical Refinement: Tier Bug Fix + Polish Pass

### Investigation

The `detectTier()` function in `tradePlannerCalc.ts` (line 11-16) already has the correct thresholds (`>= 1000` returns "Small"). However, the bug may be a floating-point edge case or a state initialization issue. I will verify and add an explicit guard.

### Changes

**1. `src/lib/tradePlannerCalc.ts`** — Harden tier thresholds
- Ensure `detectTier` uses exact thresholds with no ambiguity (already correct but will add comment for clarity)
- No formula changes needed — all 1-Contract Fit math is already correct

**2. `src/components/vault-planner/VaultTradePlanner.tsx`** — Polish pass
- **Verdict banner**: Add slightly more padding, larger font weight, subtle letter-spacing for premium feel
- **Button row**: Use `justify-between` or consistent `gap-2` for cleaner alignment; ensure all buttons same height
- **1-Contract Fit card**: Tighten line spacing, use a grid layout for the 3 values to make it scannable
- **Results panel**: Reduce vertical gaps from `space-y-2.5` to `space-y-2`, tighten `ResultRow` padding from `py-2` to `py-1.5`
- **AGGRESSIVE verdict**: Show "Recommended Size (Aggressive)" label clearly as it already does — verify this path works when `safeContracts === 0` but `maxContracts > 0`

**3. `src/components/vault-planner/TradePlannerResults.tsx`** — No changes needed (already aligned)

### What stays the same
- All formulas, targets, 3-panel layout, dark premium UI, collapsible sections, tooltip system
- No new features, no new cards, no new text blocks

