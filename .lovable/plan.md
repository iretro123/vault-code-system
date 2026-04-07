

## Fix: Status Line Says "Tonight" for a 9 AM Session

### Problem
Line 87 in `HeroHeader.tsx` hardcodes `"Live session tonight"` for any session happening today, regardless of time. A 9 AM session should not say "tonight."

### Root Cause
```ts
const label = isToday ? "Live session tonight" : "Live session tomorrow";
```
No check on the actual hour of the session — it always says "tonight" if the session is today.

### Fix

**File: `src/components/academy/dashboard/HeroHeader.tsx`**

Replace the hardcoded "tonight" / "tomorrow" logic (lines 84-88) with time-aware labels:

1. Get the user's timezone from their profile (or fall back to browser)
2. Check the session's hour in the user's local time
3. Pick the right label:
   - **Today, before 12 PM** → `"Live session today at 9:00 AM"`
   - **Today, 12 PM–5 PM** → `"Live session this afternoon at 2:00 PM"`
   - **Today, after 5 PM** → `"Live session tonight at 7:00 PM"`
   - **Tomorrow** → `"Live session tomorrow at 9:00 AM"`
4. Use `formatTimeInTZ()` from `src/lib/userTime.ts` to display the time in the user's timezone

This also requires passing `profile?.timezone` into `useStatusLine` so times are localized.

### Technical Detail

```ts
// New logic replacing line 84-88
if (liveRes.data && liveRes.data.length > 0) {
  const session = liveRes.data[0];
  const sessionDate = new Date(session.session_date);
  const isToday = sessionDate <= endOfToday;
  const hour = sessionDate.toLocaleString("en-US", { timeZone: tz, hour: "numeric", hour12: false });
  const hourNum = parseInt(hour, 10);
  const timeStr = formatTimeInTZ(session.session_date, tz);
  
  let label: string;
  if (!isToday) {
    label = `Live session tomorrow at ${timeStr}`;
  } else if (hourNum < 12) {
    label = `Live session today at ${timeStr}`;
  } else if (hourNum < 17) {
    label = `Live session this afternoon at ${timeStr}`;
  } else {
    label = `Live session tonight at ${timeStr}`;
  }
  return `${label} — "${session.title}"`;
}
```

### Changes

| File | Change |
|------|--------|
| `src/components/academy/dashboard/HeroHeader.tsx` | Pass user timezone into `useStatusLine`/`resolveStatus`, replace hardcoded "tonight" with time-aware label using `formatTimeInTZ` |

