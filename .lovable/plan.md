

# Phase 4 — Structured Options Logging

## 1. New Fields on `trade_entries`

Add 5 nullable columns (additive, no existing data affected):

| Column | Type | Default | Purpose |
|---|---|---|---|
| `contracts` | `integer` | `null` | Actual contracts traded |
| `actual_pnl` | `numeric` | `null` | Clean signed dollar P/L |
| `planned_risk_dollars` | `numeric` | `null` | Risk budget committed to this trade |
| `entry_price` | `numeric` | `null` | Option premium at entry |
| `exit_price` | `numeric` | `null` | Option premium at exit |
| `is_oversized` | `boolean` | `false` | Computed: actual contracts > planned contracts |

All nullable so every existing row remains valid. Legacy reads still use `risk_reward` / `risk_used` via `computePnl()` — that function already handles both formats.

## 2. New Table: `trading_sessions`

Persists session times to DB instead of localStorage-only:

| Column | Type |
|---|---|
| `id` | uuid PK |
| `user_id` | uuid |
| `session_date` | date (unique per user) |
| `start_time` | time |
| `cutoff_time` | time |
| `hard_close_time` | time |
| `created_at` | timestamptz |

RLS: users manage own rows. `SessionSetupCard` writes to DB on save, reads on mount (falling back to localStorage for offline).

## 3. Old Fields — Backward Compatibility

| Field | Status |
|---|---|
| `risk_reward` | Kept. Still written (signed P/L) for legacy `computePnl()` compatibility |
| `risk_used` | Kept. Still written but no longer the source of truth — `planned_risk_dollars` replaces it semantically |
| `outcome` | Kept. Still the signal for new-format entries in `computePnl()` |
| `notes` | Kept. Still written with pipe-delimited metadata string |

No columns renamed or removed. Legacy entries (no `outcome` field) continue to use the multiplier formula.

## 4. How Existing Legacy Data Still Works

`computePnl()` checks for `outcome` presence:
- **Has `outcome`**: returns `risk_reward` directly (dollar P/L) — unchanged
- **No `outcome`**: returns `risk_reward * risk_used` (legacy multiplier) — unchanged

New entries also populate `actual_pnl` for clean reads. Analytics can migrate to `actual_pnl` over time while `computePnl()` remains the universal fallback.

## 5. Files Changed

| File | Change |
|---|---|
| **DB migration** | Add 6 columns to `trade_entries`, create `trading_sessions` table |
| `src/pages/academy/AcademyTrade.tsx` | `handleTradeSubmit`: populate new fields, compute `is_oversized` from plan, add "Log Another" flow state |
| `src/components/academy/LogTradeSheet.tsx` | Add "Log Another" button in footer after save, keep prefills on "Log Another" |
| `src/hooks/useApprovedPlans.ts` | Add `todayPlans` query (all statuses for today) alongside existing `activePlan` |
| `src/hooks/useTradeLog.ts` | Update `TradeEntry` / `NewTradeEntry` interfaces with new fields |
| `src/components/trade-os/SessionSetupCard.tsx` | Read/write `trading_sessions` table on save/mount, localStorage as fallback |

## 6. User-Facing Behavior After This Phase

**Logging a trade:**
- Same UI, same fields — no visual changes
- Behind the scenes: `contracts`, `actual_pnl`, `planned_risk_dollars`, `entry_price`, `exit_price` are stored as clean structured data
- If logged from a plan and contracts > planned contracts → `is_oversized = true` automatically (no self-report needed)

**After saving:**
- Footer shows **"Log Another"** button alongside Cancel
- Tapping "Log Another" resets the form but keeps symbol + direction pre-filled
- Sheet stays open for fast multi-trade logging

**Review stage:**
- New "Today's Plans" section shows all plans created today (planned, logged, cancelled) with status badges
- Gives full daily context instead of only showing the active plan

**Session times:**
- Saved to DB on "Start Session" — survives device switch and refresh
- On mount, checks DB first, then localStorage fallback

## 7. Why This Makes Trade OS Stronger

- **Structural correctness**: contracts, P/L, risk, and prices are real typed columns instead of buried in notes strings or overloaded fields
- **Computed trust**: oversized detection is automatic, not self-reported — traders can trust the system caught their deviation
- **Faster logging**: "Log Another" eliminates re-opening the sheet for multi-trade days
- **Daily context**: seeing all plans (not just active) gives traders a complete picture in Review
- **Cross-device reliability**: session times persist to DB, eliminating the "lost my session window" problem
- **Zero visual complexity added**: no new screens, no new tabs, no redesign — just cleaner data and faster flows

