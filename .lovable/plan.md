

## Fix: Live Session Status Line Shows Wrong Day

### Problem

Line 58 in `HeroHeader.tsx` sets `tomorrow = now + 24 hours`, and the query fetches any `live_sessions` between now and 24 hours from now. On Saturday evening, this picks up Sunday's session and displays **"Live session tonight"** — which is incorrect since it's tomorrow, not tonight.

The same bug exists in `DashboardStatusLine.tsx` (identical logic).

### Fix

**Files: `src/components/academy/dashboard/HeroHeader.tsx` + `src/components/academy/DashboardStatusLine.tsx`**

Change the live session query window from "next 24 hours" to "end of today" so it only picks up same-day sessions. Then add smart labeling:

```typescript
// Instead of: tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
// Use end of today:
const endOfToday = new Date(now);
endOfToday.setHours(23, 59, 59, 999);

// Also query next 48h to find upcoming sessions for "tomorrow" label
const endOfTomorrow = new Date(endOfToday.getTime() + 24 * 60 * 60 * 1000);
```

Update the display logic:
- Session is **today** → `Live session tonight: "title"`
- Session is **tomorrow** → `Live session tomorrow: "title"`
- No session today or tomorrow → skip, show next status line

### Files to Change

| File | Change |
|------|--------|
| `src/components/academy/dashboard/HeroHeader.tsx` | Fix query window + smart day label (lines 58, 68-82) |
| `src/components/academy/DashboardStatusLine.tsx` | Same fix for the duplicate status resolver (lines 49-58, 65-70) |

