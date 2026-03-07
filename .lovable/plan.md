

## Fix: `URL.parse is not a function` crash on older browsers

### Problem
`react-pdf` v10.x calls `URL.parse()`, which doesn't exist in Safari < 17 and some older mobile browsers, crashing the app.

### Fix
Add a 6-line `URL.parse` polyfill at the top of `src/main.tsx`, before React mounts. Safe, global, no side effects on modern browsers.

```typescript
if (typeof URL.parse !== "function") {
  (URL as any).parse = (url: string, base?: string) => {
    try { return new URL(url, base); }
    catch { return null; }
  };
}
```

One file changed: `src/main.tsx` — insert polyfill before the existing imports/render call.

