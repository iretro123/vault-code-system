

## Plan: Premium "Dark Depth + Inner Light" Treatment for Gameplan and My Trades Cards

### What Changes
Both cards get a deeper, richer background with a subtle inner radial highlight and sharper shadow — an "instrument panel" feel that lifts them above the other dashboard cards without breaking the existing design language.

### Visual Effect
- **Deeper base**: Slightly darker than the standard `vault-glass-card` (`hsl(214, 24%, 11%)` vs `14%`)
- **Inner radial light**: A subtle `radial-gradient` from a faint warm/blue highlight at top-center fading to transparent — gives a sense of depth and an internal glow
- **Sharper shadow**: A layered `box-shadow` with a soft outer spread + a tight inner shadow for a "recessed panel" look
- **Brighter border**: Slightly more visible border (`rgba(255,255,255,0.08)`) to define the edge crisply

### Implementation

**New CSS class in `src/index.css`**: `.vault-premium-card`
```css
.vault-premium-card {
  background:
    radial-gradient(ellipse 70% 40% at 50% 0%, rgba(59,130,246,0.06) 0%, transparent 70%),
    hsl(214, 24%, 11%);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 1.125rem;
  box-shadow:
    0 4px 24px rgba(0,0,0,0.35),
    inset 0 1px 0 rgba(255,255,255,0.04);
}
```

**File changes:**

1. **`src/index.css`** — Add `.vault-premium-card` class below `.vault-glass-card`

2. **`src/components/academy/dashboard/GameplanCard.tsx`** (line 183) — Replace `vault-glass-card` with `vault-premium-card`

3. **`src/components/academy/dashboard/MyTradesCard.tsx`** (line 16) — Replace `vault-glass-card` with `vault-premium-card`

Three files, minimal changes, no new dependencies.

