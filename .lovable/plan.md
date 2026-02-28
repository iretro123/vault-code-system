

## Upgrade Share Vault Glow — Brighter RGB Border Sweep

### Problem
Current glow is too dark/subtle — barely visible. User wants a Lovable-style animated RGB border line that visibly sweeps around the card on hover, with blue + purple mix, medium intensity.

### Changes

#### File: `src/index.css` — Replace `.share-vault-glow` block (lines 417-470)

Replace with a much more visible animated border using:
- **Multi-color conic gradient**: Blue (#3B82F6) → Purple (#8B5CF6) → Cyan (#06B6D4) — visible RGB mix, not overwhelming
- **Wider gradient arc** (30% coverage instead of 10%) so the sweep line is clearly visible
- **Higher opacity** (0.8 on gradient colors instead of 0.5)
- **Stronger outer glow** — box-shadow bumped to `0 0 20px 4px` with blue-purple mix
- **Faster rotation** — 3s instead of 4s for more energy
- **2px border** instead of 1px for more presence

```css
.share-vault-glow {
  position: relative;
  border: 1px solid rgba(255,255,255,0.04);
  transition: border-color 300ms ease, box-shadow 300ms ease;
}

.share-vault-glow::before {
  content: "";
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  padding: 2px;
  background: conic-gradient(
    from 0deg,
    transparent 0%,
    #3B82F6 8%,
    #8B5CF6 18%,
    #06B6D4 28%,
    transparent 38%,
    transparent 100%
  );
  -webkit-mask: 
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity 400ms ease;
  pointer-events: none;
}

.share-vault-glow:hover::before {
  opacity: 1;
  animation: glow-rotate 3s linear infinite;
}

.share-vault-glow:hover {
  border-color: transparent;
  box-shadow: 0 0 20px 4px rgba(99,102,241,0.15), 0 0 8px 2px rgba(59,130,246,0.1);
  animation: glow-breathe-shadow 3s ease-in-out infinite;
}

@keyframes glow-rotate { ... }

@keyframes glow-breathe-shadow {
  0%, 100% { box-shadow: 0 0 16px 3px rgba(99,102,241,0.12); }
  50% { box-shadow: 0 0 28px 6px rgba(99,102,241,0.22); }
}
```

Key differences from current:
- Solid color stops (#3B82F6, #8B5CF6, #06B6D4) instead of rgba — much more visible
- 2px border width instead of 1px
- 30% arc coverage instead of 10% — the sweep line is clearly visible
- Blue-purple-cyan gradient matches Lovable's style
- Stronger breathing shadow with indigo tint

#### File: `src/components/layout/AcademySidebar.tsx` — No changes needed

### Files
- `src/index.css` (replace ~25 lines)

