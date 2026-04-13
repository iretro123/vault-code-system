

## Transform Daily Check-In Into a Personalized Accountability Ritual

### The Problem
The current check-in is generic — "Followed rules? Trades today?" — same two questions for every user regardless of where they are in their journey. It doesn't drive behavior, doesn't learn them, and doesn't connect them to the platform.

### The New System: "Daily Vault Check-In"

A context-aware check-in that asks **different questions based on the user's real data** — what they've done (or haven't done) that day/week. Each question is a soft accountability nudge that routes them deeper into the platform.

### How It Works

On open, the modal fetches:
- Today's trades (`trade_entries`)
- This week's journal count (`journal_entries`)
- Lessons completed (`lesson_progress`)
- Last live session attended (`live_session_attendance`)
- Next upcoming live session (`live_sessions`)
- Messages posted this week (`academy_messages`)
- Their check-in history (`vault_daily_checklist`)

Then it builds a **personalized question list** (3-5 questions max) from a pool of ~10 possible prompts. Each prompt only appears if relevant:

| Condition | Question | CTA |
|-----------|----------|-----|
| No lesson this week | "Watch a lesson this week? Only takes 15 min." | Yes / Not yet → links to Learn |
| Traded today but no journal | "You traded today. Journal it?" | Yes (opens journal after) |
| No message in community this week | "Anything you learned? Share with the group." | Post Now → links to Trade Floor |
| No live session this month | "Attend a call? Next one is {title} on {date}." | View Schedule → links to Live |
| Has unanswered questions | "Got questions? Ask the chat." | Ask Now → links to Community |
| Broke rules last check-in | "Did you stick to the plan today?" | Yes / No |
| On a streak 3+ | "Day {N}. Keep it going?" | Lock It In |
| New user (< 7 days) | "Set up your trading rules yet?" | Set Rules → links to Rules |

Each question is a **tap-to-answer card** (not a form). Tap "Yes" or the CTA, it checks off with a micro-animation. The whole thing takes 15-30 seconds.

### Persistence & Memory

Add a new table `daily_checkin_responses` to store each question answered:
- `user_id`, `date`, `prompt_key`, `response` (yes/no/skipped), `created_at`

This builds a behavioral profile over time. Future nudges and coach insights can reference patterns (e.g., "You've skipped journaling 4 weeks in a row").

### Completion Screen

After all questions answered, show a **personalized summary**:
- "3/4 habits hit today. Keep building."
- If they said "Not yet" to a lesson → show a direct link: "Watch Lesson {N} →"
- If on a streak → "Day {N} locked in 🔥"

### Visual Design

- Same dark premium modal shell
- Each question is a full-width card with the prompt on the left, tap buttons on the right
- Answered cards collapse with a checkmark and slide up
- Accent colors: blue for info prompts, amber for accountability, emerald for streaks
- Progress dots at the top showing how many questions remain

### Files Changed

| File | Change |
|------|--------|
| `src/components/academy/DailyCheckInModal.tsx` | Full rewrite — context-aware question engine with personalized prompts |
| Migration | New table `daily_checkin_responses` (user_id, date, prompt_key, response, created_at) with RLS |

