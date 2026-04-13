

## Fix Daily Check-In: Better Copy, Trade OS Nudge, Error-Free Submit

### Problems to Fix

1. **Journal nudge is wrong** — currently says "You took N trades today. Journal it." but should nudge them to **log trades via Trade OS** if they haven't, not journal. The journal nudge should only appear if they actually traded.
2. **Trade OS nudge missing** — no prompt tells users who haven't logged any trades to start using Trade OS.
3. **Submit can error** — the `vault_daily_checklist` insert can fail with a duplicate key if they already checked in today (from Trade OS or elsewhere). No error handling exists.
4. **Copy needs upgrade** — messages are still generic. Need to feel direct and real.

### Changes (single file: `DailyCheckInModal.tsx`)

**1. Add total trades count (not just today)**
Fetch `approved_plans` total count to know if they've ever used Trade OS.

**2. Rewrite prompt waterfall with better copy:**

| # | Condition | Message | CTA |
|---|-----------|---------|-----|
| 1 | Streak ≥ 3 | "Day {N} streak. Don't break it." | Lock It In |
| 2 | Never logged a trade (0 total) | "You haven't logged a trade yet. Open Trade OS before your next session." | Open Trade OS → `/academy/trade` |
| 3 | No lesson this week | "You haven't watched a lesson this week. 15 min." | Watch Now → `/academy/learn` |
| 4 | Traded today, no journal | "You took {N} trades today but didn't journal. Write it down while it's fresh." | Journal → `/academy/journal` |
| 5 | No community post this week | "Learned something this week? Share it with the group." | Post → `/academy/community` |
| 6 | No live session in 14+ days + next session exists | "Next call: {title} — {date}. Be there." | View Calls → `/academy/live` |
| 7 | Broke rules last time | "Did you follow the plan today?" | Yes / No |
| 8 | New user < 7 days, no lessons | "Set your trading rules before you start." | Set Rules → `/rules` |

**3. Fix submit errors:**
- Use `upsert` instead of `insert` for `vault_daily_checklist` (with `onConflict: 'user_id,date'`)
- Wrap both inserts in try/catch so failures don't crash the UI
- Handle `daily_checkin_responses` duplicates by deleting today's rows first, then inserting fresh

**4. Fetch total trades ever** (add one more query to the parallel batch)

### Files

| File | Change |
|------|--------|
| `src/components/academy/DailyCheckInModal.tsx` | Rewrite prompts, fix submit, add Trade OS nudge |

