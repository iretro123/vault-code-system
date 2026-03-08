

## Fix: Show a placeholder preview when AI Pixel Art mode is selected (before generation)

### Problem
When the user selects "AI Pixel Art" tab, the avatar preview still shows their initials because `avatarMode` is set to `"ai"` but `renderAvatar()` has no case for `"ai"` — it falls through to the initials default.

### Solution
Add an `"ai"` case to the `renderAvatar()` function that shows:
- If `aiPreviewUrl` exists → show the generated image (already works after generation)
- If no preview yet → show a placeholder state (e.g., a styled box with a Sparkles icon and the selected style label, using the selected color)

### Changes

**`src/components/settings/SettingsProfile.tsx`**

1. **`renderAvatar()` (~line 195)** — Add a case before the initials fallback:
   ```
   if (avatarMode === "ai") {
     if (aiPreviewUrl) {
       return <img src={aiPreviewUrl} alt="AI Avatar" className="h-20 w-20 rounded-2xl object-cover" />;
     }
     return (
       <div className="h-20 w-20 rounded-2xl flex flex-col items-center justify-center bg-muted/30 border border-dashed border-muted-foreground/20">
         <Sparkles className="h-6 w-6 text-muted-foreground/40" />
         <span className="text-[9px] text-muted-foreground/40 mt-1">Generate</span>
       </div>
     );
   }
   ```

2. **Hide color swatches when in AI mode** — The color picker row (~line 227) currently shows for all non-image modes including `"ai"`. Add `&& avatarMode !== "ai"` to the condition so colors only show for initials/icon modes.

That's it — two small edits, no logic changes to generation or saving.

