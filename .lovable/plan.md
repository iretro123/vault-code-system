

# Full Pipeline Audit & Fix Plan

## Critical Bug Found: Mixed Data Format Corruption

The database has **two batches of seeded trades with incompatible formats**, causing every calculation pipeline to produce wrong numbers:

**Batch 1 (24 older trades, created Mar 14):** Have `outcome` set (WIN/LOSS/BREAKEVEN) but `risk_reward` contains **R-multipliers** (1.5, -1, 2.0, etc.). Since `computePnl` sees `outcome` exists, it returns the raw `risk_reward` value — so a $200 risk SPY win at 1.5R shows as **+$1.50** instead of **+$300**.

**Batch 2 (5 newer trades, created Mar 15):** Correctly formatted — `risk_reward` = direct dollar P/L (-450, -300, etc.).

**Impact on every pipeline:**
- **Equity Curve**: Shows flat line for 24 trades then sudden cliff — total P/L is wildly wrong
- **HUD Balance**: Tracked balance is off by thousands 
- **Win Rate**: Correctly counts wins (risk_reward > 0), so 13/29 = 45% — this is **accidentally correct**
- **AI Performance Intelligence**: The edge function's `computeAnalytics` uses `risk_reward` for R-multiple stats and sizing stats — all metrics are corrupted (avg winner shows 1.55R which looks like a multiplier but is actually $1.55 in the new-format interpretation)
- **Weekly Review**: P/L sums are wrong
- **Symbol breakdown P/L**: All wrong
- **Scoreboard**: Indirectly affected through stale cache

## Fix: Migrate the 24 corrupted records

Convert the R-multiplier values to actual dollar P/L in the database:
- For each record where `outcome IS NOT NULL` and `risk_reward` is between -2 and 3 (R-multiplier range): set `risk_reward = risk_reward * risk_used` (the legacy formula)
- This makes all records consistent with the new format

SQL migration:
```sql
UPDATE trade_entries 
SET risk_reward = risk_reward * risk_used
WHERE user_id = '6f863212-a859-4812-9775-0b1388bc21b3'
  AND outcome IS NOT NULL
  AND risk_reward BETWEEN -5 AND 5
  AND ABS(risk_reward) != ABS(risk_used);
```

## Pipeline Verification After Fix

Once the data is fixed, every pipeline should produce correct numbers:

1. **computePnl** → returns `risk_reward` directly for all records (all have `outcome`)
2. **Equity Curve** → running sum of actual dollar P/L values
3. **HUD Balance** → `startingBalance + totalPnl` = accurate tracked balance
4. **AI Focus Edge Function** → `computeAnalytics` uses raw `risk_reward` for R-multiple stats — after fix, these will be dollar values, which is what the system prompt labels correctly ("Mean risk: $X")
5. **Weekly Review** → correct day-by-day P/L aggregation
6. **Symbol Stats** → correct per-ticker P/L totals
7. **Vault State** → already correct (RED, 0 trades remaining, 0 risk remaining)

## Additional Fix: Clear Stale AI Cache

After the data migration, we need to:
1. Clear the `ai_focus_cache` column in profiles (force fresh AI scan)
2. Clear localStorage caches (`va_cache_ai_focus_v3`, `va_cache_trade_entries`) on next load

## Code Changes Needed

### 1. Database migration
Update the 24 corrupted trade entries to convert R-multipliers to dollar P/L.

### 2. Clear AI cache in profiles
```sql
UPDATE profiles SET ai_focus_cache = NULL 
WHERE user_id = '6f863212-a859-4812-9775-0b1388bc21b3';
```

### 3. Add cache-bust on AcademyTrade.tsx
Add a one-time localStorage clear for trade caches to force fresh data after the migration. This can be a versioned cache-bust key.

### 4. Edge function analytics fix
The `trade-focus` edge function's `computeAnalytics` has the same format inconsistency — it uses `risk_reward` directly for R-multiple calculations (avgWinnerR, avgLoserR, bestR, worstR). After fixing the data, these "R" values will actually be dollar amounts. The system prompt labels them as "$" for sizing but "R" for R-multiple section. Need to either:
- Accept that R-multiple is now dollar-based (rename in prompt), or
- Compute actual R by dividing `risk_reward / risk_used`

The cleaner fix: compute R-multiple as `risk_reward / risk_used` in the analytics function, which works for both formats.

## Summary of Changes

| What | Where | Why |
|------|-------|-----|
| Fix 24 corrupted records | DB migration | R-multiplier → dollar P/L |
| Clear AI cache | DB + localStorage | Force fresh scan with corrected data |
| Fix R-multiple calculation | `trade-focus/index.ts` | Use `risk_reward / risk_used` instead of raw `risk_reward` |
| Add cache-bust version | `AcademyTrade.tsx` | Invalidate stale localStorage after migration |

After these fixes, all pipelines — equity curve, HUD, AI intelligence, weekly review, symbol breakdown, vault command bar — will show real, accurate numbers derived from the corrected data.

