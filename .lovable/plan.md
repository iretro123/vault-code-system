

# Fix: Delete Old Test Trades, Keep Real Losses, Show Accurate Balance

## The Problem

Your account currently has **29 trades** — 24 old seeded test trades (+$5,214 in fake wins) and your 5 real intentional losses (-$2,050). The fake wins are masking your losses, making the balance go UP instead of DOWN.

**Current state:**
- Starting balance: $13,782
- Total P/L: +$2,014 (fake wins + real losses)
- Tracked balance: ~$15,796 (wrong — should be going DOWN)

## The Fix

### 1. Delete the 24 old test trades from the database
Keep only the 5 real losses you intentionally logged (SPY -$450, TSLA -$300, AAPL -$200, QQQ -$100, NVDA -$1,000). These are the ones created at `2026-03-15 15:57:48`.

After deletion:
- Total P/L: **-$2,050**
- Tracked balance: **$13,782 - $2,050 = $11,732**

### 2. Clear the AI cache
Null out `ai_focus_cache` in profiles so the AI Performance Intelligence rescans with only real data.

### 3. Bump the localStorage cache-bust version
Change `va_cache_bust_v2` → `va_cache_bust_v3` in `AcademyTrade.tsx` to force all clients to clear stale cached trade data on next load.

### 4. Remove the seed button
The "Seed 10 Losses" dev button in `AcademyTrade.tsx` is no longer needed. Remove it — this is a real app now, not a test environment.

## Result After Fix
- **5 trades total** — all real losses
- **Balance: $11,732** — accurately reflecting -$2,050 drawdown
- **Win rate: 0%** — correct
- **Compliance: 40%** (2/5 followed rules)
- **Equity curve**: clean downward slope
- **AI insights**: will rescan and show real loss patterns
- **All numbers are permanent and real** — no test data, no fake numbers

