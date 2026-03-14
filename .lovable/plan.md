

# Phase 3 — Options Day Trader Optimization

## Problem Summary
The current Trade OS is built like a dashboard but needs to behave like a cockpit instrument during live market hours. An options day trader glancing at Trade OS between chart checks and broker calls needs to see their critical numbers in under 2 seconds and take action in one tap. The current implementation has 3x duplication of key metrics, too many UI elements in the Live stage, and friction points that slow down execution.

## What This Phase Does
Seven targeted changes to eliminate friction, remove duplication, collapse the Live stage into a cockpit-density view, add auto-behaviors, and remember yesterday's session config.

---

## 1. Cockpit-Mode Live Stage

**Problem:** Live stage currently shows 10+ UI elements: StageHeadline (3 lines), SessionSetupCard, End Session button, cutoff banners, active plan card, execution state, trade summary strip, TodaysLimitsSection, review CTA, no-plan block, and session-end CTA. During market hours, a trader needs 5 things max.

**Change:** Collapse the Live stage into a compact cockpit layout:

```text
┌───────────────────────────────────┐
│ SPY Calls · 4ct · Planned        │  ← plan line (1 row)
│ Cutoff in 43:20  ·  2 left       │  ← timer + trades remaining
│ ┌─────────────────────────────┐   │
│ │  Mark Executing / Log Result │   │  ← single CTA
│ └─────────────────────────────┘   │
│ ▸ Session Details                 │  ← collapsible
└───────────────────────────────────┘
```

**File:** `src/pages/academy/AcademyTrade.tsx` (lines 680-823)

- Remove `<StageHeadline stage="live" />` from Live stage
- Move `SessionSetupCard` timer display inline (just the countdown + phase label, not the full card)
- Wrap the following in a collapsible "Session Details" toggle (collapsed by default):
  - Full `SessionSetupCard` (time editing)
  - `TodaysLimitsSection` (line 781)
  - End Session button
- Keep the active plan card but flatten it to one line: `{ticker} {direction} · {contracts}ct · ${entry}` with status badge inline
- Remove the trade summary strip (lines 762-779) — this data is already in the hero card
- Keep cutoff/closed banners but make them dismissible inline (already are)
- Keep the "No Active Plan" block but compress to a single line with two inline buttons

**File:** `src/components/trade-os/SessionSetupCard.tsx`
- Export a new `SessionCountdownLine` component that shows just the phase label + countdown in one row (no card wrapper). The main `SessionSetupCard` still exists for the full setup form.

## 2. Remove Duplicate Data from Right Rail

**Problem:** Risk budget, trade count, active plan, and session timer are all shown in both the main view AND the right rail. On desktop, a trader sees the same numbers twice.

**Change in `src/components/trade-os/OSControlRail.tsx`:**
- Remove the risk budget section (lines 109-117) — already in hero + budget card
- Remove the trade count section (lines 119-128) — already in hero
- Remove the session timer section (lines 132-155) — already in main view
- Keep only: Vault Status dot, Active Plan summary, Day State CTA, and Restrictions
- This reduces the rail from ~175 lines to ~60 lines of actual content

## 3. Auto-Default Session Times from Yesterday

**Problem:** Every day the trader must re-enter start/cutoff/hardClose times. Most options day traders use the same session window daily.

**Change in `src/components/trade-os/SessionSetupCard.tsx`:**
- On mount, check `localStorage` for the previous day's key (`va_session_times_YYYY-MM-DD` for yesterday)
- If found, pre-fill the draft inputs with yesterday's values
- Add a "Same as yesterday" one-tap button that saves immediately (skipping the 3-input form)
- If no yesterday data exists, show the current form as-is

## 4. Auto-Prompt Review After Last Trade

**Problem:** After logging a trade and the session is closed, the trader must manually click "Complete Review." This should be automatic.

**Change in `src/pages/academy/AcademyTrade.tsx`:**
- In `handleTradeSubmit` (line 315), after the existing `setTimeout(() => setShowCheckIn(true), 400)`, add a condition: if `sessionPhase === "Session closed"`, also auto-switch to review stage: `setStage("review")`
- This means after logging a trade during a closed session, the UI automatically transitions to Review AND opens the check-in sheet

## 5. Toast Confirmation After Trade Log

**Problem:** After logging a trade, the sheet closes but there's no visual confirmation the trade saved. The trader glances back and doesn't know if it worked.

**Change in `src/pages/academy/AcademyTrade.tsx`:**
- In `handleTradeSubmit`, after successful `addEntry`, add a toast with the trade details:
  ```ts
  toast({ title: `Trade logged: ${data.symbol}`, description: `${pnlNum >= 0 ? '+' : '-'}$${Math.abs(pnlNum).toFixed(0)} · ${data.resultType}` });
  ```
  (The `addEntry` in `useTradeLog` already shows a generic toast — replace that generic one with this specific one by passing a `silent` option, or just let both show)

Actually, `addEntry` already toasts "Trade logged / Your trade has been recorded." — so we just need to make it more specific. Change `useTradeLog.ts` `addEntry` to accept an optional `toastOverride` or simply make the existing toast more specific by including the symbol from the entry.

**Simpler approach:** Update `useTradeLog.ts` `addEntry` toast to include the symbol and P/L:
```ts
toast({
  title: "Trade logged",
  description: `${entry.symbol || 'Trade'} · ${entry.risk_reward >= 0 ? '+' : '-'}$${Math.abs(entry.risk_reward).toFixed(0)}`,
});
```

## 6. Smart Defaults in Quick Log

**Problem:** "Rules Followed" defaults to empty (must select). Most trades follow rules. "Direction" defaults to empty.

**Change in `src/components/academy/LogTradeSheet.tsx`:**
- Default `planFollowed` to `"Yes"` instead of `""`
- If `prefill?.direction` exists, use it; else default to `"Calls"` (most common for beginners)
- Remember the last-used ticker in `localStorage` (`va_last_ticker`) and pre-fill the symbol field

## 7. Inline AI Insights (Remove Popovers)

**Problem:** The 4 AI insight tiles (Grade, Leak, Edge, Next) each require a click to open a popover, read, then dismiss. That's 4 clicks to see 4 data points.

**Change in `src/pages/academy/AcademyTrade.tsx` (lines 953-1054):**
- Replace the 4 `Popover` components with simple inline cards that always show their content
- Each card shows the label + value + a 1-line description (currently hidden behind popover)
- Remove the `PopoverTrigger`/`PopoverContent` wrappers entirely
- Keep the same 2x2 grid layout but expand each tile to show 2-3 lines instead of requiring a click

---

## Files Changed

| File | Change |
|---|---|
| `src/pages/academy/AcademyTrade.tsx` | Cockpit Live stage, remove trade summary strip, auto-review transition, inline AI insights |
| `src/components/trade-os/OSControlRail.tsx` | Remove duplicated risk/trades/timer sections |
| `src/components/trade-os/SessionSetupCard.tsx` | Export `SessionCountdownLine`, add "Same as yesterday" button, pre-fill from yesterday |
| `src/components/academy/LogTradeSheet.tsx` | Default planFollowed to "Yes", remember last ticker |
| `src/hooks/useTradeLog.ts` | More specific trade-logged toast |

## What Will NOT Change
- Hero card layout, colors, typography — identical
- Tab structure (Plan / Live / Review / Insights) — unchanged
- Plan stage content — unchanged
- VaultTradePlanner — unchanged
- Analytics section below the OS card — unchanged
- Mobile CTA bar — unchanged
- No new routes or screens

