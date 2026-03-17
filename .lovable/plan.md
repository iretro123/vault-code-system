

# Fix End Session Flow & Make It Production-Ready

## Problems Identified

1. **"End Session" doesn't end the session** — it opens the trade log sheet and switches stages, but never clears the session times from localStorage or DB. The session timer keeps running.
2. **Log sheet pops up immediately** — clicking End Session opens LogTradeSheet before the user even reaches Review. Should go to Review first, let them answer Yes/No, THEN open the log sheet.
3. **Button too wide on desktop** — full `w-full` with no max-width constraint looks bad on wider viewports.

## Changes

### File: `src/pages/academy/AcademyTrade.tsx`

**End Session button (lines ~917-929):**
- Remove `handleLogWithCutoffCheck` call — stop opening the log sheet immediately
- Add logic to clear session times from localStorage (`localStorage.removeItem(getStorageKey())`)
- Force `setSessionPhase(null)` so the session is officially ended
- Then `setStage("review")` to push user into Review

**Review stage Yes/No buttons (lines ~956-976):**
- "Yes, I followed it" → pre-fill from plan, open log sheet with `planFollowed: "Yes"` and quick mode
- "No, I adjusted" → open log sheet blank (manual entry), `planFollowed: "No"`
- Keep the flow: answer → log → save → auto-advance to insights

**After trade submit (handleTradeSubmit, ~line 366):**
- After successful save, if `todayStatus` becomes complete or trade count > 0, auto-switch to insights after a short delay

**Button width fix:**
- Change the red pill button from `w-full` to `w-full max-w-xs mx-auto` so it caps at ~320px on desktop

### File: `src/components/trade-os/SessionSetupCard.tsx`

- Export the `getStorageKey` function so AcademyTrade can clear session times
- Or add an exported `clearSession()` helper that removes today's key

### Summary of the new flow:

```text
End Session & Review (red pill)
  → clears session timer (localStorage + sets phase to null)
  → navigates to Review stage
  → user sees "Did you follow your plan?" Yes / No
  → Yes: opens LogTradeSheet pre-filled from plan (quick log)
  → No: opens LogTradeSheet blank (manual)
  → after save: auto-advance to Insights
```

| File | Change |
|------|--------|
| `src/pages/academy/AcademyTrade.tsx` | Fix end session logic, review flow, button width |
| `src/components/trade-os/SessionSetupCard.tsx` | Export `clearSession` helper |

