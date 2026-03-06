

## Logic Refinement + Compact UX Cleanup for Vault Trade Planner

Targeted changes only. No rebuild. Keep the existing 3-panel layout, premium dark UI, and all current formulas.

---

### 1. Calculation Engine (`src/lib/tradePlannerCalc.ts`)

**Add "Micro" tier** — update `AccountTierLabel` to `"Micro" | "Small" | "Medium" | "Large"` and add to `TIER_DEFAULTS`:

| Tier | Threshold | Risk % | Preferred % | Hard Max % |
|------|-----------|--------|-------------|------------|
| Micro | < $1,000 | 2 | 7.5 | 12.5 |
| Small | $1,000–$4,999 | 2 | 5 | 10 |
| Medium | $5,000–$24,999 | 1 | 5 | 8 |
| Large | $25,000+ | 1 | 4 | 6 |

**Update `detectTier()`** to match the new thresholds.

**Add to `PlannerResult`**:
- `maxOneContractStopWidth: number` — `riskBudget / 100`
- `premiumFit: "IDEAL" | "AGGRESSIVE" | "TOO_EXPENSIVE"` — compared against `idealPremiumMax` and `aggressivePremiumMax`

**Update display logic for recommended/max in results**:
- When SAFE: recommended = safeContracts, max = maxContracts
- When AGGRESSIVE: recommended = maxContracts (labeled aggressive), max = maxContracts
- When NO_TRADE: recommended = 0, max = 0

All existing formulas, targets, verdict logic stay identical.

---

### 2. UI Component (`src/components/vault-planner/VaultTradePlanner.tsx`)

**Account Panel changes:**
- Update `SegmentedToggle` to show 4 tiers: Micro, Small, Medium, Large
- Add a compact **"1-Contract Fit"** box below Premium Fit (same styling), showing 3 lines:
  - `Ideal premium: up to $X.XX`
  - `Aggressive max: up to $X.XX`
  - `Max stop width: $X.XX`
- Merge the current separate "Premium Fit" box into this single "1-Contract Fit" box for compactness

**Results Panel changes:**
- Add a small **Premium Fit** badge after the verdict banner: `Premium Fit: IDEAL` / `AGGRESSIVE` / `TOO EXPENSIVE` (color-coded, one line)
- Update contract display labels:
  - SAFE verdict: "Recommended Size" = safeContracts, "Max Allowed" = maxContracts
  - AGGRESSIVE: "Recommended Size (Aggressive)" = maxContracts
  - NO_TRADE: show 0
- Everything else stays as-is (targets, collapsible "Why this result?", status badges)

**No changes to**: Trade panel, header, footer, loading screen, TradePlannerResults.tsx, any styling/spacing.

---

### 3. TradePlannerResults.tsx

- Add `premiumFit` badge display matching the inline results panel
- Update tier toggle references from 3 to 4 options (if tier is displayed there)

---

### Files
- `src/lib/tradePlannerCalc.ts` — add Micro tier, `premiumFit` field, `maxOneContractStopWidth`
- `src/components/vault-planner/VaultTradePlanner.tsx` — 4-tier toggle, 1-Contract Fit box, Premium Fit badge in results, smart contract labels
- `src/components/vault-planner/TradePlannerResults.tsx` — add Premium Fit badge

No database changes. No new files. No rebuild.

