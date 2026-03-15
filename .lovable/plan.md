

# Stress Test & Bug Fix Plan: Trade OS Full Audit

## Critical Bug Found

**`RecentTradesSection.tsx` uses wrong P/L formula** (lines 48 and 126). It calculates `e.risk_reward * e.risk_used` directly instead of using the backward-compatible `computePnl()` function from `useTradeLog.ts`. 

Since new trades store the signed dollar P/L directly in `risk_reward` (e.g., -45), and `risk_used` is set to `Math.abs(pnlNum)` (e.g., 45), the compact view shows `-45 * 45 = -$2,025` instead of the correct `-$45`. This is a **data display corruption bug** that makes the entire trade journal unreliable.

The same bug exists in the test file `tradeLogCalc.test.ts` which doesn't account for the new `outcome`-based format.

## Stress Test: Seed 10 Losing Trades

Create a dev-only seed script (edge function) that inserts 10 realistic losing trades across recent days to validate:
- Equity curve renders a clear downtrend without chart bugs
- HUD metrics (win rate, compliance, streak, P/L) calculate correctly under heavy loss pressure
- Weekly Review card shows accurate red-day counts and worst-day detection
- AI Performance Intelligence fires with correct data (risk grade should be D or F)
- Session stage lifecycle handles the "review pending" state after bulk entries
- Vault limits and risk budget decrease correctly as losses accumulate
- Symbol breakdown shows per-ticker loss stats accurately

## Changes

### 1. Fix P/L calculation bug in `RecentTradesSection.tsx`
- Import `computePnl` from `useTradeLog`
- Replace `e.risk_reward * e.risk_used` on line 48 with `computePnl(e)`
- Replace `e.risk_reward * e.risk_used` on line 126 with `computePnl(e)`

### 2. Fix test file `tradeLogCalc.test.ts`
- Update the test's `computePnl` to match the real backward-compatible version that checks for `outcome`

### 3. Create stress-test seed data
Add a temporary dev button (behind admin check) on the Trade OS page that inserts 10 losing trades via direct Supabase insert:

```
Trades to seed (spread across last 5 days):
1. SPY Puts  -$85  (broke rules, oversized)
2. AAPL Calls -$45  (followed rules)
3. TSLA Calls -$120 (broke rules, revenge trade)
4. QQQ Puts  -$60  (followed rules)
5. NVDA Calls -$95  (broke rules)
6. SPY Calls  -$35  (followed rules)
7. AMD Puts   -$70  (broke rules, oversized)
8. META Calls -$55  (followed rules)
9. SPY Puts   -$110 (broke rules, revenge sizing)
10. MSFT Calls -$40  (followed rules)

Total: -$715 in losses
Rules broken: 5/10 (50% compliance)
Symbols: 7 unique tickers
```

This will stress:
- Equity curve showing steep decline
- Win rate dropping to 0% for these entries
- Compliance at 50%
- Risk grade should degrade
- Multiple symbols in breakdown
- Multiple red days in weekly review

### 4. Minor UX hardening
- Ensure negative equity curve uses red gradient (already handled, but verify)
- Verify `computePnl` is used consistently everywhere P/L is displayed

## Technical Details

The `computePnl` function handles two data formats:
```typescript
// New format: outcome field exists, risk_reward = direct signed dollar P/L
// Legacy format: no outcome field, risk_reward = ±1/0 multiplier × risk_used
export const computePnl = (e: TradeEntry) =>
  e.outcome
    ? e.risk_reward                  // new: direct dollar P/L
    : e.risk_reward * e.risk_used;   // legacy multiplier
```

The bug in `RecentTradesSection` always uses the legacy formula, so every new-format trade shows an inflated/wrong P/L. This is the most critical fix.

