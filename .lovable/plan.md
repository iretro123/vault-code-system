

## Guided Trade Panel — Surgical Addition

Add inline premium/stop guidance and quick-fill chips to the Trade panel. No new files, no layout changes, no logic changes.

### Changes to `src/components/vault-planner/VaultTradePlanner.tsx` only

**1. Compute guidance values from account state (no `liveResult` needed)**

Before the Trade panel renders, derive these from the raw state values (they only need `accountSize` and tier percentages — independent of buy/stop validity):

```typescript
const riskBudget = acctSize * (parseFloat(riskPercent) / 100);
const prefBudget = acctSize * (parseFloat(preferredSpendPercent) / 100);
const hardBudget = acctSize * (parseFloat(hardMaxSpendPercent) / 100);
const idealPrem = prefBudget / 100;
const aggressivePrem = hardBudget / 100;
const maxStopW = riskBudget / 100;
```

**2. Below Buy Price input — add premium guidance line + quick-fill chips**

Only show when `acctSize > 0`. Compact single line:
```
Ideal: up to $0.50 · Aggressive max: $1.00
```
Plus two tiny chip buttons: `Use Ideal` / `Use Aggressive` — clicking sets `entryPremium` to the computed value (rounded to 2 decimals).

Chips styled as small pill buttons matching the existing `ActionButton` style but smaller (`text-[9px]`, `px-2 py-0.5`).

**3. Below Stop Price input — add stop guidance line**

Only show when `acctSize > 0` AND `entryPremium` is entered and > 0. Replace the current static helper text with a dynamic line:
```
Max stop width: $0.20 · Lowest stop: $0.30
```
Where `lowestStop = buyPrice - maxStopWidth` (clamped to >= 0.01).

**4. No other changes**
- No changes to Account panel, Results panel, header, footer, formulas, or `tradePlannerCalc.ts`
- No new components or files
- Keep everything compact — guidance lines are `text-[9px]` muted text, chips are tiny pills

### File
- `src/components/vault-planner/VaultTradePlanner.tsx` — add ~30 lines in the Trade panel section

