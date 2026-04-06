

## Global Timezone Awareness — Show All Times in the User's Local Timezone

### Current State

The app already detects the user's IANA timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone` and saves it to the `profiles.timezone` column on signup. It also backfills it on login if empty. However, **no component actually reads the user's timezone to convert times**. The economic calendar hardcodes ET display, live sessions render in raw UTC/local browser time inconsistently, and the `Profile` TypeScript interface in `useAuth.tsx` doesn't even expose `timezone`.

### What Changes

**1. Expose timezone from auth context**

Add `timezone` to the `Profile` interface in `useAuth.tsx` so every component can access `profile.timezone`.

**2. Create a shared timezone conversion utility**

New file `src/lib/userTime.ts` with helpers:
- `formatInUserTZ(date, formatStr, tz)` — wraps `date-fns-tz` (already available via date-fns) or uses `Intl.DateTimeFormat` to render any UTC/ISO timestamp in the user's saved timezone
- `formatTimeInTZ(isoDate, tz)` — returns "2:30 PM" in the given timezone
- `formatDateTimeInTZ(isoDate, tz)` — returns "Apr 10, 2:30 PM EST"
- `getUserTZLabel(tz)` — returns short label like "EST", "PST", "GMT+1"

Uses `Intl.DateTimeFormat` with the user's IANA timezone — no extra dependencies needed.

**3. Economic Calendar — show times in user's TZ**

Update `EconomicCalendarTab.tsx`:
- Read `profile.timezone` from `useAuth()`
- Convert stored ET times to the user's timezone for display (e.g., a user in PST sees "5:30 AM PT" instead of "8:30 AM ET")
- Show the user's TZ abbreviation instead of hardcoded "ET"
- Countdown timer already works correctly (uses absolute UTC timestamps) — no change needed

**4. Live Sessions — show times in user's TZ**

Update `AcademyLive.tsx` and `WeekScheduleSheet.tsx`:
- Session dates are stored as ISO/UTC timestamps — use the new helpers to display them in the user's timezone
- Add TZ label suffix (e.g., "9:25 PM EST" → "6:25 PM PST" for a west coast user)

**5. NYSE Session Bar — add user TZ context**

The `NYSESessionBar.tsx` correctly tracks ET market hours (it must stay in ET since NYSE operates in ET). No change to the bar logic, but add a small label showing the user's equivalent local time range.

### Technical Details

**Timezone conversion approach** (no new dependencies):
```typescript
export function formatTimeInTZ(isoOrDate: string | Date, tz: string): string {
  const d = new Date(isoOrDate);
  return d.toLocaleTimeString("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function getTZAbbr(tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "short",
  }).formatToParts(new Date());
  return parts.find(p => p.type === "timeZoneName")?.value || "";
}
```

**Economic calendar ET→user TZ conversion:**
The `time_et` column stores times like "08:30". To convert: build a UTC Date from the event date + ET time + ET offset, then format in the user's TZ using `Intl`.

### Files

| File | Action |
|------|--------|
| `src/lib/userTime.ts` | **Create** — shared timezone formatting utilities |
| `src/hooks/useAuth.tsx` | Add `timezone` to Profile interface (line 8-23) |
| `src/components/academy/community/EconomicCalendarTab.tsx` | Use user TZ for time display + countdown label |
| `src/pages/academy/AcademyLive.tsx` | Format session times in user TZ |
| `src/components/academy/live/WeekScheduleSheet.tsx` | Format session times in user TZ |
| `src/components/academy/dashboard/NextGroupCallCard.tsx` | Format countdown session time in user TZ |

No database changes needed — `profiles.timezone` already exists and is populated.

