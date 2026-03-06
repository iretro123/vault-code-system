

## Why the page crashes/goes white on resize

### Root Cause

When you resize the browser window across the 768px breakpoint, `useIsMobile()` toggles between `true` and `false`. This causes the `Sidebar` component to **completely swap its rendering** between:
- **Desktop**: a static `<div>` sidebar column
- **Mobile**: a `<Sheet>` (portal-based overlay)

This swap **unmounts and remounts the entire sidebar tree** including all its children, state, and event listeners. When resizing quickly (dragging the window edge), this toggle fires rapidly, causing cascading unmount/remount errors that hit the `ErrorBoundary` — resulting in the white "Something went wrong" screen.

Additionally, `useIsMobile()` initializes as `undefined` (coerced to `false`), so the very first render always assumes desktop, then potentially flips to mobile — causing an extra reflow.

### Solution

**Debounce the `useIsMobile` hook** so rapid resize events don't cause rapid state toggles. Also initialize with a synchronous value to avoid the initial flip.

### Changes

**`src/hooks/use-mobile.tsx`**
- Initialize `isMobile` synchronously from `window.innerWidth` (no `undefined` first render)
- Debounce the state update by ~150ms so dragging the window doesn't trigger dozens of mobile/desktop swaps
- This prevents the `Sidebar` component from rapidly switching between Sheet and div rendering

```tsx
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(
    () => window.innerWidth < MOBILE_BREAKPOINT // sync init, no undefined
  );

  React.useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
      }, 150);
    };
    mql.addEventListener("change", onChange);
    return () => {
      mql.removeEventListener("change", onChange);
      clearTimeout(timeoutId);
    };
  }, []);

  return isMobile;
}
```

This is a single-file fix that eliminates the crash without touching any layout or sidebar code.

| File | Change |
|------|--------|
| `src/hooks/use-mobile.tsx` | Sync init + debounced resize handler |

