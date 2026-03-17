

# Trade OS Audit — Real Remaining Bugs (Timezone-Aware)

After reviewing the current code, Bugs 2 and 5 from the previous plan are **already fixed**. Here are the **real remaining issues**, with special attention to your global user base:

---

## Bug 1: Plan Date Uses UTC, Everything Else Uses Local (Real — Affects Global Users)

**File:** `src/hooks/useApprovedPlans.ts` line 49-53

`getTodayStr()` builds the date with `getUTCFullYear()` / `getUTCMonth()` / `getUTCDate()`. But `AcademyTrade.tsx` line 177 uses `format(new Date(), "yyyy-MM-dd")` which returns **local** time.

**Impact:** A user in Tokyo at 8 AM JST (previous day UTC) creates a plan — it's stored with a UTC date filter. When `AcademyTrade` checks today's trades using local date, the plan appears to be from "yesterday." Conversely, a user in LA at 10 PM PST sees their plan disappear because UTC already rolled to the next day.

**Fix:** Change `getTodayStr()` to use `format(new Date(), "yyyy-MM-dd")` (local time), matching how trades and journal entries are dated. This is correct because a "trading day" is the user's local day, not UTC.

---

## Bug 2: "Trades Left" Counter is Misleading (Real — UI Confusion)

**File:** `src/pages/academy/AcademyTrade.tsx` line 684

Shows `{todayTradeCount}/{totalMaxTrades} trades left` where `totalMaxTrades = MAX_LOSSES_PER_DAY = 2`. The label says "left" but the first number goes UP. Also, `MAX_LOSSES_PER_DAY` limits **losing** trades, not all trades — a user can take 5 winning trades.

**Fix:** Change to `{todayTradeCount} trades today` — simple, accurate, no confusion. The max-loss enforcement already happens elsewhere in the vault system.

---

## Bug 3: Missing `onPhaseChange` in useEffect Dependencies (Real — Stale Closure)

**File:** `src/components/trade-os/SessionSetupCard.tsx` line 132-134

```tsx
useEffect(() => {
    onPhaseChange?.(sessionPhase?.label ?? null);
}, [sessionPhase?.label]); // missing onPhaseChange
```

If the parent re-creates the `onPhaseChange` callback, this effect fires with a stale reference. Could cause the parent to miss phase transitions.

**Fix:** Add `onPhaseChange` to the dependency array.

---

## Bug 4: Double Journal Entry on Rapid Click (Real — Data Integrity)

**File:** `src/components/academy/QuickCheckInSheet.tsx`

The `saving` state prevents concurrent clicks, but the auto-advance timer from `AcademyTrade` (line 373-378) could open the sheet while the user also manually clicks "Complete Review." Two inserts to `journal_entries` with the same `user_id + entry_date`.

**Fix:** Before inserting, check if a journal entry already exists for today. If so, skip insert and just call `onComplete()`.

---

## Changes Summary

| File | Change |
|------|--------|
| `src/hooks/useApprovedPlans.ts` | Replace UTC date helper with `format(new Date(), "yyyy-MM-dd")` for local-time consistency |
| `src/pages/academy/AcademyTrade.tsx` | Fix "trades left" label to `{todayTradeCount} trades today` |
| `src/components/trade-os/SessionSetupCard.tsx` | Add `onPhaseChange` to useEffect deps |
| `src/components/academy/QuickCheckInSheet.tsx` | Guard against duplicate journal entries with existence check before insert |

