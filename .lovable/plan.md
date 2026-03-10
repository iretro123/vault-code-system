

## Fix: `profiles_discipline_status_check` constraint blocks trade logging

### Root Cause
The `calculate_discipline_metrics` function (called by `on_trade_entry_change` trigger on `trade_entries`) sets `discipline_status = 'locked'` on the profiles table. But the `profiles_discipline_status_check` constraint only allows `'active'` or `'inactive'` -- so the insert into `trade_entries` cascades into a profile update that violates this constraint.

### Fix
One database migration to update the check constraint to also allow `'locked'`:

```sql
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_discipline_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_discipline_status_check
  CHECK (discipline_status = ANY (ARRAY['active', 'inactive', 'locked']));
```

This is the only change needed. No frontend files affected -- the existing code is correct.

### Technical Detail
- The trigger `on_trade_entry_change` fires AFTER INSERT/UPDATE on `trade_entries`
- It calls `calculate_discipline_metrics(user_id)` which computes a score and sets `discipline_status` to either `'active'` or `'locked'`
- The value `'locked'` was never added to the constraint when the function was created, causing every trade log to fail when the score triggers a "locked" state

