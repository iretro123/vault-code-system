

## Clean Up & Upgrade Vault Trade Planner

Redesign the UI for compactness and premium feel, and upgrade the calculation engine with the new 3-tier spend system (preferred + hard max) and SAFE/AGGRESSIVE/NO TRADE verdict.

### 1. Calculation Engine (`src/lib/tradePlannerCalc.ts`)

**Update `TierDefaults` to include 3 spend tiers:**
```typescript
export interface TierDefaults {
  riskPercent: number;
  preferredSpendPercent: number;
  hardMaxSpendPercent: number;
}

export const TIER_DEFAULTS: Record<AccountTierLabel, TierDefaults> = {
  Small:  { riskPercent: 2, preferredSpendPercent: 5, hardMaxSpendPercent: 10 },
  Medium: { riskPercent: 1, preferredSpendPercent: 5, hardMaxSpendPercent: 8 },
  Large:  { riskPercent: 1, preferredSpendPercent: 4, hardMaxSpendPercent: 6 },
};
```

**Update `PlannerInputs`:** Replace `debitCapPercent` with `preferredSpendPercent` and `hardMaxSpendPercent`.

**Update `PlannerResult`:** Add `preferredSpendBudget`, `hardSpendBudget`, `contractsByPreferredSpend`, `contractsByHardSpend`, `safeContracts`, `maxContracts`, `idealPremiumMax`, `aggressivePremiumMax`. Keep `finalContracts` = `safeContracts` (display both safe and max separately).

**New verdict logic:**
- `contractsByRisk < 1` → NO_TRADE
- `contractsByHardSpend < 1` → NO_TRADE  
- `contractsByPreferredSpend < 1` but `contractsByHardSpend >= 1` → AGGRESSIVE (label "AGGRESSIVE" replaces "CAUTION")
- Otherwise → SAFE (replaces "PASS")

Update `TradeVerdict` type to `"SAFE" | "AGGRESSIVE" | "NO_TRADE"`.

**Update target formulas** to use `r = entry - stop` directly:
- `tp1 = entry + r` (1:1)
- `mainTarget = entry + 2*r` (1:2) — already correct
- `tp2 = entry + 3*r` (1:3) — already correct as `rr1to3Target`

**Keep** all existing fields that are still used (profitAt*, breakEven, theta, etc). Remove `debitCapDollars`, `contractsByDebit`, `debitCheckPass` — replaced by preferred/hard equivalents.

### 2. UI Component (`src/components/vault-planner/VaultTradePlanner.tsx`)

**Major cleanup — make compact and premium again:**

**Header:** Tighten — single line title + subtitle, remove the long helper paragraph.

**Account panel (compact):**
- Account Size input
- Auto-detected tier badge: one compact line like `Small Account • 2% risk • 5% preferred • 10% hard max`
- Segmented toggle (keep)
- Remove the two separate `DollarReadout` cards — replace with a single compact "Premium Fit" section:
  - `Ideal premium: up to $X.XX` / `Aggressive max: up to $X.XX`
  - Computed as `preferredSpendBudget / 100` and `hardSpendBudget / 100`
- Risk % and Spend % inputs: keep but smaller, only shown when unlocked. When locked, show values inline in the badge.
- Unlock Custom button (keep, smaller)

**Trade panel (minimal):**
- Remove Ticker field (keep it only in copy text if previously entered, but remove from visible form for compactness)
- Direction toggle (keep)
- Buy Price + Stop Price inputs (keep)
- One line helper under stop (keep)
- Remove theta warning from Trade panel (move to Results if relevant)
- Remove "How to choose a contract" collapsible (move to a tiny `?` tooltip on Buy Price instead)
- Action buttons row: Generate, Load Example, Reset, Copy Plan (keep, tighter spacing)

**Results panel (compact, strong hierarchy):**
- Verdict banner: update to SAFE (green) / AGGRESSIVE (amber) / NO TRADE (red) with one-line reason
- Hero metrics card: Contracts (show "Safe: X / Max: X" if different), Planned Loss, Entry Cost
- Targets card: TP1, Main Target (1:2), TP2 — compact rows
- Remove WhatToDoCard (too verbose)
- Remove OutcomeSnapshot grid (replaced by inline profit values next to targets)
- Keep "Why this size?" collapsible (one line)
- Keep Risk/Spend check badges at bottom

**Footer:** Keep but tighten to 2 short lines.

**Remove** unused imports (Target, TrendingUp, etc), remove `DollarReadout` component, remove `WhatToDoCard`, remove `OutcomeSnapshot`.

### 3. Results Page (`src/components/vault-planner/TradePlannerResults.tsx`)

Update to match new verdict types and field names. Update references from `debitCheckPass` to preferred/hard spend checks. Update verdict labels from PASS/CAUTION to SAFE/AGGRESSIVE.

### Files
- `src/lib/tradePlannerCalc.ts` — new spend tiers, verdict system, premium fit fields
- `src/components/vault-planner/VaultTradePlanner.tsx` — compact 3-panel cleanup
- `src/components/vault-planner/TradePlannerResults.tsx` — align with new types

No database changes.

