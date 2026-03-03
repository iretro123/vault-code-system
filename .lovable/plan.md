

## Optimize AI-Generated Images in Coach Chat

### Problem
AI-generated images in the coach chat render at full size with no constraints, causing users to scroll. They need to be properly sized and responsive across mobile, tablet, and desktop.

### Changes

**1. Update image rendering in `CoachDrawer.tsx` (lines 634-644)**
- Add responsive max-height constraints: `max-h-[50vh] md:max-h-[45vh]` so images never exceed ~half the viewport
- Add `w-full object-contain` so images scale proportionally without cropping
- Add `cursor-pointer` with click-to-enlarge using the existing `ImageLightbox` component
- Wrap in a styled container with rounded corners and subtle background

**2. Update image generation prompt in `coach-chat/index.ts`**
- Refine the image system prompt to request charts that match the reference examples: clean candlestick charts with properly labeled supply/demand zones highlighted with colored rectangular boxes, price axis on the right, arrows showing price movement direction, and clear annotations
- Reference the style from the uploaded examples: labeled zones (Supply Zone, Demand Zone), colored rectangular overlays, price movement arrows, clean white/light background

### Files
- **Edit** `src/components/academy/CoachDrawer.tsx` — responsive image sizing + lightbox on click
- **Edit** `supabase/functions/coach-chat/index.ts` — better image generation prompt based on reference examples

