

# Sync Trade OS Card on Dashboard with Trade OS Page

## Problem
The `MyTradesCard` on `/academy/home` and the Trade OS page `/academy/trade` both independently fetch trade data and balance. They compute metrics with slightly different logic (e.g., week-start calculation differs), and neither triggers a refetch when the user navigates between them. This causes stale/mismatched data.

## Root Causes
1. **Duplicate balance fetch**: `MyTradesCard` does its own `supabase.from("profiles")` query; `AcademyTrade` does its own separate one
2. **No refetch on mount**: `useTradeLog` only fetches when `user` changes, not on page navigation
3. **Inconsistent week calc**: `MyTradesCard` uses `d.getDay()` with Sunday start; Trade OS page uses its own logic
4. **Stale cache**: `useTradeLog` reads from localStorage cache first, so after logging a trade on `/academy/trade`, going back to `/academy/home` may show old data

## Plan

### 1. `src/hooks/useTradeLog.ts` — Add refetch-on-mount capability
- Expose `refetch` (already exists as `fetchEntries`) and ensure it's called when the hook mounts if data might be stale
- Add a `lastFetched` timestamp; if >30s old on mount, auto-refetch in background (stale-while-revalidate pattern already used elsewhere)

### 2. `src/components/academy/dashboard/MyTradesCard.tsx` — Use shared metrics from `useTradeLog`
- **Remove** the standalone `supabase.from("profiles")` balance fetch
- **Import and use** `allTimeWinRate`, `todayPnl`, `totalPnl`, `complianceRate`, `currentStreak` from `useTradeLog()` — the same computed values the Trade OS page uses
- Fetch `account_balance` once via profile (or reuse from `useAuth().profile`) and compute `trackedBalance = account_balance + totalPnl` — same formula as Trade OS
- Replace the custom week-start/win-rate/P/L calculations with the canonical ones from `useTradeLog`
- Call `refetch()` on component mount to ensure fresh data when user lands on dashboard

### 3. Metric alignment — match what Trade OS shows
Update the 3 metric pills to show the **same** KPIs the Trade OS HUD shows:
- **Today P/L** (from `todayPnl`) instead of "This Week" trade count
- **Win Rate** (from `allTimeWinRate`) — already matches
- **Compliance** (from `complianceRate`) or keep P/L — matches Trade OS HUD

### 4. Balance sync
- Use `profile.account_balance` from `useAuth()` instead of a separate query, so it's always the same source
- If profile doesn't have it, fall back to a one-time fetch (same as now)

### Files Changed
- `src/hooks/useTradeLog.ts` — add auto-refetch on mount when stale
- `src/components/academy/dashboard/MyTradesCard.tsx` — use shared hook metrics, remove duplicate fetch, call refetch on mount

No database changes needed.

