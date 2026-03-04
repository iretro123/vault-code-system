

## Fix: Icon Not Appearing in Avatar Preview Box

**Root cause:** The icon SVGs have `className="h-full w-full"` which, inside a flex container with `items-center justify-center`, doesn't constrain properly — the SVG either collapses or renders at an unexpected size, making the icon invisible in the preview.

**Fix in `src/components/settings/SettingsProfile.tsx`** (renderAvatar, icon branch ~line 177):
- Wrap `{icon.svg}` in a sized `<div className="h-12 w-12">` so the SVG has explicit dimensions to fill

**Same fix in `src/components/academy/AcademyProfileForm.tsx`** — find the equivalent avatar preview rendering and apply the same wrapper.

**2 file edits, 1-line change each.**

