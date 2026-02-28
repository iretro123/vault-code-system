

## Fix VaultPlaybookIcon — use uploaded e-book SVG

### Problem
The current icon uses `currentColor` with very low opacities (0.08–0.15), making it nearly invisible on the dark background. The uploaded e-book SVG wasn't actually incorporated — a manually drawn placeholder was used instead.

### Solution
**`src/components/icons/VaultPlaybookIcon.tsx`** — Replace with the actual uploaded SVG paths, converted to a 24x24 viewBox. The SVG has:
- Dark tablet body (rounded rect) — will use a semi-transparent fill
- Light blue screen area — will use `#B9D2ED` / blue-200 tones
- "E-BOOK" text paths on screen — simplified to horizontal text lines for clarity at small sizes
- Bottom home indicator bar

Key changes:
- Use actual fills with proper colors (`rgb(51,49,63)` for body, `rgb(185,210,237)` for screen) instead of transparent `currentColor`
- Scale from the original 90x90 coordinate system to 24x24
- Keep the component API unchanged (accepts `className` prop)

This will make the icon match the screenshot reference — a dark tablet with a blue screen and visible text lines.

