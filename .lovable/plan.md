## Plan: Trading OS — Trust, Clarity & State-Driven Pass — COMPLETED

### 1. Source of Truth (Unified)
- **Tracked Balance**: `profiles.account_balance` + `totalPnl` from `trade_entries`
- **Risk Budget**: `trackedBalance * TIER_DEFAULTS[tier].riskPercent / 100` — used everywhere (hero, plan, rail)
- **Trades Used**: `trade_entries` filtered by today's date
- **Active Plan**: `approved_plans` with `status = 'planned'`, today only
- **AI Progress**: `entries.length` vs thresholds (10, 20, 50)

### 2. DayState Engine (A–E)
- `useSessionStage` now exports `dayState`, `dayStateStatus`, `dayStateCta`
- States: `no_plan` → `plan_approved` → `live_session` → `review_pending` → `day_complete`
- Session closed auto-suggests review via `sessionPhase` input

### 3. OSControlRail Unified
- Now uses `trackedBalance + TIER_DEFAULTS` instead of `vaultState.risk_remaining_today`
- Shows `dayStateStatus` text and `dayStateCta` button
- Log Result only shows in `live_session` state

### 4. QuickCheckInSheet Enhanced
- 5-step closeout: Rules toggle → What went well → Biggest mistake → Lesson learned → Submit
- All fields save to `journal_entries`

### 5. CTA Logic
- Hero shows state-driven status line
- Each stage has single primary CTA driven by `dayState`
- "Start Session" replaces "Go to Live Mode"
- "Complete Review" replaces "Complete Check-In" / "Complete your Review"

## Phase 2 — Simplify the Current Flow — COMPLETED

### 1. Budget Tooltips
- Added beginner-friendly tooltips (with ?) to all 4 budget metrics: Risk Budget, Position Cap, Trades/Session, Max Contracts
- Wrapped in TooltipProvider for consistent delay

### 2. Mobile CTA Bar
- Fixed bottom bar on mobile showing `dayStateCta` button
- Positioned above MobileNav (bottom-16), respects safe-area-inset-bottom
- Calls `handleQuickAction` for state-driven action

### 3. Quick-Log Mode
- LogTradeSheet defaults to Quick mode: Symbol, Direction, Result, P/L, Rules Followed
- "Add Details" expands to full mode with Date, Entry/Exit, Position Size, Accountability, Setup, Screenshot, Note
- Toggle between Quick Mode / Full Mode in header
- Fixed "Contracts / shares" → "Contracts" placeholder

### 4. P/L Calculation Fix
- Exported `computePnl` from `useTradeLog.ts` as standalone function
- Review stage trade list now uses `computePnl(e)` instead of `e.risk_reward * e.risk_used`
- Backward-compatible with legacy ±1 format entries

## Phase 3 — Options Day Trader Optimization — COMPLETED

### 1. Cockpit-Mode Live Stage
- Removed StageHeadline from Live stage, removed trade summary strip (duplicate of hero data)
- Active plan shows as single-row cockpit: ticker + direction + contracts + status badge
- SessionCountdownLine component shows inline timer + trades remaining
- TodaysLimitsSection, SessionSetupCard, End Session moved behind collapsible "Session Details"
- No-plan state compressed to single row with Plan + Log buttons

### 2. OSControlRail De-duplicated
- Removed risk budget, trade count, and session timer sections (already in hero + main view)
- Rail now shows only: Vault Status, Active Plan summary, Restrictions, Day State CTA

### 3. Auto-Default Session Times
- Pre-fills draft from yesterday's localStorage key (`va_session_times_YYYY-MM-DD`)
- "Same as yesterday" one-tap button saves and starts session immediately

### 4. Auto-Review After Session Close
- `handleTradeSubmit` auto-transitions to review stage + opens check-in when `sessionPhase === "Session closed"`

### 5. Specific Trade Toast
- `useTradeLog.addEntry` toast now shows symbol + signed P/L instead of generic message

### 6. Smart Log Defaults
- `planFollowed` already defaults to "Yes"
- Last-used ticker remembered in `localStorage` (`va_last_ticker`) and pre-filled

### 7. Inline AI Insights
- Replaced 4 Popover components with always-visible inline cards (Grade, Leak, Edge, Next)
- 2×2 grid, each card shows label + value + description without clicking

## Anti-Churn Phase — All 10 Improvements — COMPLETED

### 1. Fix First-Visit Experience ✅
- `GettingStartedBanner` now shows whenever `!hasData`, regardless of `showMetrics` flag
- New users with balance set but no trades still see the 3-step guidance

### 2. Lower AI Insights Gate: 10 → 3 ✅
- Insights stage gate changed from `entries.length < 10` to `< 3`
- All copy updated: progress bar, counter text, denominator

### 3. Add Rolling Win Rate + Weekly Compliance ✅
- `useTradeLog` now exports `last10WinRate`, `weeklyComplianceRate`, `bestStreak`, `allTimeHigh`
- Hero card shows "Last 10: X% win · Week: Y% compliance" inline

### 4. Decrement Risk Budget After Each Trade Loss ✅
- Created `decrement_risk_budget` RPC (SECURITY DEFINER, atomic GREATEST(0, ...))
- Called in `handleTradeSubmit` after loss trades

### 5. Add Yesterday's Recap to Hero ✅
- Hero card shows "Yesterday: +$85 · 2 trades" or "No trades yesterday"

### 6. Wire Weekly Review to Actually Work ✅
- `WeeklyReviewCard` now accepts `entries`, computes weekly summary on click
- Shows total P/L, win rate, compliance %, green/red days, best/worst day

### 7. Add Streak Visualization (14-day dot row) ✅
- 14 colored dots in hero: green (compliant), amber (broke rule), gray (no trades)
- Shows "Best: Xd" streak count

### 8. Add Beginner Insights (Rule-Based, Pre-AI) ✅
- Below the lock, when 1-2 trades exist: shows rules followed, most traded symbol, avg P/L
- Fills the dead space with real data before AI unlocks

### 9. Quick Import (Batch Log) ✅
- `LogTradeSheet` already has Quick Mode with 5-field form + "Log Another" flow
- No changes needed — was already implemented in Phase 2

### 10. Personal Best Markers ✅
- `allTimeHigh` computed from equity curve
- Gold "★ New Personal Best" badge appears in hero when balance ≥ ATH

## Email Alerts + Balance Adjustments — IN PROGRESS

### Feature 1: Email Channel for Broadcasts ✅
- Added `preferred_alert_channel` column to `user_preferences` (values: `in_app`, `email`, `both`)
- Settings → Notifications: New "Alert Channel" picker (In-App Only / Email Only / Both)
- Admin Broadcast tab: Added "Email" channel alongside In-App and SMS
- `send-broadcast-email` edge function: preference-aware filtering (checks `notifications_enabled`, category toggles, and `preferred_alert_channel`)
- ⚠️ **Email domain not yet configured** — emails are logged but not sent until domain setup is complete

### Feature 2: Balance Adjustments (Deposit/Withdrawal Tracking) ✅
- Created `balance_adjustments` table with RLS (users CRUD own rows)
- `useBalanceAdjustments` hook: fetches, adds, removes adjustments; computes `totalAdjustments`
- Updated balance formula: `Live Balance = starting_balance + totalAdjustments + totalPnl`
- Replaced `TrackedBalanceCard` with `BalanceAdjustmentCard`: Add Funds (+) / Withdraw (−) buttons
- Collapsible adjustment history with delete capability
- Equity curve baseline updated to `startingBalance + totalAdjustments`
- Trade stats (win rate, P/L) remain purely based on `trade_entries` — unaffected by deposits/withdrawals
