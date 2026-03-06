

## Enhance Vault Trade Planner for Options Trading

The current formulas are correct for long options sizing. This plan adds options-specific context on top without changing the core math.

### Calculation Engine (`src/lib/tradePlannerCalc.ts`)

**New input field:**
- `ticker?: string`

**New result fields (all derived from existing math):**
- `maxPossibleLoss` — for long options, max loss = total position cost (premium paid). Important distinction from "planned loss if stop hits"
- `profitAtRR2` / `profitAtRR3` — dollar profit at 1:2 and 1:3 targets: `(rrTarget - entry) * 100 * contracts`
- `profitAtTP1` / `profitAtTP2` — dollar profit at TP levels
- `breakEvenAtExpiry` — if strike provided: `strike + entry` (calls) or `strike - entry` (puts)
- `accountRiskPercent` — actual `(totalPlannedRisk / accountSize) * 100`
- `accountExposurePercent` — `(totalPositionCost / accountSize) * 100`
- `thetaWarning` — if DTE provided and < 7: "Theta accelerates under 7 DTE"; if < 3: "Extreme decay under 3 DTE"

**Validation additions:**
- DTE > 0 if provided
- Delta between -1 and 1 if provided

### Input Form (`src/components/vault-planner/VaultTradePlanner.tsx`)

- Add **Ticker** text input at top of Trade section (optional, for reference/copy)
- Show inline theta warning banner when DTE < 7 (amber)
- Add to live preview: "Max Possible Loss", "Profit if 1:2 hits", "Account Exposure %"
- Show break-even at expiry when strike is provided

### Results View (`src/components/vault-planner/TradePlannerResults.tsx`)

- New hero card: "MAX POSSIBLE LOSS" (total premium at risk)
- Add profit-in-dollars rows for 1:2, 1:3, TP1, TP2 targets
- Add account risk % and exposure % metrics
- Show break-even at expiry when available
- Theta warning in results if DTE < 7
- Include ticker in "What To Do" summary
- Update `buildCopyText` with new fields

### Files
- `src/lib/tradePlannerCalc.ts` — new result fields, theta/break-even logic
- `src/components/vault-planner/VaultTradePlanner.tsx` — ticker input, theta warning, enhanced preview
- `src/components/vault-planner/TradePlannerResults.tsx` — new hero card, profit rows, break-even

No database changes. Core sizing formula stays identical.

