

# VAULT Trading OS — Premium Rebuild Plan

## Current Problems (confirmed via screenshot + code review)

The page is a vertical stack: greeting → flat metrics strip → generic tabbed card with old components dropped inside → analytics below. No spatial hierarchy, no control rail, no internal card structure. Each stage just dumps one or two existing components into an empty card body. The VaultTradePlanner takes up most of the Plan tab but looks like it was placed there rather than designed for there. Live is just TodaysLimitsSection + an active plan card. Review is two action buttons + a trade list. Insights is just AIFocusCard. No session timers, no right rail, no intelligence strip built into the hero.

Session boundary timers (cutoff/hard-close) don't exist as components yet — the memory mentions them but no code implements them on this page.

## New Layout Architecture

```text
┌──────────────────────────────────────────────────────────────┐
│ GREETING + STATUS LINE                                        │
├──────────────────────────────────────────────────────────────┤
│ METRICS STRIP                                                 │
│ Balance │ Today P/L │ Trades │ Risk Left │ Streak │ [+Log]    │
├──────────────────────────────────────────────────────────────┤
│ HERO OS CARD (dominant, min-h ~500px on desktop)              │
│ ┌─────────── TABS ──────────────────────────────────────────┐ │
│ │  Plan  ·  Live  ·  Review  ·  Insights                    │ │
│ ├───────────────────────────────┬────────────────────────────┤ │
│ │ LEFT MAIN (flex-[2])          │ RIGHT RAIL (flex-[1])      │ │
│ │                               │                            │ │
│ │ Stage-specific content:       │ Persistent context:        │ │
│ │ PLAN: VaultTradePlanner       │ • Active plan summary      │ │
│ │ LIVE: Session state + limits  │ • Vault status badge       │ │
│ │ REVIEW: Log/Check-in + trades │ • Risk left / trades left  │ │
│ │ INSIGHTS: AI carousel         │ • Restrictions             │ │
│ │                               │ • Quick actions            │ │
│ ├───────────────────────────────┴────────────────────────────┤ │
│ │ INTELLIGENCE STRIP (bottom of hero)                        │ │
│ │ AI Verdict · Primary Leak · Risk Grade · Next Action       │ │
│ └────────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│ LOWER ANALYTICS (quieter, secondary)                          │
│ Equity Curve · Recent Trades · Breakdown · Balance Mgmt       │
└──────────────────────────────────────────────────────────────┘
```

On mobile (<768px), the right rail collapses below the main content as a horizontal summary strip.

## Exact Content Placement Per Stage

### PLAN (Left Main)
- `VaultTradePlanner` — full embedded pre-trade calculator
- `TodayVaultCheckCard` shown ABOVE planner only when an active plan exists (shows plan summary + "Log Result")
- When no plan and no trades: planner is the hero, ready to use immediately

### LIVE (Left Main)  
- If active plan exists: prominent plan card with ticker/direction/contracts/entry, pulsing green dot
- Session state: vault status badge (GREEN/YELLOW/RED), current behavior mode
- `TodaysLimitsSection` restyled inline (risk left, trades left, max contracts as a clean grid)
- Today's trade summary if trades exist (count, P/L, compliance)
- Primary CTA: "Log Result" (if plan) or "Log Trade" (if no plan)
- If no plan and no trades: clean "No Active Session" with "Go to Plan" CTA

### REVIEW (Left Main)
- Two action cards: "Log a Trade" + "Complete Check-In" (existing handlers)
- Inline recent trades list (today's trades if any, else recent 5)
- Status nudge when complete ("Session complete → View Insights")

### INSIGHTS (Left Main)
- `AIFocusCard` (full existing carousel with all slides)

### RIGHT RAIL (persistent across all stages)
New component: `OSControlRail` — always visible, shows:
- **Active Plan** summary (ticker, direction, contracts, status badge) or "No plan" state
- **Vault Status** colored badge (GREEN/YELLOW/RED)  
- **Risk Left** with progress bar toward daily limit
- **Trades Left** (used / max)
- **Restrictions** (last block reason from vault state)
- **Quick Action** button: context-sensitive (stage-dependent — "Check Trade" on Plan, "Log Result" on Live, "Check In" on Review, "Refresh AI" on Insights)

### INTELLIGENCE STRIP (bottom of hero card, persistent)
Same as current compact AI preview strip but wider, 4-column layout:
- AI Verdict (grade badge)
- Primary Leak
- Strongest Edge  
- Next Action
Clickable → switches to Insights tab.

## Existing Components Reused

| Component | Where | Changes |
|-----------|-------|---------|
| `VaultTradePlanner` | Plan left main | No logic changes, just embedded |
| `TodayVaultCheckCard` | Plan left main (when plan exists) | No changes |
| `TodaysLimitsSection` | Live left main | No changes |
| `AIFocusCard` | Insights left main | No changes |
| `LogTradeSheet` | Modal (same handlers) | No changes |
| `QuickCheckInSheet` | Modal (same handlers) | No changes |
| `NoTradeDaySheet` | Modal (same handlers) | No changes |
| `SetStartingBalanceModal` | Modal (same handlers) | No changes |
| `EquityCurveCard` | Lower analytics | No changes |
| `RecentTradesSection` | Lower analytics | No changes |
| `PerformanceBreakdownCard` | Lower analytics | No changes |
| `TrackedBalanceCard` | Lower analytics | No changes |
| `WeeklyReviewCard` | Lower analytics | No changes |

## New Components to Create

1. **`src/components/trade-os/OSControlRail.tsx`** — Right rail panel. Reads from `activePlan`, `vaultState`, and `cachedAI`. Pure presentational + click handlers passed as props.

## Why This Will Feel Premium

1. **Two-column hero** creates spatial hierarchy — the eye has a clear primary zone (left) and context zone (right), like a real trading terminal
2. **Persistent right rail** means the trader always sees their risk state, plan status, and restrictions without switching tabs — this is what makes it feel like an OS, not a tab shell
3. **Intelligence strip at the bottom** grounds the hero card with AI context — the card feels "full" instead of having dead space
4. **Larger hero card** (~500px+ min-height) with intentional internal structure fills the viewport
5. **Stage content fills the left main zone** rather than being a small card floating in empty space

## Implementation Files

1. **`src/components/trade-os/OSControlRail.tsx`** — new ~120 line component
2. **`src/pages/academy/AcademyTrade.tsx`** — restructure OS layout section (lines 394-721) to use two-column hero with rail
3. **`src/components/trade-os/OSTabHeader.tsx`** — minor styling tweaks for stronger active state

## What Does NOT Change
- All handlers (handleTradeSubmit, handleLogFromPlan, etc.)
- All hooks (useTradeLog, useApprovedPlans, useVaultState, useSessionStage)
- All data pipelines (trade_entries writes, balance updates, AI triggers)
- Classic layout fallback
- All modal/sheet components
- All lower analytics components

