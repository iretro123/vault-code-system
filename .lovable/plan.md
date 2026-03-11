

# Fix & Enhance VAULT Approval + Connect the Pipes

## Problems Identified

1. **Wrong account balance in VAULT Approval**: `VaultTradePlanner` fetches raw `profiles.account_balance` (the static starting balance). My Trades computes the *live* balance as `startingBalance + totalPnl`. These are disconnected — the planner shows the wrong number.

2. **VAULT Approval is a separate sidebar item**: User wants it removed from the sidebar. It should only be accessible via the "Check a Trade" button on My Trades and inside Trading Toolkit.

3. **UI is plain**: The planner needs the same luxury glassmorphism treatment as the Performance HUD and AI Mentor sections in My Trades.

4. **TradeEntry type missing `plan_id`**: The `TradeEntry` interface in `useTradeLog.ts` doesn't include `plan_id`, so journal badges use `(e as any).plan_id` — fragile.

---

## Plan

### 1. Fix the account balance pipe

**`VaultTradePlanner.tsx`**: Instead of fetching `profiles.account_balance` directly (which is just the static starting balance), compute the live tracked balance the same way My Trades does:
- Fetch `profiles.account_balance` (starting balance)
- Fetch all `trade_entries` and sum P/L (`risk_reward * risk_used`)
- Display `startingBalance + totalPnl` as the account balance
- Pass this live balance into `calculateContractChoices()` and snapshots

This can reuse `useTradeLog()` hook to get `totalPnl`, or do a lightweight sum query. Using `useTradeLog()` is cleanest since it already computes `totalPnl`.

### 2. Remove VAULT Approval from sidebar

**`AcademySidebar.tsx`**: Remove the `{ icon: Shield, label: "VAULT Approval", path: "/academy/vault", pageKey: "vault" }` entry from `coreNav`.

**`App.tsx`**: Keep the `/academy/vault` route so the "Check a Trade" button on My Trades still works — just no sidebar link.

**`AcademyVaultApproval.tsx`**: Stays as thin wrapper (still routable).

### 3. Luxury UI upgrade for VaultTradePlanner

Upgrade `VaultTradePlanner.tsx` with the same cinematic treatment used in My Trades:

- **Rules strip**: Use `vault-premium-card` with subtle gradient glow instead of plain `bg-card` chips
- **Trade Check card**: Glassmorphism with animated gradient border (like Performance HUD), scan-line effect
- **Contract choice cards**: Frosted glass surfaces with hover glow, animated ring on selection, "Best" badge gets gradient pulse
- **Hero Decision card**: Premium elevated card with inner radial glow, large cinematic status text with text-shadow/glow, gradient CTA button
- **Direction toggle**: Sleeker segmented control with smooth transition
- **Overall**: Use `vault-premium-card` for main containers, add subtle gradient overlays, consistent with the HUD aesthetic

### 4. Fix `TradeEntry` type

**`useTradeLog.ts`**: Add `plan_id?: string` to the `TradeEntry` interface so journal badges don't need `(e as any)`.

**`AcademyTrade.tsx`**: Remove `(e as any).plan_id` casts, use `e.plan_id` directly.

### 5. Ensure plan snapshot uses live balance

When "Use This Plan" is clicked, `account_balance_snapshot` should save the *live tracked balance*, not the raw starting balance. This is automatically fixed by step 1 since `accountBalance` state will hold the live value.

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/vault-planner/VaultTradePlanner.tsx` | Use `useTradeLog` for live balance, luxury UI overhaul |
| `src/components/layout/AcademySidebar.tsx` | Remove VAULT Approval nav item |
| `src/hooks/useTradeLog.ts` | Add `plan_id` to `TradeEntry` interface |
| `src/pages/academy/AcademyTrade.tsx` | Remove `(e as any).plan_id` casts |

