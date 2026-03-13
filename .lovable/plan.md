

# Trading OS — Trust, Clarity & State-Driven Pass

## 1. Source-of-Truth Map

| Data Point | Source | Location |
|---|---|---|
| **Tracked Balance** | `profiles.account_balance` (starting) + `totalPnl` from `trade_entries` | `useTradeLog()` computes `totalPnl`; `AcademyTrade` loads starting from `profiles` |
| **Risk Budget** | `trackedBalance * TIER_DEFAULTS[tier].riskPercent / 100` | Computed via `detectTier()` + `TIER_DEFAULTS` from `tradePlannerCalc.ts` |
| **Trades Used** | `entries.filter(e => e.trade_date === todayStr).length` | `useTradeLog().entries` filtered client-side |
| **Active Plan** | `approved_plans` table, `status = 'planned'`, today only | `useApprovedPlans()` hook |
| **AI Progress** | `entries.length` (total trades logged) vs thresholds (10, 20, 50) | `useTradeLog().entries.length` |
| **Today P/L** | Sum of `risk_used * risk_reward` for today's entries | `useTradeLog().todayPnl` |

**Fix needed**: The right rail (`OSControlRail`) reads risk from `vaultState.risk_remaining_today / daily_loss_limit` — a **different** source than the planner engine. This will be unified to use the same `trackedBalance + TIER_DEFAULTS` calculation everywhere.

## 2. Session States & Triggers

```text
STATE A: No Plan Yet
  Trigger: !activePlan && todayTradeCount === 0 && todayStatus !== "complete"
  Stage: plan
  Status: "No plan — build one to start"
  CTA: "Build Plan"

STATE B: Plan Approved
  Trigger: activePlan && !sessionTimesSet
  Stage: plan (auto-advance to live when session set)
  Status: "Plan approved — set your session window"
  CTA: "Start Session"

STATE C: Live Session Active
  Trigger: activePlan && sessionTimesSet && todayTradeCount === 0
  Stage: live
  Status: "Session active — execute your plan"
  CTA: "Log Result"

STATE D: Review Pending
  Trigger: todayTradeCount > 0 && todayStatus !== "complete"
  Stage: review
  Status: "Trades logged — complete your review"
  CTA: "Complete Review"

STATE E: Day Complete
  Trigger: todayStatus === "complete"
  Stage: insights
  Status: "Day complete"
  CTA: "View Insights"
```

## 3. Timer/Cutoff Behavior

Already implemented in `SessionSetupCard`. Behavior stays the same:
- **Pre-session**: Blue countdown, "Starts in X"
- **Trading window**: Green, "Cutoff in X" — new entries allowed
- **No new entries**: Amber warning banner, "Mark Executing" button disabled unless override
- **Session closed**: Red warning, auto-suggest "Review your trades"

**Enhancement**: Pass `sessionPhase` into `useSessionStage` so auto-stage can factor in session closed → auto-suggest review.

## 4. CTA Logic by State

Each stage renders **one primary CTA** only:

| State | Primary CTA | Action |
|---|---|---|
| A: No Plan | **Build Plan** | Scroll to planner |
| B: Plan Approved | **Start Session** | Open SessionSetupCard / set stage to live |
| C: Live | **Log Result** | Open LogTradeSheet |
| D: Review Pending | **Complete Review** | Open QuickCheckInSheet |
| E: Day Complete | **View Insights** | Switch to insights stage |

Remove duplicate "Log a Trade" and "Complete your Review" buttons from live stage. Keep "Log Another Trade" as secondary outline in review only.

## 5. Review Flow & Persistence

Current flow already saves to `journal_entries` via `QuickCheckInSheet`. Fields:
1. "What did you do well?" → `what_happened`
2. "What hurt?" → `biggest_mistake`  
3. "Focus for next session" → `lesson`

**Already persisted**: On mount, checks `journal_entries` for today → sets `todayStatus = "complete"`. Survives refresh. NoTradeDaySheet also persists to `journal_entries`.

**Enhancement**: Add "Did you follow rules?" toggle and "Lesson learned" field to QuickCheckInSheet for the 5-step closeout ritual. Keep it fast (30 sec target).

## 6. Files to Change

1. **`src/pages/academy/AcademyTrade.tsx`** — Main refactor:
   - Add `DayState` enum (A-E) derived from data, replacing ad-hoc conditionals
   - Add status line component showing current state text
   - Unify risk budget display across hero, plan stage, and live stage
   - Single primary CTA per stage (remove duplicates)
   - Update stage copy to match spec
   - Pass `sessionPhase` into stage auto-derivation

2. **`src/hooks/useSessionStage.ts`** — Add `sessionPhase` input to auto-stage logic so "Session closed" → auto-suggest review

3. **`src/components/trade-os/OSControlRail.tsx`** — Unify risk display to use `trackedBalance + TIER_DEFAULTS` instead of `vaultState.risk_remaining_today`

4. **`src/components/academy/QuickCheckInSheet.tsx`** — Add "Did you follow rules?" toggle and "Lesson learned" field for 5-step ritual

5. **`src/components/trade-os/OSTabHeader.tsx`** — May need minor CTA label update

**No database changes. No visual redesign. No new tables.**

