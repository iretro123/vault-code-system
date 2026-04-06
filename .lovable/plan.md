

## Fix: Activity Ticker Showing Stale Cached Data

### Root Cause

The component has this logic on lines 68-71:
```js
const cached = readCache();
if (cached && cached.length > 0) {
  setItems(cached);
  return;  // ← skips the fetch entirely
}
```

The old cache from the previous version (which only fetched "wins" from `academy_messages`) is still in localStorage under `va_activity_ticker`. Since it hasn't expired (5-min TTL), the component never calls the new `get_recent_activity()` RPC. It just keeps showing the stale "Edward just posted a win" item.

The database function is working correctly — it returns 14 real activities: 5 live call joins, 4 journal entries, and 5 lesson completions across multiple students.

### Fix

**File: `src/components/academy/dashboard/ActivityTicker.tsx`**

1. Change the cache key from `va_activity_ticker` to `va_activity_ticker_v2` — this instantly invalidates the old stale cache so all users get fresh data on next load
2. No other changes needed — the RPC call, name resolution, marquee animation, and luxury styling are all correct

One line change. The ticker will immediately start showing real activity like "Alex joined a live call", "Chris journaled a trade", "Jordan watched a lesson".

### File

| File | Change |
|------|--------|
| `src/components/academy/dashboard/ActivityTicker.tsx` | Change cache key to `va_activity_ticker_v2` to bust stale cache |

