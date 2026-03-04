

## Fix Icon Selection & Add Cool Avatar Icons

Two issues to address:
1. **Fix icon selection** — the icon picker buttons in Settings appear to work code-wise, but the `pointer-events-none` on the inner `<span>` wrapping the SVG may be swallowing clicks on some browsers. Need to verify and ensure the click handler fires reliably.
2. **Expand the icon library** with a mix of gaming, trading, and abstract avatar icons.

### Changes to `src/components/settings/SettingsProfile.tsx`

**Fix:** Remove `pointer-events-none` from the icon `<span>` wrapper (line 238) — this shouldn't cause issues since the parent button handles clicks, but some touch targets may be affected. Also ensure `type="button"` is present (it already is in `AcademyProfileForm` but missing in `SettingsProfile`).

**Add new icons to `GEOMETRIC_ICONS`** — expand from 6 to ~18 icons with a mix of styles:

| Category | Icons |
|----------|-------|
| **Gaming** | controller, shield, sword, crown, lightning |
| **Trading** | candle, target, rocket, bull |
| **Abstract** | star, wave, grid, ring, eye |

Each icon is a simple SVG viewBox="0 0 40 40" using `currentColor` with opacity layers (same pattern as existing icons).

### Changes to `src/components/academy/AcademyProfileForm.tsx`

Mirror the same expanded `GEOMETRIC_ICONS` array and the same `pointer-events-none` fix.

### Changes to `src/lib/chatAvatars.tsx`

Add the same new icon IDs to the `GEOMETRIC_ICONS` record so they render correctly in chat.

### Layout tweak

With 18+ icons, wrap the icon grid better — change from `flex gap-1.5 flex-wrap` to a CSS grid: `grid grid-cols-6 gap-1.5` so the picker stays tidy.

**Files:** 3 edits (`SettingsProfile.tsx`, `AcademyProfileForm.tsx`, `chatAvatars.tsx`)

