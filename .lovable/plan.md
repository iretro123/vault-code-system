

# Plan: VAULT Trading OS — Premium Restructure of /academy/trade

## Visual Direction from Mockup

The mockup shows a **Robinhood-inspired premium trading dashboard** with these key design elements:
- Large greeting header with status line ("Plan approved · 42 min left to trade")
- Compact horizontal metrics strip (Balance, Today P/L, Trades, Risk Left, Streak) with a prominent "+ Log Trade" CTA
- Central hero OS card with **tab-based navigation** (Plan / Live / Review / Insights) instead of a vertical accordion
- Session window countdown ("42 min left") as a premium clock widget
- Active Plan banner below the hero card
- Lower analytics row: Recent Trades, Equity Curve, AI Coach — all quieter
- Mobile: native iOS feel with large balance, compact tab bar, single dominant CTA

## What to Improve from the Mockup

1. **Don't add a stock chart** — VAULT is not a charting app; TradingView handles that. The "Live" tab chart in the mockup should show the equity curve or session status instead
2. **Keep FlowSection accordion** as an alternative to tabs for better mobile vertical scrolling — but restyle to feel tab-like at the top
3. **Don't add ticker price feeds** — out of scope, adds complexity and latency
4. **Active Plan bar** should live inside the hero card, not floating below it
5. **AI Coach** snippet in lower section is good — but should pull from existing AIFocusCard data, not a separate widget

## Implementation Strategy

**Phase 1 only** — non-destructive UI restructure. No DB changes. Feature flag controlled.

### Step 1: Preserve Classic Layout

Rename current inline render to a preserved `AcademyTradeClassic` component inside the same file or a new file. The feature flag `trade-os` (added to `feature_flags` table) switches between layouts.

### Step 2: Extract 10 Inline Components

Move each existing inline function component out of `AcademyTrade.tsx` into `src/components/trade-os/` with **zero logic changes** — just add imports:

| Component | Source Lines | New File |
|---|---|---|
| `SectionLabel` | 362-369 | `trade-os/SectionLabel.tsx` |
| `PerformanceHUD` | 374-446 | `trade-os/PerformanceHUD.tsx` |
| `EquityCurveCard` | 451-505 | `trade-os/EquityCurveCard.tsx` |
| `PerformanceBreakdownCard` | 510-587 | `trade-os/PerformanceBreakdownCard.tsx` |
| `GettingStartedBanner` | 592-629 | `trade-os/GettingStartedBanner.tsx` |
| `TodayVaultCheckCard` | 634-750 | `trade-os/TodayVaultCheckCard.tsx` |
| `AIFocusCard` + helpers (760-1313) | 755-1313 | `trade-os/AIFocusCard.tsx` |
| `RecentTradesSection` | 1318-1475 | `trade-os/RecentTradesSection.tsx` |
| `TrackedBalanceCard` | 1480-1565 | `trade-os/TrackedBalanceCard.tsx` |
| `WeeklyReviewCard` | 1567-1583 | `trade-os/WeeklyReviewCard.tsx` |

### Step 3: Build New Orchestrator Components

**`useSessionStage.ts`** (~60 lines) — derives stage from existing data:
- `before_market`: no active plan + no trades today
- `live_session`: active plan exists OR session toggle ON
- `post_trade`: trades logged today + check-in not complete
- `end_of_day`: check-in complete
- Manual override: user clicks any tab header
- Persists to localStorage keyed by date

**`OSTabHeader.tsx`** (~50 lines) — horizontal tab bar (Plan / Live / Review / Insights) matching mockup style. Replaces SectionLabel-based vertical sections with one premium card containing tabs. Each tab shows a status dot (completed/active/locked).

**`SessionWindowSetup.tsx`** (~80 lines) — 3 time inputs for session start, entry cutoff, hard close. Stored in localStorage. Renders inside "Plan" tab content.

**`LiveSessionPanel.tsx`** (~90 lines) — countdown timers reusing `splitCountdown`/`Digit`/`Sep` from `SessionTimer.tsx`. Shows time remaining to cutoff and to hard close. Wraps `TodaysLimitsSection`.

**`CutoffAlertBanner.tsx`** (~40 lines) — amber/red banner + Web Audio API beep at cutoff/close times.

**`DisciplineSummary.tsx`** (~30 lines) — single row showing risk grade + discipline score from AI result cache.

### Step 4: New `AcademyTrade.tsx` Orchestrator (~300 lines)

```
Feature flag check → Classic or OS layout

OS Layout:
├─ Hero greeting header ("Good Morning, {name}" + status line)
├─ Compact metrics strip (reuses PerformanceHUD, restyled to match mockup)
├─ "+ Log Trade" primary CTA (always visible)
│
├─ Hero OS Card (single large rounded card)
│   ├─ OSTabHeader (Plan / Live / Review / Insights)
│   ├─ Tab content (one visible at a time):
│   │   ├─ Plan: SessionWindowSetup + VaultTradePlanner (embedded) + TodayVaultCheckCard
│   │   ├─ Live: LiveSessionPanel + TodaysLimitsSection + CutoffAlertBanner + active plan reminder
│   │   ├─ Review: CTAs → LogTradeSheet + QuickCheckInSheet (existing sheet modals)
│   │   └─ Insights: AIFocusCard (existing carousel) + DisciplineSummary
│   └─ Active Plan banner (when plan exists, shown below tabs)
│
├─ Lower Analytics Section (quieter, smaller cards)
│   ├─ RecentTradesSection
│   ├─ EquityCurveCard
│   ├─ PerformanceBreakdownCard
│   ├─ TrackedBalanceCard
│   └─ WeeklyReviewCard + CSV Export
│
└─ Modals (unchanged: SetStartingBalanceModal, LogTradeSheet, QuickCheckInSheet, NoTradeDaySheet)
```

### Step 5: Visual Polish to Match Mockup

- **Metrics strip**: restyle to horizontal inline row with larger numbers, border-separated cells, matching mockup's `Balance | Today P/L | Trades | Risk Left | Streak` format
- **Hero card**: single large `rounded-2xl` card with inner tab navigation, soft border, deep dark surface
- **Tab header**: horizontal with icons (Calendar for Plan, circle-check for Live, Clock for Review, broadcast for Insights), active tab gets blue underline + green checkmark when complete
- **Typography**: larger balance number (text-2xl), P/L with color, calmer labels
- **Spacing**: reduce gap between sections, larger card padding
- **Mobile**: tabs become a bottom-of-card icon bar (Plan/Live/Review with icons), large balance hero, single dominant CTA

### Desktop Layout

```
┌─────────────────────────────────────────────┐
│ VaultAcademy     [search] [notif] [avatar]  │ ← existing header
├─────────────────────────────────────────────┤
│ Good Morning, Alex                          │
│ ✓ Plan approved · 42 min left               │
├─────────────────────────────────────────────┤
│ Balance   Today P/L   Trades   Risk Left    │
│ $24,819   +$1,245     2/4      $356    [+Log]│
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ [Plan] [✓ Live] [Review] [Insights]     │ │
│ │                                         │ │
│ │  (active tab content rendered here)     │ │
│ │                                         │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Active Plan: SPY · Long · $514.80 · ...     │
│                                             │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│ │  Recent   │ │  Equity  │ │ Breakdown│     │
│ │  Trades   │ │  Curve   │ │          │     │
│ └──────────┘ └──────────┘ └──────────┘     │
└─────────────────────────────────────────────┘
```

### Mobile Layout

```
┌─────────────────────┐
│ VAULT        [avatar]│
│ Today    ■ 42 min    │
├─────────────────────┤
│     $24,819.36      │
│   + $1,245.80 Today │
│   ┌───────────────┐ │
│   │ equity sparkle│ │
│   └───────────────┘ │
│  ···                │
├─────────────────────┤
│ [Plan] [●Live] [Rev]│ ← tab icons
├─────────────────────┤
│ SPY Long $515.42    │
│        +22.14%      │
│                     │
│   [ Log Trade ]     │ ← dominant CTA
│                     │
│ 2 / 4 Trades  ════  │
├─────────────────────┤
│ [grid][#][□][🔔][≡] │ ← existing MobileNav
└─────────────────────┘
```

## What Gets Reused (unchanged logic)

All hooks: `useTradeLog`, `useApprovedPlans`, `useAuth`, `useVaultState`, `useTradingRules`, `useFeatureFlags`, `useStudentAccess`

All components: `VaultTradePlanner`, `LogTradeSheet`, `QuickCheckInSheet`, `NoTradeDaySheet`, `SetStartingBalanceModal`, `TodaysLimitsSection`, `FlowSection`, `SessionTimer` (digit helpers), `EndOfDayReview`

All handlers: `handleTradeSubmit`, `handleLogFromPlan`, `handleCancelPlan`, `handleCheckInComplete`, balance management

## What Gets Removed (visual clutter)

- Vertical section labels (PERFORMANCE, ACCOUNT, TODAY, INTELLIGENCE, JOURNAL, REVIEW) replaced by tab structure
- Animated rotating border on PerformanceHUD (too noisy for the new compact strip)
- Redundant "Check a Trade" navigating away — VaultTradePlanner embedded inline in Plan tab

## Files Touched

| File | Change |
|---|---|
| `src/pages/academy/AcademyTrade.tsx` | Major rewrite → thin orchestrator + classic fallback |
| `src/components/trade-os/*.tsx` (10 files) | Extracted from AcademyTrade (zero logic changes) |
| `src/components/trade-os/OSTabHeader.tsx` | New |
| `src/components/trade-os/SessionWindowSetup.tsx` | New |
| `src/components/trade-os/LiveSessionPanel.tsx` | New |
| `src/components/trade-os/CutoffAlertBanner.tsx` | New |
| `src/components/trade-os/DisciplineSummary.tsx` | New |
| `src/hooks/useSessionStage.ts` | New |
| `feature_flags` table | One new row: `trade-os` (disabled by default) |

## Files NOT Touched

All hooks, all existing components, all edge functions, all tables, auth, billing, admin, sidebar, routing, `VaultTradePlanner`, `LogTradeSheet`, `QuickCheckInSheet`, `MobileNav`, `AcademyLayout`, `index.css`.

## Rollback

Toggle `trade-os` flag to `false` → instant revert to classic layout. Zero data impact.

## What Remains for Later Phases

- Phase 2: Session countdown timers + audio alerts
- Phase 3: Post-trade ritual inline journal fields
- Phase 4: AI coordination per-stage messaging
- Move session times from localStorage to DB (`trading_sessions` table)
- Push notifications for cutoff alerts

