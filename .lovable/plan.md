

## Personalized Accountability Nudge System

### The Idea

Replace the static status line in the HeroHeader and add a new **Accountability Nudge Card** below the HeroHeader that delivers a *different, personal message to every user based on their real data*. Not generic motivational fluff — their actual behavior reflected back at them.

The nudge card cycles through a prioritized list of real behavioral observations. Each user sees something different because each user's data is different. Examples of what different users would see:

- **User who hasn't posted a win yet**: "You've logged 6 trades but haven't shared a win yet. Post one — your progress inspires others."
- **User who hasn't attended a live session**: "You've been here 3 weeks and haven't joined a live session. The next one is Thursday."
- **User who trades but doesn't journal**: "You traded 4 times this week but journaled 0. The journal is where the edge is built."
- **User who watches lessons but doesn't trade**: "You've completed 8 lessons. Time to apply — log your first trade."
- **User on a streak**: "11-day check-in streak. Top 5% of the academy. Don't break it."
- **User who's been inactive 3+ days**: "Last check-in was 4 days ago. Your streak reset. Start a new one today."
- **User who completed everything today**: "All caught up today. Come back tomorrow to keep building."

### How It Works

A new component `PersonalNudgeCard.tsx` runs one parallel query batch on mount and walks a priority waterfall to pick the single most relevant nudge for that user. Each nudge has:
- An **icon** (contextual — not generic)
- A **message** (short, direct, uses real numbers from their data)
- A **CTA button** that routes them to the right page
- A **dismiss** option (stores in localStorage so the same nudge doesn't repeat that day)

**Priority waterfall (first match wins):**

1. **Inactive 3+ days** → "You've been away {N} days. Your streak reset. Let's restart." → CTA: Check In
2. **Traded today, no journal** → "You traded {N} times today but haven't journaled. Don't lose the insight." → CTA: Open Journal  
3. **No check-in today** → "You haven't checked in today. 30 seconds to stay accountable." → CTA: Check In
4. **No wins posted ever** (but has 3+ trades) → "You've logged {N} trades but haven't shared a win yet. Post one." → CTA: Share Win
5. **Lessons watched but no trades** (5+ lessons, 0 trades) → "You've watched {N} lessons. Time to apply — log your first trade." → CTA: Log Trade
6. **No live session attended** (member 14+ days) → "You've been here {N} weeks and haven't joined a live session yet." → CTA: Go to Live
7. **Weekly review due** (Friday-Sunday, no journal this week) → "End of week. Write 1 journal entry before Monday." → CTA: Start Review
8. **On a streak (3+ days)** → "{N}-day check-in streak. Keep building." → No CTA (positive reinforcement)
9. **All caught up** → "You're on track today. Come back tomorrow." → No CTA

### Also: Enhance the HeroHeader Status Line

The existing `resolveStatus()` function in HeroHeader already does something similar but is limited. We'll expand it to pull the same data and show a **complementary** one-liner (not duplicate the nudge card). The status line stays contextual ("Live session at 2pm") while the nudge card is behavioral ("You haven't journaled this week").

### Data Sources (all existing — no new tables)

| Data | Table | What it tells us |
|------|-------|-----------------|
| Check-in streak | `vault_daily_checklist` | Days since last check-in, streak length |
| Trade count | `trade_entries` | How many trades today/this week |
| Journal count | `journal_entries` | Whether they reflect on trades |
| Lesson progress | `lesson_progress` | How many lessons completed |
| Wins posted | `academy_messages` (room: wins-proof) | Whether they've shared wins |
| Live attendance | `live_session_attendance` or `activity_log` | Whether they've joined lives |
| Member tenure | `profiles.created_at` | How long they've been a member |

### Design

- Luxury dark card with a colored left accent bar (amber for warnings, emerald for positive, blue for info)
- Single line of text + CTA button on the right
- Subtle entrance animation (fade + slide up)
- Dismissible per-day (X button, localStorage key with today's date)
- Sits between HeroHeader and ActivityTicker on the dashboard

### Files

| File | Change |
|------|--------|
| `src/components/academy/dashboard/PersonalNudgeCard.tsx` | **New** — Behavioral nudge with priority waterfall |
| `src/pages/academy/AcademyHome.tsx` | Insert `PersonalNudgeCard` between HeroHeader and ActivityTicker |

