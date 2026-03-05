

## Plan: Add Navigation to Gameplan Task Buttons

Currently, clicking an incomplete task only toggles its completion checkbox. Users should be navigated to the relevant page when they click an incomplete task, so they can actually complete the action.

### Changes: `src/components/academy/dashboard/GameplanCard.tsx`

**1. Add a `route` field to each task definition**

| Task ID | Route |
|---|---|
| `foundation-claim-role` | `/academy/start` |
| `foundation-introduce` | `/academy/community` (Trade Floor tab) |
| `foundation-first-lesson` | `/academy/learn` |
| `foundation-risk-rules` | `/academy/settings` (trading prefs) |
| `foundation-starting-balance` | `/academy/settings` |
| `tw-lesson` | `/academy/learn` |
| `tw-trades` | `/academy/trade` |
| `tw-review` | `/academy/progress` |
| `tw-live` | `/academy/live` |
| `consistency-track-trades` | `/academy/trade` |
| `consistency-eod-check` | `/academy/journal` |
| `consistency-study` | `/academy/learn` |
| `consistency-no-trade` | `/academy/trade` |

**2. Update `TaskGroupSection` behavior**

- Incomplete tasks: clicking the row navigates to the task's route via `useNavigate`
- Add a separate small checkbox hit area on the left that toggles completion (so users can still mark done without navigating)
- Completed tasks: clicking does nothing (or untoggle only)

**3. Update the "Next Step" strip**

- The "Complete" button stays as-is (marks done)
- Add a clickable area on the task title that navigates to the route

### Files modified
- `src/components/academy/dashboard/GameplanCard.tsx`

