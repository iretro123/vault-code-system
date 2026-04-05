

## Fix: Week Schedule Sheet — Mobile Position, Date Filtering, Week Swiping & Sound

### Problems
1. **Mobile position**: Sheet sits too low, clipped by iPhone/Android nav bars — needs to match desktop centered approach
2. **Old sessions showing**: No date filtering — past/completed sessions from previous weeks still appear
3. **No week navigation**: Users can only see the current week, no way to peek at next week
4. **No swipe sound**: Missing the tactile iOS feedback when switching days/weeks

### Fix

**`src/components/academy/live/WeekScheduleSheet.tsx`** — full rework

**Mobile position fix:**
- Change mobile `max-h-[80vh]` to `max-h-[70vh]` and add `bottom-[env(safe-area-inset-bottom,20px)]` so it floats above the home bar
- Match desktop: use the same centered modal approach on mobile too — `rounded-2xl`, proper inset, no full-width bottom sheet

**Filter only today + future sessions:**
- In `daySessions` filter, add check: only show sessions where `session_date >= start of today` (skip past sessions entirely)
- Exception: if viewing a past day in the current week strip, show "No sessions" empty state

**Week swiping (Week 1 / Week 2):**
- Add `weekOffset` state (0 = this week, 1 = next week)
- Compute `weekStart` as `startOfWeek(now) + weekOffset * 7 days`
- Add left/right chevron buttons flanking a "This Week" / "Next Week" label above the day strip
- Support touch swipe gesture on the day strip area: swipe left → next week, swipe right → previous week (clamped to 0–1)
- Reset `selectedDay` to 0 (Monday) when switching weeks, unless it's the current week where it defaults to today

**iOS swipe sound:**
- Import `playCheckSound` from `nativeFeedback.ts` (already has the clean tone system)
- Add a new `playSwipeSound` function: a single short 880Hz tone (15ms, gain 0.015) — subtle, clean, iOS-like tick
- Fire on week change and day tap

### Files Changed
- `src/components/academy/live/WeekScheduleSheet.tsx`
- `src/lib/nativeFeedback.ts` (add `playSwipeSound`)

