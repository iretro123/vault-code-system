

## Fix: Mobile Vault Trade Planner Scroll & UX

**Problem:** On mobile, the XPWindow's inner scroll area fights with the page scroll, trapping users inside the calculator. The planner is also very long vertically, making it hard to navigate on small screens.

### Changes

**1. `src/components/vault-planner/XPWindow.tsx`** — Fix mobile scroll trapping
- On mobile (`max-width: 767px`), remove `maxHeight` constraint and `overflow-y-auto` from the body. Let the planner flow naturally with the page instead of being a fixed-height scrollable container inside the page.
- Keep the current `fitViewport` scroll behavior on desktop only.

**2. `src/components/vault-planner/VaultTradePlanner.tsx`** — Condense mobile layout
- Hide the "How to use" section, rule banner, tier explanation text, and reassuring sub-copy on mobile (`hidden md:block`).
- Hide the menu bar on mobile (pass a prop or use responsive class).
- Collapse the "Generate" section's explanatory text on mobile.
- Keep all inputs and the Live Preview — those are essential.
- Hide footer on mobile.

This approach: no content is deleted, just hidden on mobile via Tailwind responsive classes. Desktop stays identical. The page scrolls naturally on mobile so users are never trapped.

### Files: 2 files, targeted edits.

