

## Account Panel Layout Refinement

Reorder and restyle the Account panel in `src/components/vault-planner/VaultTradePlanner.tsx` (lines 334–393). No logic or formula changes.

### New order (lines 334–393)

1. **Account Size input** (unchanged)
2. **Tier toggle** (move up, before the plan card)
3. **Account Plan card** (move below tier toggle, restyle)
4. **Unlock Custom** button (stays last)

### Account Plan card restyling

Replace the current compact card (lines 345–358) with a cleaner 4-row summary structure:

- Increase text from `text-[10px]` → `text-[11px]` for row labels/values
- Increase header from `text-[9px]` → `text-[10px]`
- Add `gap-y-1.5` instead of `gap-y-0.5` for better row spacing
- Values use `font-bold` instead of `font-semibold`
- Change content to 4 rows:
  - **Risk per trade** → `$X`
  - **Best premium zone** → `~$X`
  - **Stretch zone** → `up to $X`
  - **Max stop width** → `$X` (new row, = `riskBudget / 100`)
- Remove the "For a $X account:" paragraph line
- Keep the "Best for 1-contract setups" footer as `text-[9px]` muted italic
- Slightly increase padding: `px-3.5 py-3`

### File
- `src/components/vault-planner/VaultTradePlanner.tsx` — reorder + restyle ~30 lines in Account panel

