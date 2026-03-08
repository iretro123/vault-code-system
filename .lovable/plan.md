

## Why It's Slow + What We Can Do

### Root Cause
The AI image generation model (`gemini-2.5-flash-image`) takes **10-15 seconds per generation**. This is the model's processing time and cannot be eliminated. The network logs confirm ~12s round trips.

Additionally, the deployed edge function response shows only `{"url":"..."}` without the `preview` base64 field, meaning the user waits for **both** the AI generation AND the storage upload before seeing anything.

### Optimizations (3 changes)

**1. Simplify the AI prompt (shave ~2-4s)**
The current prompt is verbose with many descriptive details. A shorter, simpler prompt generates faster.

`supabase/functions/generate-avatar/index.ts`:
- Shorten style prompts from full sentences to brief keywords (e.g., `"pixel-art warrior, sword, shield, dark bg"` instead of `"a fierce pixel-art warrior character with a sword and shield, battle-ready stance"`)
- Shorten the system instruction to bare minimum

**2. Ensure base64 preview actually reaches the frontend**
The response currently only contains `url` — the `preview` field with the base64 data appears to be getting stripped. The `supabase.functions.invoke()` method may be truncating large base64 payloads. 

Fix: Skip returning the massive base64 string entirely. Instead, return only the storage URL but do the upload with `await` so the URL is valid immediately. The real bottleneck is the AI call (12s), not the upload (1-2s), so this simplifies without meaningful speed loss.

**3. Add a visual progress indicator**
Replace the generic spinner with a pulsing skeleton + estimated time text so users know the system is working.

`src/components/settings/SettingsProfile.tsx`:
- Show "Generating... ~10s" text with a pulsing skeleton placeholder
- Add a simple animated progress bar that fills over ~12s to give visual feedback

### What this achieves
- ~2-4s faster generation from simpler prompts
- Clearer feedback so the wait feels shorter
- No broken preview from missing base64 data

