

# Add User-Selectable Risk Percentage (1-3%) to Trade OS

## Overview

Currently, risk percentage is hardcoded per account tier (Micro/Small = 2%, Medium/Large = 1%). Users should be able to choose 1%, 2%, or 3% themselves. This choice needs to flow through the entire pipeline: the budget summary, the planner, the limits section, and the HUD.

## Database Change

Add a `risk_percent_override` column to `user_preferences`:

```sql
ALTER TABLE public.user_preferences 
ADD COLUMN risk_percent_override integer DEFAULT NULL;
```

- `NULL` = use tier default (backward compatible)
- `1`, `2`, or `3` = user's explicit choice
- Constrained to 1-3 via validation trigger

## UI Change — Risk % Selector on Trade OS

Add a compact 3-button selector (1% · 2% · 3%) directly into the **budget summary bar** on the Plan stage (the collapsible line that shows "$173 max loss · $867 max spend · 2 trades"). This is where users already see their risk %, so putting the toggle here is natural.

The selector:
- Three small pill buttons: **1%** | **2%** | **3%**
- Active button gets a subtle glow matching the existing design language
- Persists the choice to `user_preferences.risk_percent_override` on click
- Shows the tier default as pre-selected when no override exists
- Changes instantly recalculate all displayed numbers

## Pipeline Integration

All these files currently read `TIER_DEFAULTS[tier].riskPercent` — they need to accept the user's override:

| File | What changes |
|------|-------------|
| `src/hooks/useUserPreferences.ts` | Add `risk_percent_override` to interface + defaults |
| `src/pages/academy/AcademyTrade.tsx` | Read user pref, pass override to budget display + planner; update HUD "max loss" line |
| `src/components/vault-planner/VaultTradePlanner.tsx` | Accept `riskPercentOverride` prop, pass to `calculateContractChoices` overrides |
| `src/components/vault/TodaysLimitsSection.tsx` | Accept optional `riskPercentOverride`, use it instead of tier default |
| `src/components/trade-os/PerformanceHUD.tsx` | No change needed (doesn't show risk %) |
| `src/lib/vaultApprovalCalc.ts` | Already supports `overrides.riskPercent` — no change needed |
| `src/lib/tradePlannerCalc.ts` | No change needed (engine already accepts riskPercent as input) |

## Data Flow

```text
user_preferences.risk_percent_override (DB)
        ↓
useUserPreferences() hook (already exists)
        ↓
AcademyTrade reads it → resolves effective risk %
        ↓
  ┌─────────┼──────────┐
  ↓         ↓          ↓
Budget    Planner    Limits
Summary   (override)  Section
```

## Effective Risk Resolution Logic

```typescript
function getEffectiveRiskPercent(tier: AccountTierLabel, override: number | null): number {
  if (override !== null && override >= 1 && override <= 3) return override;
  return TIER_DEFAULTS[tier].riskPercent;
}
```

## Key Safeguards

- Risk is clamped to 1-3% — no values outside this range accepted
- The vault constants engine (`computeVaultLimits`) uses risk modes (Conservative/Standard/Aggressive) for enforcement — this is separate from the planner's risk %. The planner risk % controls **sizing**, while vault risk mode controls **session enforcement**. Both systems remain independent
- Backward compatible: existing users with no override continue using tier defaults

