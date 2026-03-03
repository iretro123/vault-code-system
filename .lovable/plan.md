

## Fix: Replace ASCII Diagrams with Real Generated Images

### The Problem
The AI coach is drawing useless ASCII art diagrams when users ask for visual examples. The image generation capability already exists (the camera button and `generateImage` path work), but:
1. The system prompt doesn't prohibit ASCII diagrams
2. The AI can't auto-trigger image generation — it just types ASCII art instead
3. Users have to manually click the image button separately

### Changes

**1. Update system prompt in `coach-chat/index.ts`**
- Add a rule: "NEVER draw ASCII art, text diagrams, or text-based charts. If a visual would help, tell the user: 'Want me to generate an image to show this? Hit the image button below.' Keep it that simple."
- This stops the AI from wasting space with broken ASCII art

**2. Auto-detect image requests in `CoachDrawer.tsx`**
- After each streamed response completes, check if the AI's reply contains phrases like "generate an image", "hit the image button", or "want me to draw"
- When detected, automatically trigger `handleGenerateImage()` so the user doesn't have to manually click anything — the image just appears
- This creates a seamless flow: user asks "show me an example" → AI says "Here's what that looks like:" → real image auto-generates inline

**3. Improve the image generation prompt in `coach-chat/index.ts`**
- Update the image system prompt to be more specific: "Create a realistic-looking candlestick chart diagram with labeled zones. Use proper chart styling — green/red candles, clean price axis, clearly labeled supply/demand zones with boxes. Make it look like an actual trading chart, not clip art."

### Files
- **Edit** `supabase/functions/coach-chat/index.ts` — add no-ASCII rule to system prompt + improve image generation prompt
- **Edit** `src/components/academy/CoachDrawer.tsx` — add auto-trigger logic after streaming completes

