

# Fix Trade Deletion Error

## Root Cause

The `update_discipline_on_trade` database trigger fires on INSERT, UPDATE, **and DELETE** operations. It references `NEW.user_id`, but during a DELETE operation, `NEW` is NULL — only `OLD` is populated. This causes a runtime error every time a user tries to delete a trade entry.

Additionally, the `reverse_trade_entry_from_vault_state` trigger compares `OLD.trade_date <> CURRENT_DATE::text`, but `trade_date` is a `date` type, not `text` — a type mismatch that could cause issues.

## Fix

### 1. Fix the discipline trigger (database migration)
Replace the `update_discipline_on_trade` function to handle DELETE by using `OLD.user_id` when `NEW` is null:

```sql
CREATE OR REPLACE FUNCTION update_discipline_on_trade()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM calculate_discipline_metrics(OLD.user_id);
    RETURN OLD;
  ELSE
    PERFORM calculate_discipline_metrics(NEW.user_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### 2. Fix the date comparison in reverse trigger (database migration)
Update `reverse_trade_entry_from_vault_state` to compare `OLD.trade_date <> CURRENT_DATE` (without `::text` cast), ensuring proper date-to-date comparison.

### 3. Improve client-side delete flow
**File: `src/hooks/useTradeLog.ts`** — The `deleteEntry` function already handles errors, but ensure it calls `refetch` after successful deletion to guarantee fresh data.

### Files Changed
- **Database migration**: Fix `update_discipline_on_trade` function + fix date comparison in `reverse_trade_entry_from_vault_state`
- **Edit**: `src/hooks/useTradeLog.ts` — add explicit refetch after delete

