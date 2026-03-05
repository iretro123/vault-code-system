

## Plan: Animated Particle/Dot Grid Background on Hero Header

Add a lightweight canvas-based animated dot grid behind the welcome card. Dots float gently and connect with faint lines when near each other — creating a premium "network mesh" effect. The animation plays on mount (entrance) and stays subtly alive. Fully scoped to the card, no logic changes.

### Changes: `src/components/academy/dashboard/HeroHeader.tsx`

**Replace the current radial-gradient background div** (lines 133–148) with a small inline `<canvas>` element rendered by a `useEffect`-driven particle system:

- ~30 small dots (rgba white, low opacity) that drift slowly across the card
- When two dots are within ~80px, a faint connecting line is drawn between them
- On mount: dots fade in from 0 opacity over 600ms (entrance feel)
- Canvas is `position: absolute; inset: 0` with `pointer-events: none`, same layer as the old gradient
- Animation uses `requestAnimationFrame` with cleanup on unmount
- Respects `prefers-reduced-motion`: if enabled, renders static dots with no animation
- No external libraries — pure canvas API (~60 lines of effect code)
- Keep the existing `overflow-hidden` and `relative` on the card container

**Performance:** Canvas particle rendering is GPU-friendly, no DOM reflows, no backdrop-filter. Well under the 120ms animation budget per frame.

### Files Modified
- `src/components/academy/dashboard/HeroHeader.tsx` — replace gradient bg with canvas particle animation

