

## Add Imbalance Definition + Example Image to Coach Chat

### Changes

**1. Copy the uploaded imbalance image to `src/assets/`**
- Save `user-uploads://Screenshot_2026-03-03_at_1.45.13 AM.png` as `src/assets/imbalance-example.png`

**2. Update `CoachDrawer.tsx`**
- Import `imbalanceImg` from the new asset
- Add a separate `IMBALANCE_EXAMPLES` array (or extend existing logic) so when the AI mentions imbalances, the imbalance chart is shown
- Add a new trigger phrase set: `"imbalance example"`, `"what imbalances look like"`, `"imbalance chart"` — when detected in AI response, auto-insert the imbalance image

**3. Update `coach-chat/index.ts` system prompt**
- Add a `KNOWLEDGE` section with the imbalance definition, simplified and easy to understand:

> "Imbalances (also called inefficiencies) happen when smart money places massive buy or sell orders that overwhelm the other side. There aren't enough buyers to match the sellers (or vice versa), so price moves fast in one direction — leaving a gap. When price comes back to that gap later, it usually slows down, consolidates, and often reverses. Think of it as an 'unfinished business' zone the market needs to revisit."

- Add a trigger phrase rule: when explaining imbalances visually, say exactly: "Here's a real chart showing what an imbalance looks like." — the app will auto-show the example image.

### Files
- **Copy** uploaded image to `src/assets/imbalance-example.png`
- **Edit** `supabase/functions/coach-chat/index.ts` — add imbalance knowledge to system prompt + new trigger phrase
- **Edit** `src/components/academy/CoachDrawer.tsx` — import imbalance image, add auto-trigger for imbalance examples

