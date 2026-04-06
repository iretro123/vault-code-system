

## Fix Activity Ticker — Show 5 Max Items From Different Users, Add Win Activity Type

### Problem

1. The ticker only shows max 3 items (hardcoded `slice(0, 3)`) — should be 5
2. The RPC function `get_recent_activity` doesn't include "posted a win" activity type (from `academy_messages` where `room_slug = 'wins'`)
3. Currently there are 5 unique users with real activity across calls, journals, and lessons — but only 2-3 show because of the slice

### Changes

**Database Migration** — Update `get_recent_activity()` to:
- Add a 4th UNION for wins: `SELECT from academy_messages WHERE room_slug = 'wins'` (last 30 days, limit 5)
- Keep the existing 3 activity sources (calls, journals, lessons)
- This ensures when students post wins, they show up in the ticker

**Component (`ActivityTicker.tsx`)** — Two changes:
1. Change `slice(0, 3)` → `slice(0, 5)` to show up to 5 items
2. Add a "win" type with a trophy/star icon and text like "{Name} posted a win"
3. Add deduplication logic: pick at most 1 item per user so 5 items = 5 different students
4. Add `"win"` to the TickerItem type union and icon switch

### Technical Detail

Updated RPC adds:
```sql
UNION ALL
(SELECT 'w-' || id::text, user_id, 'win'::text, created_at
 FROM academy_messages
 WHERE room_slug = 'wins' AND created_at >= now() - interval '30 days'
 ORDER BY created_at DESC LIMIT 5)
```

Dedup logic in component:
```ts
// Pick one item per unique user, max 5
const seen = new Set<string>();
const unique = result.filter(item => {
  const uid = item.userId;
  if (seen.has(uid)) return false;
  seen.add(uid);
  return true;
});
const final = shuffle(unique).slice(0, 5);
```

### Files

| File | Change |
|------|--------|
| Database migration | Update `get_recent_activity()` to add wins source |
| `src/components/academy/dashboard/ActivityTicker.tsx` | Max 5 items, 1 per user, add "win" type with icon |

