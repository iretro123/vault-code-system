

## Replace VaultPlaybookIcon with uploaded e-book SVG

### Changes

**`src/components/icons/VaultPlaybookIcon.tsx`** — Replace the current open-book SVG paths with the uploaded e-book/reader SVG content, scaled to fit a 24x24 viewBox. The SVG will be adapted to use `currentColor` for strokes/fills so it inherits the blue accent color from the parent, and sized to fit perfectly within the `h-6 w-6` container on the Learn page hero strip.

The uploaded SVG has a 256x256 viewBox with an inner 90x90 coordinate system. I'll simplify it to use the key paths (tablet body, screen, text lines) and re-color them to match the blue accent theme (`currentColor` or `#3B82F6`).

