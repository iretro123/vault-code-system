
## Upgrade Vault Trade Planner into Pre-Trade Command Center

Keep the existing 3-panel layout, formulas, and dark premium UI. Add intelligence layers and polish on top.

### 1. Calculation Engine (`src/lib/tradePlannerCalc.ts`)

**Add auto-tier detection function:**
```typescript
export function detectTier(accountSize: number): AccountTierLabel {
  if (accountSize >= 50000) return "Large";
  if (accountSize >= 15000) return "Medium";
  return "Small";
}
```

**Add verdict system to `PlannerResult`:**
- New field `verdict: "PASS" | "CAUTION" | "NO_TRADE"`
- New field `verdictReason: string`
- New field `sizingExplanation: string` (the "Why This Size" text)
- Logic: NO_TRADE if finalContracts === 0; CAUTION if either check barely passes (e.g. accountRiskPercent > riskPercent * 0.8 or finalContracts === 1 and contractsByRisk !== contractsByDebit); PASS otherwise
- `sizingExplanation`: dynamic text explaining whether risk or debit was the binding constraint

### 2. UI Component (`src/components/vault-planner/VaultTradePlanner.tsx`)

**Account Panel upgrades:**
- On accountSize change, auto-call `detectTier()` and update tier + risk/debitCap (unless user has unlocked custom)
- Show a "Detected: Small Account" badge line below the tier toggle
- Add two live dollar readouts below the % fields: "Max risk this trade: $200" and "Max spend this trade: $500"

**Trade Panel:**
- Add optional Ticker field at top (small, inline)
- Keep existing direction toggle, entry/stop inputs, theta warning, action buttons

**Results Panel upgrades:**
- 3-state verdict banner: PASS (green), CAUTION (amber), NO TRADE (red) with one-line reason
- Hero hierarchy: verdict → contracts → planned loss → money needed (visually largest to smallest)
- **What To Do** card: structured instruction list (enter at, stop at, partial near TP1, main target, max contracts)
- **Why This Size** collapsed section: explains which constraint limited sizing
- **Outcome Snapshot** compact card: "If stopped: -$X / If TP1: +$X / If TP2: +$X / Capital: $X"
- Move targets (1:2, TP1, TP2) below the snapshot as secondary data
- Keep Risk Check / Debit Check badges at bottom

**Education tooltips:**
- Add small `?` icons next to "Option Buy Price", "Option Stop Price", "% I Can Lose", "Max % I Can Spend"
- Each opens a tooltip with 1-2 sentence explanation
- Add a collapsed "How to choose a contract" section at bottom of Trade panel

**Polish:**
- Tighten spacing, improve focus ring styling
- Ensure all numeric outputs use consistent `safeCurrency` formatting
- Mobile: panels stack cleanly with consistent gaps

### Files
- `src/lib/tradePlannerCalc.ts` — add `detectTier()`, verdict/sizingExplanation fields to result
- `src/components/vault-planner/VaultTradePlanner.tsx` — all UI upgrades above

No database changes. All existing formulas preserved.
