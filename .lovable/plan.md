

## Fix: Countdown Timer Showing Wrong Time

### Root Cause

`todayETDate()` (line 67-82) has two bugs:

1. **DST detection uses the user's local timezone** (line 78: `now.getTimezoneOffset()`), not New York's. If the user is in UTC, PST, or anywhere non-ET, the DST check is wrong.

2. **Double timezone conversion** — line 74 creates a `Date` by parsing `"2026-04-06T13:00:00"` which JS interprets as **local time**, then adds the ET offset. This is wrong — it should be treated as UTC before adding the offset, or better yet, use a reliable method.

### Fix

Replace `todayETDate` with a correct implementation that uses `Intl.DateTimeFormat` to reliably get the current ET time and compute the target:

```typescript
function todayETDate(timeET: string): Date {
  const [h, m] = timeET.split(":").map(Number);
  // Get today's date in ET
  const now = new Date();
  const etDateStr = now.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  // Build ISO string as UTC, then subtract the actual ET offset
  // Use Intl to find the real ET offset right now
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    timeZoneName: "shortOffset",
  });
  const parts = formatter.formatToParts(now);
  const tzPart = parts.find((p) => p.type === "timeZoneName")?.value || "GMT-4";
  // Parse offset like "GMT-4" or "GMT-5"
  const offsetMatch = tzPart.match(/GMT([+-]\d+)/);
  const etOffsetHours = offsetMatch ? parseInt(offsetMatch[1], 10) : -4;
  // Build the UTC timestamp for the target ET time
  const targetUTC = new Date(`${etDateStr}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00Z`);
  // Subtract the ET offset to convert ET→UTC (ET is behind UTC, offset is negative)
  return new Date(targetUTC.getTime() - etOffsetHours * 60 * 60 * 1000);
}
```

This correctly:
- Gets today's date in ET (handles midnight boundary)
- Detects the real ET offset using `Intl` (works for any user timezone)
- Builds the target as UTC, then adjusts for the ET offset

### File

| File | Change |
|------|--------|
| `src/components/academy/community/EconomicCalendarTab.tsx` | Replace `todayETDate` function (lines 67-82) with correct timezone math |

One function, ~15 lines. The countdown timer will now show the correct hours/minutes/seconds regardless of the user's timezone.

