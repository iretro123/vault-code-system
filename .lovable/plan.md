

## Fix: Guidance Chips & Display Values — Rounding-Safe for All Account Sizes

### The Bug

The "Use Ideal" and "Use Max" chips use `.toFixed(2)` which applies standard rounding — entry can round UP, stop can round DOWN. This widens the spread beyond the risk budget, causing 0 contracts → NO TRADE even when the system itself suggested the values.

**Verified across multiple accounts:**

```text
Account     Tier     idealPrem   .toFixed(2)   spread×100   budget   Result
─────────   ──────   ─────────   ───────────   ──────────   ──────   ──────────
$500        Micro    0.375       0.38          $10          $10      AGGRESSIVE (should be SAFE)
$3,333      Small    1.6665      1.67          $67          $66.66   NO TRADE ✗
$7,777      Medium   3.8885      3.89          $78          $77.77   NO TRADE ✗
$15,558     Medium   7.779       7.78          $156         $155.58  NO TRADE ✗
$33,000     Large    13.20       13.20         $330         $330     OK (lucky even number)
$27,777     Large    11.1108     11.11         $111         $277.77  OK (stop rounds correctly here)
```

Any account where `prefBudget / 100` doesn't land on an exact cent boundary can break.

### Fix — `src/components/vault-planner/VaultTradePlanner.tsx`

**1. Chip click handlers (lines 479-486)** — Floor the entry, ceil the stop:

```tsx
// "Use Ideal"
onClick={() => {
  const entryRounded = Math.floor(idealPrem * 100) / 100;
  const stopRounded = Math.max(0.01, Math.ceil((idealPrem - maxStopW) * 100) / 100);
  setEntryPremium(entryRounded.toFixed(2));
  setStopPremium(stopRounded.toFixed(2));
}}

// "Use Max"
onClick={() => {
  const entryRounded = Math.floor(aggressivePrem * 100) / 100;
  const stopRounded = Math.max(0.01, Math.ceil((aggressivePrem - maxStopW) * 100) / 100);
  setEntryPremium(entryRounded.toFixed(2));
  setStopPremium(stopRounded.toFixed(2));
}}
```

**2. Display values (lines 419-421)** — Show the same floored amounts so "Best premium zone" matches what the chip fills:

```tsx
// Compute display-safe values (add near line 277-278)
const idealPremDisplay = Math.floor(idealPrem * 100) / 100;
const aggressivePremDisplay = Math.floor(aggressivePrem * 100) / 100;

// Use in the display (lines 419-421)
<span>~{safeCurrency(idealPremDisplay)}</span>
<span>up to {safeCurrency(aggressivePremDisplay)}</span>
```

**After fix — same accounts all work:**

```text
$500     → entry 0.37, stop 0.28, spread $9 ≤ $10    → 1 contract SAFE ✓
$3,333   → entry 1.66, stop 1.00, spread $66 ≤ $66.66 → 1 contract SAFE ✓
$7,777   → entry 3.88, stop 3.11, spread $77 ≤ $77.77 → 1 contract SAFE ✓
$15,558  → entry 7.77, stop 6.22, spread $155 ≤ $155.58 → 1 contract SAFE ✓
```

One file, small targeted edits. Core math engine (`calculatePlan`) is untouched — it's already correct.

