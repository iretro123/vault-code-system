

## Content Patch: GameplanCard Task Labels

**Scope:** Replace only the task content arrays inside `GameplanCard.tsx`. No UI, layout, or logic changes. Same sections, same visual style.

### File: `src/components/academy/dashboard/GameplanCard.tsx`

**1. Replace `buildFoundationTasks` (lines 30–51)** with 5 tasks:

| Task | Route |
|------|-------|
| Claim your role | `/academy/start` |
| Introduce yourself in Trading Floor | `/academy/community` |
| Watch first lesson | `/academy/learn` |
| Set your risk rules | `/academy/resources` |
| Set your starting balance | `/academy/trade` |

All keep `done: !!profile?.onboarding_completed` for now (same logic as current).

**2. Replace "This Week" fallback tasks (lines 98–102)** with 4 tasks:

| Task | Route |
|------|-------|
| Complete 1 lesson | `/academy/learn` |
| Log 3 trades this week (or mark no-trade days) | `/academy/trade` |
| Complete weekly review | `/academy/journal` |
| Join 1 live or watch 1 replay | `/academy/live` |

**3. Replace "Consistency" tasks (lines 81–94)** with 4 tasks:

| Task | Route / Action |
|------|----------------|
| Track your trades today | `/academy/trade` |
| Complete end-of-day trade check | checkin action |
| Study 30 minutes today | `/academy/learn` |
| Mark no-trade day (if no setup) | `/academy/trade` |

**4. Replace "Recently Completed" fallback (lines 259–274)** — when `recentDone` from DB is empty, show 3 mock examples instead of nothing:

| Mock task | Mock date |
|-----------|-----------|
| Claim your role | Mar 1 |
| Watch first lesson | Mar 2 |
| Set your risk rules | Mar 3 |

No other changes. Same card shell, progress bar, section headers, expand/collapse, admin button, styling.

