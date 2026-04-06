

## Redesign Activity Ticker — Remove LIVE, Add Real Activity Data, Auto-Swipe Slower

### Changes to `src/components/academy/dashboard/ActivityTicker.tsx`

**1. Remove the "LIVE" indicator** — Delete the green pulsing dot + "LIVE" label and the separator line next to it.

**2. Fetch real user activity from 3 sources** (instead of just wins + lessons):
   - `live_session_attendance` → "{firstName} joined a live call"
   - `journal_entries` → "{firstName} journaled a trade"  
   - `lesson_progress` joined with `academy_lessons` → "{firstName} watched a lesson"
   
   For journal entries and attendance, fetch the user's `display_name` from `profiles` using the `user_id`. Query last 7 days, limit 10 each.

**3. Add a new type** `"journal" | "call" | "lesson"` with appropriate icons (PenLine for journal, Video for call, BookOpen for lesson).

**4. Slow down auto-swipe** — Change interval from 4000ms to 5000ms for a more relaxed pace.

**5. Keep the same luxury dark card styling** — radial gradient, shimmer top edge, dot indicators, crossfade + translateX transition. Just remove the LIVE section.

### Data Fetching Logic

```
// 3 parallel queries:
1. live_session_attendance (last 7d) → get user_id, join profiles for display_name
2. journal_entries (last 7d) → get user_id, join profiles for display_name  
3. lesson_progress + academy_lessons (last 7d, completed=true) → get user_id, lesson title

// Since lesson_progress and journal_entries don't have user names,
// collect all unique user_ids, then batch-fetch first names from profiles table
```

### File

| File | Change |
|------|--------|
| `src/components/academy/dashboard/ActivityTicker.tsx` | Remove LIVE indicator, fetch from 3 real activity tables, slow interval to 5s |

