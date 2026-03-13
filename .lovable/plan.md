

# Replace Journal with Attendance in "Your Week" Ring

## What changes

In `src/components/academy/community/CockpitPanel.tsx`, the `YourWeekCard` component:

1. **Replace Journal ring with Attendance** — Query `live_session_attendance` table for the current week (Monday–Sunday) to get the user's attendance count. Also query `live_sessions` for total sessions scheduled this week to use as the goal/max.

2. **Fix Trades ring** — Already using real data from `useTradeLog()`, just ensure the goal is reasonable (keep `TRADE_GOAL = 5`).

3. **Fix Playbook ring** — Already using `usePlaybookProgress()` which returns `pct`. Currently doing `Math.round(playbookPct / 10)` with max 10 which is correct (pct is 0-100, ring shows percentage). Keep as-is.

4. **Remove journal-related code** — Remove the `journalCount` state, the journal query, and the streak calculation (since streak was based on journal entries).

5. **Update labels** — Change "Journal" to "Attendance" under the middle ring.

### File: `src/components/academy/community/CockpitPanel.tsx`

**YourWeekCard changes:**
- Remove `journalCount` state and the `useEffect` that queries `journal_entries`
- Add `attendanceCount` and `sessionsThisWeek` state
- New `useEffect`: query `live_session_attendance` with `user_id` filter and `clicked_at >= monday`, and query `live_sessions` for sessions this week to get the denominator
- Middle ring: `<ProgressRing value={attendanceCount} max={Math.max(sessionsThisWeek, 1)} />` with label "Attendance"
- Keep streak logic but base it on attendance dates instead (or remove streak since it was journal-based — simpler to remove)

**Ring data sources:**
- **Trades**: `useTradeLog().entries` filtered to current week → real data
- **Attendance**: `live_session_attendance` table filtered to current week → real data, max = number of `live_sessions` scheduled this week
- **Playbook**: `usePlaybookProgress().pct` → already real data (completedCount/totalCount from `playbook_progress`)

