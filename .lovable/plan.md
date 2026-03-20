

## Fix: Scroll to Top on Stage Change + Pipeline Audit

### Problem
When switching tabs (e.g., clicking "Start Your Day" from Live tab), the page stays scrolled to the bottom because no scroll-to-top is triggered on stage change.

### Fix 1 — Scroll to top on stage change (`AcademyTrade.tsx`)
Add a `useEffect` that watches `activeStage` and scrolls the `<main>` scroll container to the top:

```tsx
useEffect(() => {
  const main = document.querySelector("main");
  if (main) main.scrollTo({ top: 0, behavior: "smooth" });
}, [activeStage]);
```

This covers all stage transitions: tab clicks, "Start Your Day" button, "Go Live" button, "View Insights" button, etc.

### Fix 2 — Pipeline consistency checks
Audit all `setStage()` call sites to ensure they don't have conflicting scroll or timing issues:
- Line ~783: "Let's Start Live Trading" → `setStage("live")` ✓
- Line ~818: Lock rules → `setTimeout(() => setStage("live"), 300)` — scroll will fire after the 300ms delay ✓
- Line ~1085: "Start Your Day" from Live → `setStage("plan")` ✓
- Line ~1123: End session → `setStage("review")` ✓
- Line ~1144: "View Insights" → `setStage("insights")` ✓
- Line ~473: Check-in complete → `setTimeout(() => setStage("insights"), 600)` ✓

All paths will be covered by the single `useEffect` on `activeStage`.

### Files changed
- `src/pages/academy/AcademyTrade.tsx` — add one `useEffect` (~3 lines)

