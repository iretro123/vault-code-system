
Goal: make the dashboard activity ticker feel mixed, current, and real instead of repeatedly showing only “joined a live call.”

What’s happening now
- It does update, but only on first load and then from a 5-minute local cache.
- While the page stays open, it does not refresh itself.
- The current dedupe logic keeps the first activity seen per user, and the RPC currently returns grouped unions in a fixed order. That means call activity often “wins” over journal, lesson, or win activity for the same student.
- Result: the bar can look stale and overly biased toward one activity type.

Implementation plan

1. Rework activity selection so it truly mixes activity types
- Keep using real backend activity only.
- Update `get_recent_activity()` so the final result is globally ordered by newest activity instead of effectively grouped by source.
- Return a slightly larger recent pool from each source, then sort all rows by timestamp desc before sending them back.
- Keep sources:
  - joined a live call
  - journaled a trade
  - watched a lesson
  - posted a win

2. Improve the client-side mixing logic
- In `ActivityTicker.tsx`, stop taking the first activity per user from the raw list.
- Build a balanced feed that:
  - keeps max 5 different users
  - prefers variety across activity types when possible
  - falls back gracefully if one type has less data
- This avoids 4–5 entries all feeling like the same event category.

3. Keep it up to date automatically
- Add background refresh in the ticker while the dashboard is open, e.g. every 60–90 seconds.
- Also refresh when the tab becomes visible again.
- Keep the cache, but make it “stale-while-refresh”:
  - show cached items immediately for speed
  - then fetch fresh data in the background
  - replace the ticker when newer activity is found
- This keeps the bar feeling alive without flicker.

4. Preserve the current motion style
- Keep the continuous self-sliding marquee behavior the user liked.
- Do not switch back to a static card or manual carousel.
- Keep the luxury dark look and smooth slower movement.

5. Small copy improvements for realism
- Use consistent short activity copy:
  - “Edward joined a live call”
  - “Mia journaled a trade”
  - “Chris watched a lesson”
  - “Jordan posted a win”
- If needed, optionally tune freshness wording later (“this morning”, “today”), but only if the timestamps support it cleanly.

Files involved
- `supabase/migrations/...`  
  Update `get_recent_activity()` so results are globally sorted and include enough recent rows from each source for better mixing.
- `src/components/academy/dashboard/ActivityTicker.tsx`  
  Add stale-while-refresh behavior, periodic refresh, visibility refresh, and smarter unique-user mixed selection.

Technical notes
- The main bug is not fake data; it’s selection bias:
  - SQL unions are source-grouped
  - client dedupes too early
  - cache blocks frequent refresh
- Best fix pattern:
  1. fetch more real rows
  2. globally sort by recency
  3. mix types on the client
  4. refresh automatically while open

Expected outcome
- The ticker will still move on its own.
- It will show up to 5 real students.
- It will rotate across calls, journals, lessons, and wins instead of mostly showing call activity.
- It will stay fresher while users remain on the dashboard.
