

## Fix: Icon Invisible in Avatar Preview (Color Opacity Bug)

**Root cause:** `AVATAR_COLORS` uses HSL strings like `"hsl(180, 55%, 42%)"`. The code does `avatarColor + "22"` to create a transparent background, producing `"hsl(180, 55%, 42%)22"` — which is **invalid CSS**. Some browsers parse it as the solid color (ignoring the trailing "22"), so the background becomes the same solid color as the icon fill, making the icon invisible.

**Fix:** Replace the string concatenation `avatarColor + "22"` with a proper HSL alpha value by converting `hsl(x, y%, z%)` → `hsla(x, y%, z%, 0.13)`.

### Files

**`src/components/settings/SettingsProfile.tsx`** — line 177: change `backgroundColor: avatarColor + "22"` to use a helper that produces valid HSLA.

**`src/components/academy/AcademyProfileForm.tsx`** — same fix for the avatar preview there.

**`src/lib/chatAvatars.tsx`** — same pattern with `+ "33"`, fix to proper alpha (0.2).

Add a small utility function (inline or shared) like:
```ts
function withAlpha(hsl: string, alpha: number): string {
  return hsl.replace(")", `, ${alpha})`).replace("hsl(", "hsla(");
}
```

Then use `withAlpha(avatarColor, 0.13)` instead of `avatarColor + "22"`.

**3 files, small targeted edits.**

