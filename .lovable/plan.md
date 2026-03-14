

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
