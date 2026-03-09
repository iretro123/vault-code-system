

## Fix: Keep Hero Card Visible During Live Sessions + Red "Ends In" Timer

### Problem
1. `upcoming` filter on line 244 uses `isPast(session_date)` — once the start time passes, the session is removed from `upcoming`, so the hero card disappears immediately when the session goes live.
2. `SessionTimer` returns `null` after `end` time but has no "ending soon" countdown mode.

### Changes

**1. `src/pages/academy/AcademyLive.tsx`** (line 244)
- Change the filter to include sessions that are **currently in progress** (now < start + duration):
```
const upcoming = sessions.filter(s => {
  const end = new Date(s.session_date).getTime() + s.duration_minutes * 60_000;
  return Date.now() < end && s.status !== "completed";
});
```
- This keeps the hero card showing the current live session until its scheduled end time.

**2. `src/components/academy/live/SessionTimer.tsx`**
- When the session is live (`now >= start && now < end`), add a **second line** showing a red "Ends in" countdown (end - now) alongside the elapsed timer.
- Luxury styling: a subtle red-gradient pill with "ENDS IN Xh Xm Xs" in a refined mono font, matching the premium aesthetic.
- After `end` time, show a muted "Session ended" label instead of returning `null` (so the hero doesn't flicker if there's a brief delay before the next fetch).

**3. Hero card enhancements for live state**
- When `now >= start` for the hero session, upgrade the visual treatment:
  - Change the badge from blue "Next Live Session" to a pulsing red "HAPPENING NOW" label.
  - Add a subtle red border glow to the hero card.
  - "Join Zoom" button gets a red accent to create urgency.

### Result
- Hero card stays visible for the full duration of the live session.
- Users see a luxury red "ends in" countdown so they know how much time is left.
- After the session ends, it naturally transitions out on the next re-render/fetch.

