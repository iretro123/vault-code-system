

# VAULT OS Phase 1 — Implementation Plan

## Summary

Build the VAULT Approval page and connect it to My Trades through saved Approved Plans. Keep the existing VaultTradePlanner as a legacy "Pro Details" tool in Trading Toolkit.

---

## Database Changes

### 1. New table: `approved_plans`

```sql
create table public.approved_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  ticker text,
  direction text not null default 'calls',
  entry_price_planned numeric not null,
  contracts_planned integer not null,
  stop_price_planned numeric,
  max_loss_planned numeric not null,
  cash_needed_planned numeric not null,
  tp1_planned numeric,
  tp2_planned numeric,
  approval_status text not null default 'fits',
  account_balance_snapshot numeric not null,
  trade_loss_limit_snapshot numeric not null,
  daily_left_snapshot numeric,
  account_level_snapshot text,
  status text not null default 'planned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.approved_plans enable row level security;

create policy "Users manage own plans"
  on public.approved_plans for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

Status lifecycle: `planned` | `cancelled` | `logged`

### 2. Add `plan_id` to `trade_entries`

```sql
alter table public.trade_entries
  add column plan_id uuid references public.approved_plans(id);
```

No separate `is_planned` column. `plan_id IS NOT NULL` = planned trade. Computed in code.

---

## New Files

### `src/lib/vaultApprovalCalc.ts` — Contract choice engine

Pure function: `calculateContractChoices(accountSize, riskPercent, comfortSpendPercent, hardSpendPercent, entryPremium)` returns array of 4 choices.

For each `n` in [1,2,3,4]:
- `cashNeeded = entryPremium * 100 * n`
- `maxCutRoom = riskBudget / (100 * n)`
- If `maxCutRoom >= entryPremium`: full premium risk is acceptable, `suggestedExit = null`, `worstCaseLoss = cashNeeded`
- Else: `suggestedExit = Math.max(0.01, Math.ceil((entryPremium - maxCutRoom) * 100) / 100)`, `worstCaseLoss = (entryPremium - suggestedExit) * 100 * n`
- **Fits**: `cashNeeded <= comfortBudget && worstCaseLoss <= riskBudget`
- **Tight**: `cashNeeded <= hardBudget && worstCaseLoss <= riskBudget` but not Fits
- **Pass**: everything else
- Targets: `tp1 = entry + 1R`, `tp2 = entry + 2R` (where R = entry - suggestedExit, or entry if full premium risk)

**Recommended choice**: largest `n` that is still "Fits". If none fit, largest "Tight". If all pass, none recommended.

### `src/hooks/useApprovedPlans.ts` — CRUD hook

- `activePlan`: fetch today's plan with `status = 'planned'` for current user (limit 1)
- `savePlan(data)`: if active plan exists, prompt to cancel/replace first. Insert new row.
- `cancelPlan(id)`: update status to `cancelled`
- `markLogged(id)`: update status to `logged`
- Realtime not needed for Phase 1.

### `src/pages/academy/AcademyVaultApproval.tsx` — VAULT Approval page

**Layout:**
- Header: "VAULT Approval" / "Every trade gets checked before you enter."
- **Top rules strip** (horizontal): Account balance, Trade loss limit, Account level badge. "Today left" hidden for Phase 1 (not reliably calculable from current daily risk data).
- **Two-column desktop** (stacked mobile):
  - Left: Trade Check card — Direction toggle (Up/Down), Contract price input, optional ticker
  - Right: Hero Decision card

**Trade Check card:**
- Direction: segmented toggle "Up" / "Down" (maps to "calls" / "puts")
- "Current contract price" — single number input
- Optional ticker input
- Below inputs: 4 contract choice cards rendered live as user types

**Contract Choice Cards (1/2/3/4):**
- Each shows: status badge (Fits green / Tight amber / Pass red), cash needed, exit if wrong (or "Full premium risk OK" if `suggestedExit` is null), worst-case loss
- One card highlighted as "Recommended" (largest Fits choice)
- Tappable — selecting one updates the Hero card
- If all are Pass: banner "This contract is too expensive for your account."

**Hero Decision Card:**
- Large status: FITS / TIGHT / PASS
- Selected contracts, exit if wrong, cash needed, worst-case loss, TP1, TP2
- Coaching note (one-liner based on status)
- CTA: **"Use This Plan"** (saves approved_plans row, navigates to /academy/trade)
- If active plan already exists: show modal "You already have an active plan. Cancel it and create a new one?"

**Full premium risk handling (adjustment #7):**
When `maxCutRoom >= entryPremium`, the exit field shows "Full premium risk OK — your risk budget covers the entire contract." No misleading tight exit shown.

---

## Modified Files

### `src/pages/academy/AcademyTrade.tsx`

**Replace `TodayTradeCheckCard`** with `TodayVaultCheckCard`:

- **State A** (no active plan today): "No trade approved yet today" + buttons "Check a Trade" (→ /academy/vault) and "Mark No-Trade Day"
- **State B** (active plan exists, not logged): Show plan summary (ticker, direction, contracts, exit, max loss, status badge) + "Log Result" and "Cancel Plan" buttons
- **State C** (plan logged or no-trade day): current complete state

**Trade Journal badges**: Each trade row shows "Planned" (blue badge) if `plan_id` exists, "Unplanned" (amber badge) if null.

**LogTradeSheet**: When opened from State B, receive plan data as props. Pre-fill ticker, direction, contracts, entry price. On submit, include `plan_id` in the trade entry and call `markLogged(planId)`.

### `src/components/academy/LogTradeSheet.tsx`

Add optional props: `planId?: string`, `prefill?: { symbol, direction, entryPrice, positionSize, stopPrice }`. When provided, pre-fill fields and show "Logging against approved plan" indicator.

On submit, pass `plan_id` through to the parent's `addEntry` call.

### `src/hooks/useTradeLog.ts`

Update `NewTradeEntry` interface to include optional `plan_id?: string`. Pass it through in the insert call.

### `src/components/layout/AcademySidebar.tsx`

Add nav item: `{ icon: Shield, label: "VAULT Approval", path: "/academy/vault", pageKey: "vault" }` — inserted after "My Trades".

### `src/App.tsx`

Add route inside the `/academy` layout: `<Route path="vault" element={<AcademyVaultApproval />} />`

### `src/pages/academy/AcademyResources.tsx`

Keep the existing VaultTradePlanner accessible here as "Pro Details Calculator" — no changes needed, it stays as-is.

---

## UI/Design

- Same luxury dark card system: `hsl(220 15% 7%)` backgrounds, frosted borders, premium spacing
- Fits = green (`emerald-400`), Tight = amber (`amber-400`), Pass = red (`red-400`)
- Recommended card gets a subtle primary ring highlight
- Hero card uses glassmorphism treatment with large status text
- "Use This Plan" button: primary gradient, prominent
- Contract choice cards: tappable with hover/active states, iOS-like feel
- Beginner labels throughout: "Cash needed", "Exit if wrong", "Worst-case loss"

---

## What stays unchanged

- Existing VaultTradePlanner in Trading Toolkit (legacy/pro tool)
- All existing trade_entries data
- Core `tradePlannerCalc.ts` math engine
- Vault OS cockpit page
- All other pages

