

# Fix: Contract Cards — Better Visibility & Labeling

## Problem
The contract cards show "1" with a tiny, low-opacity sublabel "contract · Most room" at `text-[9px] text-muted-foreground/50` — nearly invisible. Users can't quickly tell what the numbers mean.

## Fix (2 changes in `VaultTradePlanner.tsx`)

### 1. Change the big number to include "CON" suffix
Line 382 — replace the plain number with a labeled format:

```tsx
// Before
<span className="text-2xl font-bold text-foreground tabular-nums leading-none">{choice.contracts}</span>

// After  
<span className="text-2xl font-bold text-foreground tabular-nums leading-none">
  {choice.contracts}<span className="text-xs font-semibold text-muted-foreground ml-0.5">CON</span>
</span>
```

### 2. Make the sublabel brighter and slightly bigger
Line 388 — boost opacity and bump size:

```tsx
// Before
<p className="text-[9px] text-muted-foreground/50 uppercase tracking-[0.1em] font-medium mb-2">
  {choice.contracts === 1 ? "contract" : "contracts"} · {CARD_SUBLABELS[choice.contracts] || ""}
</p>

// After
<p className="text-[10px] text-muted-foreground/80 uppercase tracking-[0.1em] font-medium mb-2">
  {CARD_SUBLABELS[choice.contracts] || ""}
</p>
```

The sublabel drops the redundant "contract(s)" word (since "CON" is now on the number) and just shows "Most room" / "Balanced" / "Tighter" / "Max size" at higher visibility.

## Result
Cards read: **1**CON · Most room, **2**CON · Balanced, etc. — immediately clear, no guessing.

