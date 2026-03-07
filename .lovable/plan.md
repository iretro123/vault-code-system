

## Cross-Device Compatibility Fix (iOS/Android 2020+)

### Current State

The app already has the `URL.parse` polyfill. After auditing the codebase, here are the remaining compatibility risks for phones from 2020 (iOS 13–14, Android 10–11, Chrome 80–90, Safari 13–14):

### Issues Found

**1. No Vite build target set — defaults to `esnext`**
Vite's default build target is `esnext`, meaning modern syntax like optional chaining (`?.`), nullish coalescing (`??`), and other ES2022+ features may ship untranspiled. Older browsers (Safari 13, Chrome 80) will crash on these.

**Fix:** Add `build.target: "es2020"` in `vite.config.ts`. This tells esbuild to downlevel syntax to ES2020, which covers iOS 13.4+ and Android Chrome 80+.

**2. `navigator.clipboard.writeText()` used without fallback**
Used in ~10 places across the app. This API requires a secure context AND user gesture. On older Android WebViews or non-HTTPS contexts it throws. Not a crash-level issue, but copy buttons silently fail.

**Fix:** Create a small `copyToClipboard` utility that tries `navigator.clipboard.writeText` first, then falls back to the legacy `document.execCommand('copy')` approach. Replace all direct `navigator.clipboard` calls.

**3. `crypto.randomUUID()` in edge functions**
This is server-side (Deno), not client-side — no issue for device compatibility.

**4. `ResizeObserver` in `HeroHeader.tsx`**
Used for canvas sizing. `ResizeObserver` is supported in iOS 13.4+ and Chrome 76+, so 2020 phones are covered. No fix needed.

**5. Missing mobile viewport meta tags**
The viewport tag exists but lacks `viewport-fit=cover` for iPhones with notches (iPhone X onward, 2017+). This causes content to be clipped behind the notch/home indicator.

**Fix:** Update viewport meta + add `apple-mobile-web-app` tags to `index.html`.

### Changes

| File | Change |
|------|--------|
| `vite.config.ts` | Add `build: { target: "es2020" }` to ensure syntax is downleveled for 2020-era browsers |
| `index.html` | Add `viewport-fit=cover`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, and theme-color meta tags |
| `src/lib/copyToClipboard.ts` | New utility: tries `navigator.clipboard.writeText`, falls back to `execCommand('copy')` |
| 10 files using `navigator.clipboard` | Replace direct calls with the new `copyToClipboard()` utility |

### Not Needed
- No problematic newer JS APIs (`structuredClone`, `Object.groupBy`, `.at()`, etc.) found in client code
- `ResizeObserver` is safe for the target range
- CSS features used (Tailwind) compile down fine
- `react-pdf` polyfill already in place

