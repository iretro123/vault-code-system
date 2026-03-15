

# Anti-Churn Phase — All 10 Improvements

## Overview
Implement all 10 anti-churn fixes from the audit to strengthen daily retention, trust, and habit formation. No new screens, no redesign, no added visual complexity.

---

## 1. Fix First-Visit Experience
**Problem:** `SetStartingBalanceModal` fires immediately; `GettingStartedBanner` hidden in OS layout once balance is set.
**Fix:**
- In `AcademyTrade.tsx` (line 596): Show `GettingStartedBanner` in OS layout when `!hasData` (regardless of `showMetrics`), so new users with a balance but no trades still see guidance
- The existing 3-step banner already handles the flow well — just needs to be visible in OS layout

## 2. Lower AI Insights Gate: 10 → 3
**Problem:** Insights stage (line 944) gates at `entries.length < 10`; `AIFocusCard` already uses `< 3`.
**Fix:**
- Change line 944 threshold from `10` to `3`
- Update all copy: "10" → "3", progress bar denominator, counter text
- Aligns the stage gate with `AIFocusCard`'s internal gate

## 3. Add Rolling Win Rate + Weekly Compliance
**Problem:** Only all-time metrics shown; they flatten and stop feeling meaningful.
**Fix in `useTradeLog.ts`:**
- Add `last10WinRate`: win rate of most recent 10 entries (or fewer)
- Add `weeklyComplianceRate`: compliance % of entries from last 7 days
- Add `bestStreak`: max consecutive `followed_rules` across all entries
- Return all three from the hook

**Fix in `AcademyTrade.tsx` hero card (around line 562):**
- Add a line: "Last 10: X% win · This week: Y% compliance"

## 4. Decrement Risk Budget After Each Trade Loss
**Problem:** `risk_remaining_today` in `vault_state` never decreases during the day.
**Fix:**
- DB migration: Create RPC `decrement_risk_budget(p_user_id uuid, p_amount numeric)` that atomically sets `risk_remaining_today = GREATEST(0, risk_remaining_today - p_amount)` where `user_id = p_user_id` and `date = CURRENT_DATE`
- In `AcademyTrade.tsx` `handleTradeSubmit` (after `addEntry` succeeds): if `isLoss`, call `supabase.rpc('decrement_risk_budget', { p_user_id: user.id, p_amount: Math.abs(pnlNum) })`

## 5. Add Yesterday's Recap to Hero
**Problem:** No context when opening the app — "what happened yesterday?"
**Fix in `AcademyTrade.tsx` hero card:**
- Compute `yesterdayEntries` from entries where `trade_date === yesterdayStr`
- Add a single `<p>` line below balance: "Yesterday: +$85 · 2 trades" or "No trades yesterday"

## 6. Wire Weekly Review to Actually Work
**Problem:** `WeeklyReviewCard` button does nothing.
**Fix:**
- Update `WeeklyReviewCard` to accept `entries` and `onGenerate` callback
- On click, compute a local weekly summary: total P/L, win rate, best/worst day, compliance % for the last 7 days
- Display the computed summary inline in the card after generation (no AI call needed — pure data summary is more reliable and instant)
- Store the result in component state (no new table needed for v1)

## 7. Add Streak Visualization (14-day dot row)
**Problem:** Streak is just a number — no emotional weight.
**Fix in hero card:**
- Compute a 14-day array: for each of the last 14 calendar days, check if any trades exist and whether all followed rules
- Render as a `<div className="flex gap-1">` with tiny 6px colored circles: green (traded + compliant), amber (traded + broke rule), gray (no trades)
- Show "Best: X days" text using the new `bestStreak` metric from `useTradeLog`

## 8. Add Beginner Insights (Rule-Based, Pre-AI)
**Problem:** Below the AI gate, the Insights tab is a dead end with just a lock icon.
**Fix:**
- In the Insights stage lock section (lines 944-965), below the progress bar, add simple computed stats when `entries.length >= 1 && entries.length < 3`:
  - "Rules followed: X/Y trades"
  - "Most traded: SPY"
  - "Average P/L: $X"
- These are trivially computed from existing `entries` data — no AI needed
- Keeps the lock + progress bar but fills the dead space with real data

## 9. Quick Import (Batch Log) — Simplified
**Problem:** Logging 5 trades = 5 form completions even with "Log Another."
**Fix:**
- This is the heaviest item. For v1, add a "Quick Mode" toggle to `LogTradeSheet` that shows a minimal form: Symbol, Direction (toggle), P/L ($), Rules (Y/N). Four fields, one tap to save + auto "Log Another"
- No new component needed — just a conditional render path inside `LogTradeSheet` when quick mode is active
- The full form remains default; quick mode is opt-in via a toggle in the sheet header

## 10. Personal Best Markers
**Problem:** Balance goes up but there's no celebration.
**Fix in `useTradeLog.ts`:**
- Add `allTimeHigh`: compute the max running balance from `equityCurve`
- Add `isNewATH`: `trackedBalance > allTimeHigh` (computed in `AcademyTrade.tsx`)

**Fix in hero card:**
- When `isNewATH` is true, add a subtle gold border class to the balance number and a small "New Personal Best" badge

---

## Files Changed

| File | Changes |
|---|---|
| **DB migration** | `decrement_risk_budget` RPC function |
| `src/hooks/useTradeLog.ts` | Add `last10WinRate`, `weeklyComplianceRate`, `bestStreak`, `allTimeHigh` |
| `src/pages/academy/AcademyTrade.tsx` | Hero: yesterday recap, rolling stats line, streak dots, ATH badge. Insights gate: 10→3 + beginner stats. GettingStartedBanner in OS layout. Risk decrement after loss. |
| `src/components/trade-os/WeeklyReviewCard.tsx` | Accept entries, compute + display weekly summary on click |
| `src/components/academy/LogTradeSheet.tsx` | Add Quick Mode toggle with minimal 4-field form |

## What Does NOT Change
- No new screens, tabs, or pages
- No UI redesign
- No new tables (RPC only)
- All existing flows and layouts preserved
- Legacy trade data unaffected
- Classic layout untouched

