

## Auto-Generate Avatar on Style Selection

### Problem
User must click "Generate Avatar" button after selecting a style — feels clunky. They want selecting a style chip to immediately trigger generation.

### Changes

**`src/components/settings/SettingsProfile.tsx`**

1. **Style chip click triggers generation** — Change the `onClick` for each AI style chip to call `handleGenerate` with that style directly, instead of just setting state:
   ```tsx
   onClick={() => {
     setAiStyle(s.id);
     handleGenerate(s.id);
   }}
   ```

2. **Update `handleGenerate` to accept a style parameter** — Change signature from `handleGenerate()` to `handleGenerate(style?: string)` and use `style || aiStyle` inside the function body.

3. **Remove the Generate/Regenerate button block** — Delete lines 310-328 (the `<Button>` with Generate/Regenerate). The style chips now serve as the trigger.

4. **Update helper text** — Change the `aiPreviewUrl` hint from "Like it? Hit Save Profile..." to "Tap another style to regenerate. Save Profile below to keep it."

5. **Auto-generate on first entering AI mode** — When user clicks the "AI Pixel Art" tab, auto-generate with the current `aiStyle` if no preview exists yet. Add to the mode button click:
   ```tsx
   onClick={() => {
     setAvatarMode("ai");
     if (!aiPreviewUrl) handleGenerate();
   }}
   ```

6. **Show loading state on preview** — Update `renderAvatar()` AI case: when `generating` is true, show a spinner overlay on the preview square instead of the static placeholder.

Result: Selecting "AI Pixel Art" immediately generates. Clicking any style chip regenerates instantly. No extra button needed.

