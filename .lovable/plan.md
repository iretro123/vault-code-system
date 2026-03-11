

# Refactor: Merge VAULT Approval into VaultTradePlanner

## Current State

Two competing systems exist:

1. **`VaultTradePlanner`** (598 lines) — old 3-panel calculator with Generate → Loading → Results flow, uses `tradePlannerCalc.ts`. Used in `AcademyResources.tsx`.
2. **`AcademyVaultApproval`** (504 lines) — new standalone page with 1/2/3/4 contract cards, Fits/Tight/Pass, hero card, Use This Plan CTA, uses `vaultApprovalCalc.ts`. Rendered at `/academy/vault`.

Both are only referenced from their respective locations — no other consumers.

## Plan

### 1. Rewrite `src/components/vault-planner/VaultTradePlanner.tsx`

Replace the entire old 3-panel UI with the VAULT Approval flow currently in `AcademyVaultApproval.tsx`:

- Direction toggle (Up/Down), contract price input, optional ticker
- 4 contract choice cards with Fits/Tight/Pass badges and "Best" recommended highlight
- Hero decision card (sticky right column on desktop)
- "Use This Plan" CTA → saves to `approved_plans`, navigates to My Trades
- Rules strip (Account, Trade loss limit, Account level)
- Replace plan dialog (if active plan exists)
- No balance warning with redirect to My Trades
- Keep auto-fetch of account balance from profile
- Keep localStorage persistence for inputs
- Use `vaultApprovalCalc.ts` as the math engine
- Import `useApprovedPlans` for plan management
- Remove all old sub-components: `PanelCard`, `FieldRow`, `FieldInput`, `VerdictBanner`, `StatusCheck`, `GuidanceChip`, `ResultRow`, `Btn`, `SegmentedToggle` (old versions)
- Remove imports of `TradePlannerLoading` and `TradePlannerResults`
- Remove `UIState` type and Generate/Loading/Results flow entirely
- Remove imports from `tradePlannerCalc.ts` (except `detectTier` and `TIER_DEFAULTS` which are still needed)
- Include `PremiumGate` check and `useStudentAccess` (same as current approval page)

The component keeps its export name `VaultTradePlanner` and includes all the sub-components (RulesChip, MetricLine, HeroDecisionCard, etc.) that are currently inside `AcademyVaultApproval.tsx`.

### 2. Simplify `src/pages/academy/AcademyVaultApproval.tsx` to thin wrapper

Replace the 504-line standalone page with ~20 lines:
- Import `PageHeader` and `VaultTradePlanner`
- Render the header ("VAULT Approval" / "Every trade gets checked before you enter.")
- Render `<VaultTradePlanner />`
- Keep the route at `/academy/vault`

### 3. Update `src/pages/academy/AcademyResources.tsx`

Line 410: Change section label from `"Trade Planner"` to `"VAULT Approval"`.
Everything else stays — same `<VaultTradePlanner />` import, same rendering.

### 4. Delete legacy flow components

- Delete `src/components/vault-planner/TradePlannerLoading.tsx`
- Delete `src/components/vault-planner/TradePlannerResults.tsx`

Both are only imported by the old VaultTradePlanner. After the rewrite, nothing references them.

### 5. Math engine consolidation

- `vaultApprovalCalc.ts` becomes the canonical engine (already has the 1/2/3/4 contract choice logic, Fits/Tight/Pass, recommended detection)
- `tradePlannerCalc.ts` stays in the codebase because `detectTier` and `TIER_DEFAULTS` are imported by `vaultApprovalCalc.ts` and potentially other files — but it is no longer directly used by the planner UI

### What stays untouched

- `useApprovedPlans` hook
- `approved_plans` table and RLS
- `trade_entries.plan_id` column
- My Trades bridge card (TodayVaultCheckCard)
- Journal Planned/Unplanned badges
- LogTradeSheet plan pre-fill
- Sidebar nav item for VAULT Approval
- Route `/academy/vault` in App.tsx

### Files changed

| File | Action |
|------|--------|
| `src/components/vault-planner/VaultTradePlanner.tsx` | Rewrite — new VAULT Approval UI |
| `src/pages/academy/AcademyVaultApproval.tsx` | Simplify to thin wrapper |
| `src/pages/academy/AcademyResources.tsx` | Update label "Trade Planner" → "VAULT Approval" |
| `src/components/vault-planner/TradePlannerLoading.tsx` | Delete |
| `src/components/vault-planner/TradePlannerResults.tsx` | Delete |

