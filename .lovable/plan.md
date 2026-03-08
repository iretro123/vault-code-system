

## Amplify Blue Glow on Login Background

### Change (1 file: `src/pages/Auth.tsx`, lines 93-99)

Increase the opacity and size of the blue radial gradients, add a centered glow behind the card, and introduce a second blue accent layer for more visible luxury depth:

```tsx
style={{
  background: `
    radial-gradient(ellipse 70% 50% at 50% 40%, rgba(59,130,246,0.10) 0%, transparent 70%),
    radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,0.22) 0%, transparent 55%),
    radial-gradient(ellipse 60% 50% at 20% 80%, rgba(59,130,246,0.10) 0%, transparent 50%),
    radial-gradient(ellipse 50% 40% at 80% 70%, rgba(99,102,241,0.08) 0%, transparent 50%),
    radial-gradient(ellipse 40% 30% at 50% 50%, rgba(59,130,246,0.06) 0%, transparent 60%),
    linear-gradient(180deg, hsl(212,25%,7%) 0%, hsl(212,25%,4%) 100%)
  `
}}
```

Key differences from current:
- Top aura opacity **0.12 → 0.22** (nearly doubled)
- New mid-page glow behind the card area (0.10 opacity)
- Corner accents boosted (0.06 → 0.10, 0.05 → 0.08)
- New subtle center halo layer
- Base gradient slightly darker for more contrast against the blue

