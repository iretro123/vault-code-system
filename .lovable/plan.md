

# Diagnosis & Fix Plan: VAULT Trading OS

## Root Cause Analysis

### A. Review Tab — "No trades to review yet" when trades exist

**Line 507**: `todayStatus === "incomplete" && todayTradeCount === 0` — this shows the empty state. `todayTradeCount` filters entries by TODAY's date only. If the user has 50 historical trades but zero today, they see "No trades to review yet." The Review tab completely ignores existing trade history. Fix: show recent trades inline in Review, and only show empty state when there are truly zero trades ever.

### B. Plan Tab — "Check a Trade" navigates away

**Line 456**: `onCheckTrade={() => navigate("/academy/vault")}` — the TodayVaultCheckCard button sends users to a different page, even though VaultTradePlanner is embedded right below it. Fix: remove the navigation, scroll to the embedded planner instead.

### C. Live Tab — correctly wired but weak

The Live tab reads real data from `TodaysLimitsSection` (vault state) and `activePlan`. The data flow is correct. But the presentation is thin — just limits + plan card, then giant empty space. Fix: add today's trade summary and session state context.

### D. todayStatus never initializes from existing data

`todayStatus` starts as `"incomplete"` (line 67) and only changes to `"in_progress"` after the user logs a trade in THIS browser session (line 204). If the user already logged trades today before opening the page, `todayStatus` stays `"incomplete"` even though `todayTradeCount > 0`. The `useSessionStage` auto-stage logic handles this (it checks `todayTradeCount`), but the Review tab's internal conditionals don't align. Fix: initialize `todayStatus` from existing data.

### E. Metrics strip hidden when no trades

**Line 387**: `{hasData && (` — the entire metrics strip disappears for new users with a balance but no trades. Fix: always show metrics strip if balance is set.

### F. Visual weakness

The hero card has `min-h-[280px]` (line 450) which is too small. Padding is `p-4 md:p-7` which is okay but the card border is too faint (`border-border/20`). The metrics strip labels are `text-[9px]` which is too tiny. The overall max-width is `max-w-4xl` which constrains the hero card unnecessarily on wide screens.

## Exact Fixes

### File: `src/pages/academy/AcademyTrade.tsx`

1. **Initialize todayStatus from existing data** — if `todayTradeCount > 0` on mount, set status to `"in_progress"`
2. **Review tab overhaul** — show recent trades (last 5) inline, always show Log Trade and Check-In buttons regardless of today count, only show "truly empty" state when `entries.length === 0`
3. **Plan tab** — change `onCheckTrade` to scroll to embedded planner instead of navigating away
4. **Live tab** — add today's trade summary (count, P/L, compliance) alongside limits
5. **Metrics strip** — show when balance is set OR trades exist, make labels larger (`text-[10px]`), increase padding
6. **Visual upgrades** — stronger hero card border, larger min-height, wider max-width (`max-w-5xl`), larger greeting, better spacing throughout
7. **Hero card** — increase to `p-5 md:p-8`, min-height `360px`, border `border-border/30`

### File: `src/components/trade-os/OSTabHeader.tsx`

8. **Premium tab styling** — larger touch targets, pill-style active indicator instead of thin underline, slightly larger text

### Data Flow Verification (no changes needed)

- `handleTradeSubmit` → calls `addEntry` (writes to `trade_entries`) → updates local state → triggers `setShowCheckIn` → all downstream metrics (balance, equity curve, recent trades, performance breakdown) update automatically via `useTradeLog` computed values
- `LogTradeSheet` → `handleTradeSubmit` → same pipeline as classic layout (lines 160-206)
- `AIFocusCard` receives `entries` directly — no change needed
- `TrackedBalanceCard` receives `trackedBalance` which is `startingBalance + totalPnl` — auto-updates when trades change

### No files touched beyond these two. No DB changes. No hook changes. Classic fallback preserved.

