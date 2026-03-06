

## Dim "VaultOS" to Match Surrounding Text Color

### Change — 1 file

**`src/pages/academy/AcademySupport.tsx` (line 23)**

Change "Vault" from `text-foreground` (full white) to `text-muted-foreground` (matching paragraph), and keep "OS" as `text-primary` but at reduced opacity. Both keep `font-semibold` so they still stand out by weight, just not by brightness.

- "Vault" → `text-muted-foreground font-semibold`
- "OS" → `text-primary/70 font-semibold`

This keeps the brand styling visible but blends better with the paragraph tone.

