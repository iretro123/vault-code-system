

## Fix: Activity Ticker — Wrong Room Slug for Wins

### Confirmation: All Data Is Real

The ticker pulls from 4 real database tables via a `SECURITY DEFINER` function. Here's what's actually in the database right now (last 30 days):

- **120 live call joins** — real students clicking "Join" on live sessions
- **20 journal entries** — real trade journals submitted by students
- **95 lesson completions** — real lessons marked complete
- **8 win posts** — real wins posted in the community

Every name shown is fetched from real user profiles. There is absolutely no fake or hardcoded data.

### The Bug

The RPC function filters wins with `room_slug = 'wins'`, but the actual room slug in the database is `'wins-proof'`. This means wins never appear in the ticker — the query returns 0 rows for that source every time.

### Fix

One database migration to update the `get_recent_activity()` function — change `room_slug = 'wins'` to `room_slug = 'wins-proof'`.

That's it. One line. After this, the ticker will show all 4 activity types: calls, journals, lessons, and wins — all real.

### File

| File | Change |
|------|--------|
| Database migration | Fix `get_recent_activity()`: change `'wins'` → `'wins-proof'` |

