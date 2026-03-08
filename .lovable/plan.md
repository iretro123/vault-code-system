

## Make Session Type Cards Compact on Desktop

The cards currently have a `h-[220px]` image area + generous `p-6` padding + 4 bullet points, making them tall. On desktop where all 3 sit side-by-side, they dominate the viewport.

### Changes — `src/pages/academy/AcademyLive.tsx`

1. **Reduce image height**: `h-[220px]` → `h-[150px]`
2. **Tighten card padding**: `p-6` → `p-5`
3. **Compact bullet spacing**: `space-y-2.5 mb-5` → `space-y-1.5 mb-4`
4. **Smaller text**: Title `text-lg` → `text-[15px]`, subtitle margin `mb-4` → `mb-3`
5. **Tighter footer**: `pt-4` → `pt-3`
6. **Reduce grid gap**: `gap-5` → `gap-4`

This makes the cards ~30% shorter vertically while keeping the premium feel. The image still shows enough to be cinematic, and the content stays readable.

