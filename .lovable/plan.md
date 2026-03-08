

## AI-Generated Pixel Art Avatars

### Overview
Add a new avatar mode where users can generate unique pixel-art gaming avatars using Lovable AI's image generation. Users click "Generate" to get a random avatar, can regenerate until they find one they like, then save it.

### Architecture

```text
User clicks "Generate"
  → Edge function (generate-avatar/index.ts)
    → Lovable AI (gemini-2.5-flash-image) with pixel art prompt
    → Returns base64 image
  → Upload to storage bucket (avatars/)
  → Display in avatar picker
  → Save URL to profile on confirm
```

### Changes

**1. Edge Function: `supabase/functions/generate-avatar/index.ts`**
- Accepts a style hint (e.g. "warrior", "mage", "dragon", "samurai", "knight")
- Calls Lovable AI image generation with a prompt like: *"Pixel art avatar icon, 64x64, [style], dark background, retro gaming style, no text"*
- Returns the base64 image
- Then uploads to the `avatars` storage bucket under the user's folder
- Returns the public URL

**2. Update `supabase/config.toml`**
- Add `[functions.generate-avatar]` with `verify_jwt = false`

**3. Update `src/components/settings/SettingsProfile.tsx`**
- Add a 4th avatar mode tab: "AI Pixel Art" alongside Initials / Icon / Photo
- Show a grid of style presets (Warrior, Mage, Samurai, Dragon, Knight, Ninja, Bull, Bear, Phoenix, Skull) as clickable chips
- "Generate" button calls the edge function with the selected style
- Shows loading spinner during generation (~3-5 seconds)
- Preview the result; user can regenerate or confirm
- On confirm, saves the public URL as `avatar_url`

**4. Update `src/lib/chatAvatars.tsx`**
- Already supports `image` mode via HTTP URLs, so no changes needed — generated avatars will render automatically in chat

### Style Presets (10 options)
Warrior, Mage, Samurai, Dragon, Knight, Ninja, Bull, Bear, Phoenix, Skull

Each generates a unique pixel-art character avatar with the selected theme.

### Technical Notes
- Uses `LOVABLE_API_KEY` (already provisioned) — no user setup needed
- Images stored in existing `avatars` bucket
- Rate limit: one generation at a time per user, button disabled during generation
- Generated images are ~640x640 WebP, same as photo uploads

