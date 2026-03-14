

# Phase 1 — Trust Blockers (Options Contracts Focus)

All references to "shares" will use "contracts" terminology throughout. The product is built for options day traders.

## Changes

### 1. Fix P/L Storage — Store Real Dollar P/L
**File:** `src/pages/academy/AcademyTrade.tsx` (lines 285-287)
**File:** `src/hooks/useTradeLog.ts` (line 124)

Currently stores `risk_reward: ±1` and `risk_used: abs(pnl)`. This loses actual risk/reward ratio data.

**Fix:** Store signed dollar P/L directly in `risk_reward`, keep `risk_used` as `abs(pnl)`:
```ts
// AcademyTrade.tsx handleTradeSubmit
risk_used: Math.abs(pnlNum),
risk_reward: pnlNum,  // actual signed P/L (was ±1)
```

Update `computePnl` to handle both old ±1 entries and new direct-dollar entries:
```ts
// useTradeLog.ts
const computePnl = (e: TradeEntry) =>
  Math.abs(e.risk_reward) <= 1
    ? e.risk_reward * e.risk_used   // legacy ±1 format
    : e.risk_reward;                 // new direct dollar format
```

Also update `allTimeWinRate` filter: old entries use `risk_reward > 0`, new entries also `> 0` — no change needed there.

### 2. Trade Logging Validation
**File:** `src/components/academy/LogTradeSheet.tsx`

Add validation before submit:
- P/L must be a valid non-empty number (either auto-calculated or manual override)
- If result is "Win", P/L must be > 0; if "Loss", P/L must be < 0 — show inline error
- Show red error text below P/L field when mismatched
- Disable Save button until validation passes

### 3. Balance Floor Guard
**File:** `src/pages/academy/AcademyTrade.tsx` (line 140)

```ts
const trackedBalance = useMemo(() => {
  if (startingBalance === null) return null;
  return Math.max(0, startingBalance + totalPnl);
}, [startingBalance, totalPnl]);
```

No visual change — just prevents negative balance from breaking tier detection and risk metrics.

### 4. AI Auth Race Condition Fix
**File:** `src/components/trade-os/AIFocusCard.tsx` (lines 78-96)

Remove the triple-retry auth loop. Trust the `accessToken` prop passed from `AcademyTrade.tsx`. If no token available, show a "Sign in to view" message instead of silently retrying.

```ts
if (!token) {
  setError("Sign in to view AI analysis");
  return;
}
```

### 5. AI Cache Persistence to DB
**File:** `src/components/trade-os/AIFocusCard.tsx`
**Migration:** Add `ai_focus_cache jsonb` column to `profiles` table

After fetching AI results, persist to `profiles.ai_focus_cache`. On load, check DB first (if localStorage miss), then fetch fresh if stale. This survives cache clears and works cross-device.

## What Will NOT Change
- Page layout, card designs, colors, typography — all identical
- Tab structure (Plan / Live / Review / Insights) — unchanged
- Sidebar, right rail, mobile nav — unchanged
- No new screens or flows added

## User-Facing Behavior Changes
- Trade logging requires valid P/L before submit (inline red error if missing/mismatched)
- All P/L references use "contracts" not "shares" in LogTradeSheet auto-calc hint
- Balance displays $0 floor instead of negative values
- AI insights persist across devices and browser clears
- AI card never shows auth errors from race conditions

## Files Changed
| File | Change |
|---|---|
| `src/pages/academy/AcademyTrade.tsx` | P/L storage fix, balance floor |
| `src/hooks/useTradeLog.ts` | Backward-compatible `computePnl` |
| `src/components/academy/LogTradeSheet.tsx` | Validation + contracts terminology |
| `src/components/trade-os/AIFocusCard.tsx` | Auth fix, DB persistence |
| DB migration | Add `ai_focus_cache jsonb` to `profiles` |

