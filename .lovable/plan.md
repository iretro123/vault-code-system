

## Animated Breathing Glow Border — Share Vault Card

### Problem
Current `.share-vault-glow` only applies a static `box-shadow` on hover. User wants a visible, animated glow that circles around the card border — calm, premium, breathing.

### Approach
Use a **rotating conic-gradient** border technique on hover. The card gets a pseudo-element (`::after`) with a spinning blue gradient behind it, masked by the card background. On hover, the gradient fades in and slowly rotates, creating the "circling glow" effect. Combined with a subtle breathing `box-shadow` pulse.

### File: `src/index.css` — Replace `.share-vault-glow` block (lines 417-428)

Replace the current static hover with an animated version:

```css
.share-vault-glow {
  position: relative;
  border: 1px solid rgba(255,255,255,0.04);
  transition: border-color 300ms ease, box-shadow 300ms ease;
}

/* Rotating glow pseudo-element */
.share-vault-glow::before {
  content: "";
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background: conic-gradient(
    from 0deg,
    transparent 0%,
    rgba(59,130,246,0.5) 10%,
    transparent 40%,
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
  animation: glow-rotate 4s linear infinite;
}

.share-vault-glow:hover {
  border-color: transparent;
  box-shadow: 0 0 18px 3px rgba(59,130,246,0.12);
  animation: glow-breathe-shadow 3s ease-in-out infinite;
}

@keyframes glow-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes glow-breathe-shadow {
  0%, 100% { box-shadow: 0 0 12px 2px rgba(59,130,246,0.1); }
  50% { box-shadow: 0 0 22px 4px rgba(59,130,246,0.2); }
}

@media (prefers-reduced-motion: reduce) {
  .share-vault-glow:hover::before { animation: none; opacity: 0; }
  .share-vault-glow:hover { animation: none; }
}
```

### File: `src/components/layout/AcademySidebar.tsx` — Line 240

Add `overflow-hidden` to the button class to clip the pseudo-element within the rounded corners:
```
className="group w-full text-left rounded-2xl px-4 py-3.5 mb-1.5 active:scale-[0.98] share-vault-glow overflow-hidden"
```

### Summary
- Rotating conic-gradient creates a blue light that sweeps around the card border on hover
- Breathing box-shadow adds a calm pulse
- 4s rotation speed keeps it premium, not frantic
- Fades in/out smoothly on hover enter/leave
- Two files, minimal diff

