

## Fix: Auto-close sidebar on mobile when tapping a nav item

### Problem
On mobile, tapping a sidebar nav link navigates to the page but the sidebar stays open as an overlay, requiring a manual close. This feels broken — iOS-style navigation should dismiss the menu instantly on selection.

### Solution

Add an `onClick` handler to each `NavLink` in `AcademySidebar.tsx` that calls `setOpenMobile(false)` when on mobile. The sidebar context already exposes `setOpenMobile` and `isMobile` via `useSidebar()`.

**`src/components/layout/AcademySidebar.tsx`** — two changes:

1. **Destructure `setOpenMobile` and `isMobile`** from `useSidebar()` (line ~80, already using `state` and `toggleSidebar`)

2. **Add `onClick` to every `NavLink`** (the regular nav items around line 233, and the Start link around line 167):
   ```tsx
   onClick={() => { if (isMobile) setOpenMobile(false); }}
   ```

3. **Also close on Search button tap** (line 142) — same pattern.

This is the same approach already used for the "Ask Coach" button (which calls `toggleSidebar()` on mobile). Using `setOpenMobile(false)` is more precise since it only affects the mobile sheet.

No other files need changes.

