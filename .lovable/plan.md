

# Phase 2 — Simplify the Current Flow

## Overview
Seven changes to make Trade OS easier, faster, and more obvious. No visual redesign — same cards, same layout, same colors.

---

## 1. Today's Budget with Beginner Tooltips (Already Exists — Add Tooltips)

The Budget card at top of Plan stage already exists (lines 578-611). Add `Tooltip` wrappers around each metric label with beginner-friendly copy:

| Metric | Tooltip Text |
|---|---|
| Risk Budget | "The most you should lose today across all trades. Based on your balance and tier." |
| Position Cap | "The max dollar amount you should spend on a single options position." |
| Trades / Session | "How many losing trades you're allowed before the system locks you out for the day." |
| Max Contracts | "The most contracts you can hold in one position based on your risk budget." |

**File:** `src/pages/academy/AcademyTrade.tsx` — wrap existing `<p>` labels in the Budget grid with `<Tooltip>`.

---

## 2. Day State System (Already Exists — No Change Needed)

`useSessionStage` already implements the 5-state system:
- `no_plan` → `plan_approved` → `live_session` → `review_pending` → `day_complete`

With `dayStateStatus` and `dayStateCta` text. The hero card already shows `dayStateStatus`. **No changes needed.**

---

## 3. One Primary CTA Per State (Already Exists — No Change Needed)

`handleQuickAction` (lines 365-376) already maps each `dayState` to a single action. The rail CTA uses `dayStateCta`. **No changes needed.**

---

## 4. Hide Right Rail on Mobile (Already Done)

Line 1040: `<div className="hidden md:block ...">` — already hidden on mobile. **No changes needed.**

---

## 5. Fixed Bottom Mobile CTA Bar

Add a fixed bottom bar on mobile (below the main content, above `MobileNav`) that shows the current `dayStateCta` button. Only shows on mobile when OS layout is active.

**File:** `src/pages/academy/AcademyTrade.tsx` — add before the closing modals section:

```tsx
{isMobile && (
  <div className="fixed bottom-16 left-0 right-0 z-40 px-3 pb-[env(safe-area-inset-bottom,0px)]">
    <Button className="w-full h-11 rounded-xl text-sm font-semibold shadow-lg" onClick={handleQuickAction}>
      {dayStateCta}
    </Button>
  </div>
)}
```

Also add extra bottom padding to the OS layout container to clear the CTA bar: change `pb-6` to `pb-24` on mobile.

---

## 6. Beginner Tooltips for Plan Stage Terms

In addition to the Budget tooltips above, add tooltips to these elements:

**Active Plan card (lines 613-651):**
- Add a small `(?)` tooltip next to "Active Plan" label: "Your approved trade setup. The system checked it fits your risk rules."

**In the planner (`VaultTradePlanner`):**
- "FITS": "This trade stays within your defined risk and contract limits."
- "RECOMMENDED": "The system's suggested size based on your Position Cap and Risk Budget."

These already exist as inline explainers per memory. We'll add `Tooltip` wrappers to the Budget card labels only (the planner already has inline text).

---

## 7. Quick-Log Mode for LogTradeSheet

Add a toggle at top of `LogTradeSheet` that defaults to "Quick" mode showing only 5 fields:
- Symbol
- Direction (Calls/Puts)
- Result (Win/Loss/BE)
- P/L ($)
- Rules Followed (Yes/No)

With an "Add Details" button that expands to show all existing fields (Date, Entry/Exit, Position Size, Target Hit, Stop Respected, Oversized, Setup, Screenshot, Note).

**File:** `src/components/academy/LogTradeSheet.tsx`

Add state: `const [quickMode, setQuickMode] = useState(true);`

Restructure the form body:
```
Quick Mode (default):
  Symbol → Direction → Result → P/L → Rules Followed → [Add Details button]

Full Mode:
  All existing fields as-is
```

The "Add Details" button toggles `quickMode` to false. Title changes to "Quick Log" vs "Log Trade".

Also fix: update position size placeholder from "Contracts / shares" to "Contracts".

---

## 8. Bug Fix: Review Stage P/L Calculation

Line 870 in `AcademyTrade.tsx` uses `e.risk_reward * e.risk_used` directly instead of the backward-compatible `computePnl` function. This must be fixed to use the same logic from `useTradeLog.ts`.

Since `computePnl` is internal to the hook, we need to either:
- Export it from `useTradeLog`, or
- Inline the same logic

Best approach: export `computePnl` from `useTradeLog.ts` and use it in AcademyTrade.

---

## Exact State Logic (Confirmed — No Changes)

```
dayState derivation (useSessionStage):
  todayStatus === "complete"           → day_complete
  todayTradeCount > 0 && !complete     → review_pending
  hasActivePlan && sessionTimesSet     → live_session (or review_pending if session closed)
  hasActivePlan                        → plan_approved
  else                                 → no_plan
```

## Exact CTA Logic (Confirmed — No Changes)

```
no_plan        → "Build Plan"       → scrolls to planner
plan_approved  → "Start Session"    → switches to Live tab
live_session   → "Log Result"       → opens LogTradeSheet
review_pending → "Complete Review"  → opens QuickCheckInSheet
day_complete   → "View Insights"    → switches to Insights tab
```

## Exact Mobile CTA Behavior

- Fixed bar at bottom, 16px above MobileNav
- Full-width button with `dayStateCta` text
- Calls `handleQuickAction` on tap
- Only visible on mobile, only in OS layout mode
- Respects safe-area-inset-bottom

## Files Changed

| File | Change |
|---|---|
| `src/pages/academy/AcademyTrade.tsx` | Add tooltips to Budget metrics, add mobile CTA bar, add bottom padding, fix P/L display on line 870 |
| `src/components/academy/LogTradeSheet.tsx` | Add Quick-Log mode toggle, fix "contracts" placeholder |
| `src/hooks/useTradeLog.ts` | Export `computePnl` function |

## What Will NOT Change
- Page layout, card designs, colors, typography — identical
- Tab structure, sidebar, right rail — unchanged
- No new screens, no new routes
- `useSessionStage` hook — already correct, no changes
- `OSControlRail` — already correct, no changes

