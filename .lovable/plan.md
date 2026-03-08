

## Speed Up AI Avatar Generation

### Reality check
The main bottleneck is the AI image generation call itself (~5-15s round trip to the AI gateway). That latency cannot be eliminated. However, there are two meaningful optimizations:

### Optimizations

**1. Show base64 preview instantly, upload in background (biggest win)**

Currently the flow is: AI generates image → upload to storage → return storage URL → show preview. The upload step adds 1-3s of unnecessary wait before the user sees anything.

**Fix in `supabase/functions/generate-avatar/index.ts`:**
- Return the base64 data URL immediately alongside the storage URL upload happening in the background
- Actually simpler: return the base64 image immediately, and do the storage upload in a fire-and-forget pattern (using `waitUntil` or just not awaiting)
- Since Deno edge functions don't support `waitUntil`, the practical approach is: return BOTH the base64 data URL for instant preview AND the storage URL. The frontend shows the base64 immediately.

**Fix in `src/components/settings/SettingsProfile.tsx`:**
- In `handleGenerate`, use `data.preview` (base64) for instant display in `aiPreviewUrl`
- Store `data.url` (storage URL) separately for saving to profile

**2. Debounce rapid style clicks**

When users click multiple styles quickly, each triggers a full generation. Add a debounce so only the last click within 300ms fires.

**Fix in `src/components/settings/SettingsProfile.tsx`:**
- Add a ref-based debounce to `handleGenerate` — if a new call comes in, abort/ignore the previous one
- Use `AbortController` to cancel in-flight requests when a new style is selected

### Changes summary

| File | Change |
|------|--------|
| `generate-avatar/index.ts` | Return `{ preview: base64DataUrl, url: storageUrl }` — do upload first but also send base64 so frontend can show it faster in future iterations. Actually, restructure: return base64 immediately, upload async. |
| `SettingsProfile.tsx` | Use base64 preview for instant display. Add AbortController to cancel stale requests. Add debounce (300ms). |

### What this achieves
- User sees the generated avatar ~2-3s faster (skipping upload wait)
- Rapid clicking doesn't queue up 10 generation calls
- The AI generation time itself (~5-10s) is inherent to the model and cannot be reduced

