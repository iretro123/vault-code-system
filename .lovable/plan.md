

# Stress Test Results — Trade OS Page Bugs & Leaks

## Bugs Found

### Bug 1: Session Resurrects After Reload (Critical)
`clearSession()` only removes localStorage but **never deletes the DB record** from `trading_sessions`. On next page load, `SessionSetupCard` loads from DB (line 66-90) and restores the session times. The "End Session" button effectively does nothing persistent.

**Fix**: Add a `clearSessionFromDB()` call inside the end session handler that deletes today's `trading_sessions` row. Export a DB-clearing function from `SessionSetupCard` or do it inline in `AcademyTrade.tsx`.

### Bug 2: `planFollowed` Prefill Silently Ignored (Medium)
The review stage passes `planFollowed: "Yes"` or `"No"` in the prefill object, but `LogTradeSheet`'s `PlanPrefill` interface (line 39-45) only has `symbol`, `direction`, `entryPrice`, `positionSize`, `stopPrice`. The `useEffect` at line 123-130 never reads `planFollowed`, so the user's Yes/No answer from the review card is lost — the form always defaults to "Yes".

**Fix**: Add `planFollowed?: string` to the `PlanPrefill` interface and apply it in the prefill `useEffect`.

### Bug 3: No Auto-Advance After Trade Log in Review (Medium)
After user answers Yes/No → logs trade → sheet closes, `handleTradeSubmit` sets `todayStatus("in_progress")`. But the user must then manually click the separate "Complete Review" button to open the `QuickCheckInSheet`, which then finally advances to insights. This breaks the simplified flow promise.

**Fix**: After a trade is logged while in the review stage, auto-open the `QuickCheckInSheet` after a brief delay (e.g., 800ms) so the user doesn't have to hunt for another button.

### Bug 4: Trade Fetch Has No Row Limit (Low Risk, Future)
`useTradeLog.fetchEntries()` does `.select("*")` with no `.limit()`. Supabase defaults to 1000 rows. Power users with 1000+ trades will silently lose older data from metrics. Not urgent but a future data integrity risk.

**Fix**: Add `.limit(2000)` or implement paginated fetching for analytics.

### Bug 5: `LogTradeSheet` Form Not Reset on Review Prefill Change (Low)
When the sheet opens with new prefill data, the `useEffect` (line 123-130) applies symbol/direction/entry/size, but doesn't reset other fields like `exitPrice`, `pnl`, `resultType`, `note`. If user opens the sheet, partially fills it, closes without saving, then re-opens from review — stale data persists.

**Fix**: Call `resetForm()` when `open` transitions from false to true with new prefill.

## Changes

### File: `src/components/trade-os/SessionSetupCard.tsx`
- Export a new `clearSessionFromDB(userId: string)` async function that deletes today's row from `trading_sessions`
- Update `clearSession()` to optionally accept a userId and call the DB delete

### File: `src/components/academy/LogTradeSheet.tsx`
- Add `planFollowed?: string` to `PlanPrefill` interface
- In the prefill `useEffect`, apply `planFollowed` via `setPlanFollowed(prefill.planFollowed)`
- Reset form fields when sheet opens with fresh prefill

### File: `src/pages/academy/AcademyTrade.tsx`
- End Session handler: call `clearSessionFromDB(user.id)` alongside `clearSession()`
- After `handleTradeSubmit` completes while `activeStage === "review"`: auto-open `QuickCheckInSheet` after 800ms delay
- Pass `activeStage` awareness to the submit handler

### File: `src/hooks/useTradeLog.ts`
- Add `.limit(2000)` to the fetchEntries query to prevent silent data truncation

| File | Change |
|------|--------|
| `src/components/trade-os/SessionSetupCard.tsx` | Export DB-clearing function |
| `src/components/academy/LogTradeSheet.tsx` | Fix planFollowed prefill, reset on open |
| `src/pages/academy/AcademyTrade.tsx` | DB session clear, auto-advance review→insights |
| `src/hooks/useTradeLog.ts` | Add row limit safety net |

