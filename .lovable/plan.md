

## Fix: Close Sidebar When "Ask Coach" Is Tapped

**Problem:** On mobile, tapping "Ask Coach" in the sidebar opens the CoachDrawer, but the sidebar stays open on top of it.

**Fix:** In `src/components/layout/AcademySidebar.tsx`, close the sidebar before dispatching the coach drawer event.

**Change (line 191):**
- Currently: `onClick={() => window.dispatchEvent(new CustomEvent("toggle-coach-drawer"))}`
- Updated: Call `toggleSidebar()` first (which is already available via the `useSidebar` hook on line 69), then dispatch the coach event — but only on mobile. Use a small `setTimeout` so the sidebar closes before the drawer opens.

```tsx
onClick={() => {
  // Close sidebar on mobile before opening coach
  if (window.innerWidth < 768) {
    toggleSidebar();
    setTimeout(() => window.dispatchEvent(new CustomEvent("toggle-coach-drawer")), 150);
  } else {
    window.dispatchEvent(new CustomEvent("toggle-coach-drawer"));
  }
}}
```

**One file changed:** `src/components/layout/AcademySidebar.tsx` — the Ask Coach button's `onClick` handler (around line 191).

