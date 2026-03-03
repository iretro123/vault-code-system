

## Use Real Chart Images Instead of AI-Generated Ones

### Problem
The AI-generated trading chart images are low quality. The user has provided 3 real supply/demand zone chart examples that should be used directly as static reference images instead.

### Changes

**1. Copy the 3 uploaded images into `src/assets/`**
- `src/assets/supply-zone-example.png` (the annotated supply zone with large bodies/small body labels)
- `src/assets/supply-demand-zones.png` (supply zone top, demand zone bottom)
- `src/assets/demand-zone-example.png` (demand zone at bottom)

**2. Update `coach-chat/index.ts` system prompt**
- Change the image offer line to: "If a visual would help, say: 'Here are some real chart examples to show you what that looks like.' Do NOT offer to generate images."
- Remove the `generateImage` code path entirely — no more AI image generation for charts

**3. Update `CoachDrawer.tsx` — replace AI image generation with static examples**
- Import the 3 chart images as static assets
- Replace `handleGenerateImage` to instead insert a message with the relevant static chart images based on the conversation context (supply zone, demand zone, or both)
- Update the auto-trigger logic: when the AI mentions "chart examples" or "show you what that looks like", auto-insert the static images
- Keep the lightbox functionality for clicking to enlarge
- Keep the responsive sizing (`max-h-[45vh]` etc.)
- Remove the camera/ImagePlus button from the composer (no more AI image gen needed)

### Files
- **Copy** 3 uploaded images to `src/assets/`
- **Edit** `supabase/functions/coach-chat/index.ts` — update prompt, remove image generation path
- **Edit** `src/components/academy/CoachDrawer.tsx` — static images instead of AI generation

