

# Trading OS — Full Audit & Fix Plan

## Issues Found

### 1. Conflicting Risk Numbers (Critical — Confusing)
The **Welcome Hero HUD** shows "$100 risk left" (from old `vault_state.risk_remaining_today`), but the **Plan stage Today's Budget** shows "$120 Risk Budget" (from the planner engine). Two different numbers for the same concept on the same page. Same problem in the **Live stage TodaysLimitsSection** — shows "Risk Left: $100" from vault_state while the planner says $120.

**Fix:** 
- **HUD (line 518-519):** Replace `vaultState.risk_remaining_today` with planner-derived risk budget: `detectTier(bal) → TIER_DEFAULTS → riskBudget`
- **TodaysLimitsSection:** Update to use `detectTier`/`TIER_DEFAULTS` from `tradePlannerCalc.ts` instead of raw vault_state values, matching the Plan stage budget card
- **"Limits are set by Vault State" copy** → change to "Based on your balance and tier"

### 2. Today's Budget — "Comfort Spend" Label is Confusing
Most day traders won't know what "Comfort Spend" means. It's the preferred spend cap from the planner — the max position cost you should ideally stay under.

**Fix:** Rename "Comfort Spend" → "Max Position" with a slightly longer sublabel or keep the number but relabel to something traders understand like "Position Cap" or "Spend Limit".

### 3. Today's Budget Shows $12,000 Balance but Profile Has $13,782
The budget card context line says "$12,000 · Medium tier" but the profile response shows `account_balance: 13782.34` and tracked balance shows $15,601. The budget uses `vaultState.account_balance` (which is the vault_state table value, likely stale) while the HUD uses `trackedBalance` (startingBalance + totalPnl). These are out of sync.

**Fix:** Use `trackedBalance` (or fall back to `startingBalance`) for the budget calculation instead of `vaultState.account_balance`, since that's the real current balance the trader sees in the HUD. This ensures the tier detection and risk numbers match the displayed balance.

### 4. "Trades Allowed: 2" and "Max Contracts: 1" from vault_state
These still come from `vaultState.max_trades_per_day` and `vaultState.max_contracts_allowed` which are from the old engine. The planner doesn't enforce a fixed trade count — it sizes based on risk budget. These numbers feel arbitrary without context.

**Fix:** Keep trades and max contracts from vault_state (they're enforcement limits, not planner values), but add brief context like "per session" so traders understand these are session guardrails, not risk-sizing rules.

### 5. Console Error: StageHeadline ref warning
`Warning: Function components cannot be given refs` on `StageHeadline`. This is a React warning — `StageHeadline` is used somewhere a ref is passed to it.

**Fix:** The component isn't receiving a ref in code, so this is likely from the `OSTabHeader` or parent passing a ref. Wrap `StageHeadline` with `React.forwardRef` or ensure no ref is being passed to it.

### 6. Session Not Started Yet Shows "End Session" Button
The "End Session" red button appears when `sessionPhase` is set (truthy), but `sessionPhase` starts as `null` and only gets set after starting a session — so this is correct. However, looking at the screenshot, the session hasn't been started yet but the session setup form is shown. The "End Session" button correctly only appears after starting. No bug here.

### 7. No Visual Distinction Between Plan Budget and Live Limits
The Plan stage shows "Today's Budget" and the Live stage shows TodaysLimitsSection with different numbers from different engines. A trader switching between tabs sees conflicting data.

**Fix:** Already covered in fix #1 — unify both to use the planner engine.

---

## Summary of Changes

### File: `src/pages/academy/AcademyTrade.tsx`
1. **Line 518-519 (HUD risk display):** Replace `vaultState.risk_remaining_today` with planner-derived `riskBudget` using `detectTier(trackedBalance || vaultState.account_balance)`
2. **Lines 560-592 (Today's Budget):** Use `trackedBalance` instead of `vaultState.account_balance` for budget calc; rename "Comfort Spend" → "Position Cap"; update context line to show correct balance
3. Remove the `StageHeadline` ref warning (check if a ref is passed)

### File: `src/components/vault/TodaysLimitsSection.tsx`
4. Import and use `detectTier`/`TIER_DEFAULTS` from `tradePlannerCalc.ts` instead of raw vault_state values
5. Change "Risk Left" to show planner-derived risk budget; update "Limits are set by Vault State" → "Based on your balance and tier"
6. Accept optional `balanceOverride` prop so AcademyTrade can pass `trackedBalance`

