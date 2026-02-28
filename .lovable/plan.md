

## Make "Add to Calendar" open Google Calendar with pre-filled details

### Changes — `src/pages/academy/AcademyLive.tsx`

1. **Add helper function** `buildGoogleCalendarUrl(session)` that constructs the URL:
   - `https://calendar.google.com/calendar/render?action=TEMPLATE`
   - `text` = session title
   - `dates` = start/end in `YYYYMMDDTHHmmSSZ` format (end = start + duration_minutes, default 60)
   - `details` = description + join URL
   - `ctz` = `America/New_York`

2. **Update the button** at line 455 — add `onClick` that calls `window.open(buildGoogleCalendarUrl(nextSession), '_blank')`.

One helper function, one onClick change. No new dependencies.

