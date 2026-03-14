

# Plan: Seed 20 Test Trades + Full Trade OS Audit & Fix

## What I Found So Far

### Current State
- User has **4 trades** total, needs 20 more to properly test (and unlock AI Insights at 10+)
- Day state shows "Day complete" (journal entry exists for today)
- Balance: $15,601 (starting $13,783 + $1,818 P/L)
- Both hero and analytics now show $15,601 (formatting fix confirmed working)

### Issues Identified

1. **Console Error**: `Skeleton` component given a ref without `forwardRef` in `AcademyLayout` — cosmetic React warning but should be fixed
2. **Trades/Session & Max Contracts in Budget card** (lines 597, 601) read from `vaultState.max_trades_per_day` and `vaultState.max_contracts_allowed` — a **different source** than `TIER_DEFAULTS`. These should come from the unified tier engine for consistency.
3. **`totalMaxTrades`** (line 186) uses `vaultState.trades_remaining_today + todayTradeCount` — `trades_remaining_today` is from `vault_state` table, not derived from `TIER_DEFAULTS`. Minor inconsistency.
4. **No `screenshot_url` column** in `TradeEntry` interface in `useTradeLog.ts` — screenshots are saved but never displayed in the trade list/review stage.

## Plan

### 1. Seed 20 realistic test trades via database migration
Insert 20 `trade_entries` for the current user spanning the last 2 weeks with varied:
- Symbols (SPY, QQQ, AAPL, TSLA, NVDA, AMZN)
- Outcomes (mix of WIN/LOSS/BREAKEVEN — ~55% win rate)
- Risk amounts ($50–$300 range)
- Compliance (85% followed rules)
- Dates spread across weekdays

This will:
- Push total trades to 24, unlocking AI Insights (10+ gate)
- Populate equity curve with realistic data
- Fill symbol stats and day-of-week breakdowns
- Allow full testing of all 5 stages

### 2. Fix Budget card source-of-truth (Trades/Session + Max Contracts)
In `AcademyTrade.tsx` lines 597 and 601, replace `vaultState.max_trades_per_day` and `vaultState.max_contracts_allowed` with `TIER_DEFAULTS[tier].maxLosingTrades` and `TIER_DEFAULTS[tier].maxContracts` to match the unified tier engine.

### 3. Fix `totalMaxTrades` derivation
Line 186: derive from `TIER_DEFAULTS` instead of `vaultState.trades_remaining_today`.

### 4. Fix Skeleton ref warning
In `AcademyLayout.tsx`, wrap `Skeleton` usage with proper handling (remove ref or use forwardRef).

### Files to Change
1. **Database migration** — INSERT 20 trade entries for the test user
2. **`src/pages/academy/AcademyTrade.tsx`** — Fix budget card source (lines 597, 601, 186)
3. **`src/components/layout/AcademyLayout.tsx`** — Fix Skeleton ref warning

### What to Test After
- All 4 stages render correctly with 24 trades
- AI Insights unlocked and functional
- Equity curve shows full 2-week history
- Symbol breakdown populates correctly
- Day-of-week stats work
- Balance, risk budget, trades used match everywhere
- Session timer flow (set times → trading window → cutoff → close)
- Plan → Log → Review → Insights full lifecycle
- QuickCheckIn saves to journal_entries
- No-Trade Day saves properly
- Export CSV works
- Delete trade works
- Mobile responsive layout

