

## Fix: "numeric field overflow" on trade_entries

### Root Cause
- `risk_used numeric(5,2)` -- max 999.99. The code stores `Math.abs(pnlNum)` here, so any P/L >= $1000 overflows.
- `risk_reward numeric(5,2)` -- stores -1/0/1 so it's fine, but should be widened for safety.

### Fix
One database migration to widen both columns to uncapped `numeric` (no precision/scale limit):

```sql
ALTER TABLE public.trade_entries 
  ALTER COLUMN risk_used TYPE numeric,
  ALTER COLUMN risk_reward TYPE numeric;
```

This is non-destructive -- existing rows remain valid. No frontend changes needed.

