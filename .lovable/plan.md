

## Clear Trade Fields When Account Size Is Deleted

**Problem**: When the user clears the Account Size field, the Entry Premium and Stop Premium fields retain their old values, leaving stale data in the Trade and Results cards.

**Fix** in `src/components/vault-planner/VaultTradePlanner.tsx` — update the existing `useEffect` (lines 200–217) that already resets tier defaults when account size is cleared. Add `setEntryPremium("")` and `setStopPremium("")` inside the `if (!size || size <= 0)` block.

```typescript
if (!size || size <= 0) {
  setTier("Small");
  const d = TIER_DEFAULTS["Small"];
  setRiskPercent(d.riskPercent.toString());
  setPreferredSpendPercent(d.preferredSpendPercent.toString());
  setHardMaxSpendPercent(d.hardMaxSpendPercent.toString());
  setEntryPremium("");   // ← new
  setStopPremium("");    // ← new
  setTicker("");         // ← new
  return;
}
```

This clears the Trade card inputs and the Results card (which already shows empty state when inputs are invalid). One file, 3 lines added.

