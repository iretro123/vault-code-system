

## Premium Luxury Background for Login Page

### Change (1 file)

**File: `src/pages/Auth.tsx` (line 91)**

Replace the outer `div` with a layered radial gradient background — a subtle blue aura glow behind the card on a deep dark base. No animations, no blur, no performance cost.

```tsx
<div
  className="min-h-screen flex items-center justify-center px-4"
  style={{
    background: `
      radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,0.12) 0%, transparent 60%),
      radial-gradient(ellipse 60% 50% at 20% 80%, rgba(59,130,246,0.06) 0%, transparent 50%),
      radial-gradient(ellipse 50% 40% at 80% 70%, rgba(99,102,241,0.05) 0%, transparent 50%),
      linear-gradient(180deg, hsl(212,25%,7%) 0%, hsl(212,25%,5%) 100%)
    `
  }}
>
```

- Top-center blue aura gives the "high-ticket" glow effect
- Two faint corner accents add depth without distraction
- Deep dark base (#0f1318 range) for maximum card contrast
- Pure CSS gradients — zero performance impact, iOS-smooth

