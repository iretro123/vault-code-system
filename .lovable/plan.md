

# End-to-End Testing & Verification Plan: VAULT Approval → My Trades Pipeline

## What We're Testing

The full user flow: **Check a trade → Approve plan → Navigate to My Trades → Log result against plan → Verify compliance tracking**

---

## 5 Tests to Write

All tests will be pure unit/integration tests in `src/test/` using Vitest. No browser automation needed for the math and state logic.

### Test 1: VAULT Approval Calc — Contract Choices

**File**: `src/test/vaultApprovalCalc.test.ts`

Verify `calculateContractChoices()` produces correct results for real scenarios:
- $2,000 account, $0.50 entry → expect 1-2 contracts "fits", 3-4 may be "tight" or "pass"
- $5,000 account, $1.50 entry → verify cash needed, exit prices, targets
- $500 account, $3.00 entry → all should be "pass" (too expensive)
- Verify `isRecommended` is set on exactly one choice
- Verify `formatCurrency` output

### Test 2: Custom Size Calculator Logic

**File**: `src/test/vaultApprovalCalc.test.ts` (continued)

Test the custom contract math that lives in the `VaultTradePlanner` component's `useMemo`:
- Extract the custom choice calculation into a testable function (or test the same math inline)
- 5 contracts at $0.30 on $3,000 account → verify status, exit, worst case
- Custom exit override: entry $1.00, override exit $0.50 → verify worst case = $0.50 * 100 * n
- Edge: 1 contract should always produce same result as the standard 1-contract card

### Test 3: Plan Save & Pipeline Data Shape

**File**: `src/test/vaultApprovalPipeline.test.ts`

Test `buildPlanData()` logic (currently inline in component — test the shape):
- Given a selected choice, verify the plan data object has all required fields for `approved_plans` insert
- Verify `direction`, `entry_price_planned`, `contracts_planned`, `stop_price_planned`, `max_loss_planned`, `cash_needed_planned`, `tp1_planned`, `tp2_planned`, `approval_status`, `account_balance_snapshot`, `trade_loss_limit_snapshot`, `account_level_snapshot` are all present and correctly typed
- Verify ticker is uppercase

### Test 4: Trade Log P/L Calculation

**File**: `src/test/tradeLogCalc.test.ts`

Verify the P/L model used in `useTradeLog`:
- Win: `risk_reward=1, risk_used=150` → P/L = +$150
- Loss: `risk_reward=-1, risk_used=150` → P/L = -$150
- Breakeven: `risk_reward=0, risk_used=150` → P/L = $0
- `totalPnl` sum across multiple entries
- `equityCurve` running balance is correct
- `allTimeWinRate` calculation
- `complianceRate` calculation
- `currentStreak` — consecutive `followed_rules=true` from newest

### Test 5: Tier Detection & Budget Calculation

**File**: `src/test/vaultApprovalCalc.test.ts` (continued)

Verify `detectTier` + `TIER_DEFAULTS` produce correct budgets:
- $800 → Micro, 2% risk, 7.5% comfort, 12.5% hard
- $3,000 → Small, 2% risk, 5% comfort, 10% hard
- $15,000 → Medium, 1% risk, 5% comfort, 8% hard
- $50,000 → Large, 1% risk, 4% comfort, 6% hard
- Verify budget dollar amounts: e.g. $3,000 Small → riskBudget=$60, comfort=$150, hard=$300

---

## Implementation Details

### Files to create:
1. `src/test/vaultApprovalCalc.test.ts` — Tests 1, 2, 5
2. `src/test/tradeLogCalc.test.ts` — Test 4
3. `src/test/vaultApprovalPipeline.test.ts` — Test 3

### Files to modify:
None needed — all calculation logic is already in importable pure functions (`vaultApprovalCalc.ts`, `tradePlannerCalc.ts`). The trade log P/L formula can be tested by extracting the `computePnl` pattern inline.

### What these tests will confirm:
- The approval math is correct for all account sizes
- Plans contain all data needed for the `approved_plans` table
- Trade logging P/L is deterministic and correct
- The `plan_id` foreign key linkage between `trade_entries` and `approved_plans` is structurally sound
- Tier detection boundaries are exact
- Custom size calculations match standard card calculations at the same contract count

After writing tests, we'll run them to verify everything passes.

