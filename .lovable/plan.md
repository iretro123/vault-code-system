

## Beginner Clarity Pass — Plain-English Guidance

Surgical changes to `src/components/vault-planner/VaultTradePlanner.tsx` only. No new files, no layout changes, no logic changes.

---

### 1. Account Plan Card (below Account Size input, lines ~348-349)

Add a compact guidance strip that only appears when `acctSize > 0`. Uses existing computed values (`riskBudget`, `idealPrem`, `aggressivePrem`):

```
YOUR ACCOUNT PLAN
For a $1,000 account:
  You can risk       $20.00
  Best premium zone  ~$0.50
  Stretch zone       up to $1.00
  Best for: 1-contract setups
```

Styled as a tiny card inside the Account panel — same `inputBg` background, compact `text-[10px]` lines, no extra height. Also fix the tier toggle to show all 4 tiers (Micro, Small, Medium, Large) — currently only shows 3.

### 2. Trade Panel — Buy Price helper (lines ~397-406)

Replace current technical labels with beginner wording. After the input, show a dynamic zone label:

- If `entryVal <= idealPrem`: "This premium is in your **Best zone**" (green)
- If `entryVal <= aggressivePrem`: "This premium is in your **Stretch zone**" (amber)  
- If `entryVal > aggressivePrem`: "This premium is **Too expensive** for your account" (red)

Keep the "Use Ideal" / "Use Max" quick-fill chips.

### 3. Trade Panel — Stop Price helper (lines ~420-427)

Replace "Max stop width" / "Lowest stop" with beginner wording:

```
For 1 contract:
  Max risk room: $0.20 · Suggested stop: $0.30 or higher
```

### 4. Results Panel — Label + Verdict Explanation (lines ~448-475)

- Change "How Many Contracts" → "Contracts to Buy"
- Add a one-line human explanation below the verdict banner:
  - SAFE: "This trade fits comfortably inside your account rules."
  - AGGRESSIVE: "This trade works, but it is at the top end of your size range."
  - NO_TRADE: "This trade is too large for your account. Lower the premium or widen your stop."

### 5. Footer cleanup (lines ~489-490)

Simplify: "Contract size is based on both your risk limit and spend cap." — shorter, no bold spans.

---

### Files
- `src/components/vault-planner/VaultTradePlanner.tsx` — all changes above

No new components. No calc engine changes. No new scrolling.

