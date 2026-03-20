

## Fix: Live Section Not Reflecting Risk % Selection

### Root Cause
The Live section's "Your Limits" card calls `computeVaultLimits(bal, vaultState.risk_mode || "STANDARD")` which always uses `vaultState.risk_mode` (a separate system). Meanwhile, the user's 1%/2%/3% selection is stored in `prefs.risk_percent_override` and is only used for `riskBudget` — but `max_contracts` still comes from `computeVaultLimits` which ignores the override.

The mapping is: 1% = CONSERVATIVE, 2% = STANDARD, 3% = AGGRESSIVE. But `vaultState.risk_mode` stays "STANDARD" regardless of what the user picks on the Plan screen.

### Fix — `AcademyTrade.tsx` (line ~1040)
Derive the correct risk mode from the user's `risk_percent_override` instead of relying on `vaultState.risk_mode`:

```tsx
const riskModeFromPercent = effectiveRisk === 1 ? "CONSERVATIVE" 
  : effectiveRisk === 3 ? "AGGRESSIVE" : "STANDARD";
const vaultLimits = computeVaultLimits(bal, riskModeFromPercent);
```

Apply this same fix in both places where it's computed:
1. **Plan stage** (line ~797) — already mostly correct via `riskBudget`, but `max_contracts` is still wrong
2. **Live stage** (line ~1040) — the main bug the user is seeing

This ensures Daily Buffer, Risk/Trade, Max Contracts, and Reward Targets all update when the user switches between 1%, 2%, and 3%.

