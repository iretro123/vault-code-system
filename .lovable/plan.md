

## Elevate "My Trades" to a Premium Trading Command Center

### Current State
The My Trades page is functional but basic: simple glass cards, flat stat blocks, a working AI focus card, and a linear trade journal list. Balance tracking works but the P/L calculation has a bug (it uses `risk_reward * risk_used * (followed_rules ? 1 : -1)` which incorrectly ties P/L sign to rule-following instead of win/loss). The `trade_entries` table already has `symbol`, `outcome`, `instrument_type`, `risk_used` (stores absolute P/L), and `risk_reward` (stores 1/-1/0 for win/loss/breakeven).

### What This Overhaul Delivers

**1. Fix the Balance Tracking Math (Critical)**
- Current `trackedBalance` formula is wrong: `risk_reward * risk_used * (followed_rules ? 1 : -1)`. This means a winning trade where rules weren't followed shows as negative P/L.
- Fix: `risk_reward * risk_used` (risk_reward is already +1/-1/0, risk_used is absolute P/L). Remove `followed_rules` from balance math entirely.

**2. Premium HUD Strip (Top of Page)**
Replace the plain "Today's Trade Check" with a cinematic stats HUD across the top:
- **Account Balance** (large, primary accent, live-updating)
- **Today's P/L** (green/red with direction arrow)
- **Win Rate** (all-time + this week)
- **Total Trades Logged**
- **Rule Compliance %** (all-time)
- **Current Streak** (consecutive rule-following days)
- Styled with glassmorphism, subtle animated gradient borders, tabular-nums typography

**3. Equity Curve Chart**
- Add a Recharts `AreaChart` showing cumulative balance over time
- X-axis: trade dates, Y-axis: running balance
- Gradient fill (green when above starting balance, red when below)
- Shows the user's account trajectory at a glance
- Data derived from entries array sorted by date + starting balance

**4. Enhanced Trade Journal Cards**
Each trade card gets richer detail display:
- Symbol + direction badge (Calls/Puts)
- Entry/exit prices parsed from notes (already stored there)
- Setup type badge
- Accountability indicators (target hit, stop respected, plan followed, oversized) as small icon badges
- Keep immutable — no delete, no edit

**5. Performance Breakdown Section**
New card between AI Focus and Trade Journal:
- **By Symbol**: top traded symbols with win rate per symbol
- **By Setup**: performance per setup type
- **By Day of Week**: which days perform best
- All computed client-side from entries array

**6. AI Focus Card Enhancements**
- Add a "trades analyzed" count badge
- Show when analysis was last generated
- Keep the existing edge function and caching logic
- Add subtle entry animation when scrolled into view

**7. Streak & Compliance Tracker**
- Visual streak counter: consecutive days with all trades following rules
- Compliance ring (circular progress) showing % of trades with rules followed
- Resets visually (not data) when a violation occurs

### Files to Change

**`src/pages/academy/AcademyTrade.tsx`** — Major rewrite of all sub-components:
- New `PerformanceHUD` component replacing the simple stat cards
- New `EquityCurveCard` using Recharts
- New `PerformanceBreakdownCard` with symbol/setup/day analysis
- Enhanced `RecentTradesSection` with richer card design
- Fixed balance math throughout
- Reordered layout: HUD → Equity Curve → AI Focus → Performance Breakdown → Trade Journal → Weekly Review

**`src/hooks/useTradeLog.ts`** — Add computed metrics:
- `allTimeWinRate`, `complianceRate`, `currentStreak`, `todayPnl`, `equityCurve` (array of {date, balance} for charting)
- Keep existing API, extend return value

**`src/components/academy/LogTradeSheet.tsx`** — No structural changes needed, already comprehensive

**No database changes needed** — all new metrics are computed from existing `trade_entries` data.

### Layout Order (Top to Bottom)
1. PageHeader with "Log Trade" button
2. Getting Started Banner (only for new users)
3. **Performance HUD** (balance, today P/L, win rate, trades, compliance, streak)
4. **Equity Curve** (Recharts area chart)
5. Today's Trade Check (streamlined)
6. **AI Mentor Analysis** (existing, enhanced styling)
7. **Performance Breakdown** (by symbol, setup, day)
8. **Trade Journal** (enhanced cards)
9. Weekly Review + Balance Check (existing)

### Design Language
- Consistent with existing vault-glass-card system
- Animated gradient borders on key cards (HUD, equity curve, AI focus)
- Tabular-nums for all numerical values
- Primary blue accent for positive metrics, emerald for wins, red for losses, amber for breakeven
- No full-screen blur filters (per performance architecture)

