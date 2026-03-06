

## Bug: "useSidebar must be used within a SidebarProvider"

### Root Cause

The error is in `MobileNav.tsx` (line 13): it calls `useSidebar()` which requires a `SidebarProvider` ancestor. Here are the 5 reasons this crash can occur:

### 5 Reasons This Is Happening

1. **`AppLayout` has no `SidebarProvider`** — `AppLayout.tsx` renders `<MobileNav />` but never wraps anything in `<SidebarProvider>`. Non-academy routes (`/cockpit`, `/log`, `/vault-log`, `/reports`, `/settings`) all use `AppLayout`, so visiting any of them crashes instantly.

2. **`MobileNav` unconditionally calls `useSidebar()`** — Line 13 calls `const { toggleSidebar } = useSidebar()` with no guard or fallback. If no provider exists in the tree, React throws immediately.

3. **Direct URL access to non-academy routes** — If a user bookmarks or navigates directly to `/cockpit`, `/log`, `/settings`, or `/reports`, they hit `AppLayout` → `MobileNav` → crash. These routes bypass `AcademyLayout` entirely.

4. **The Index/Hub redirect may briefly render AppLayout** — Routes like `/` and `/hub` redirect to `/academy`, but if any intermediate render touches `AppLayout` components before the redirect completes, the same crash can occur.

5. **`AcademyLayout` works fine** — The academy routes are NOT affected because `AcademyLayout` wraps everything in `<SidebarProvider>` (line 144-148). The bug is isolated to the non-academy layout path.

### Fix

**One change to `MobileNav.tsx`**: Remove the `useSidebar()` dependency. Since `MobileNav` is used both inside and outside `SidebarProvider`, it should not rely on sidebar context. Replace the Menu button's `toggleSidebar` call with a simple navigation link to `/academy/home`, or wrap the `useSidebar` call in a try-catch/optional hook pattern.

Alternatively, wrap `AppLayout` in a `SidebarProvider` — but since `AppLayout` doesn't use a sidebar, the cleaner fix is to remove the sidebar dependency from `MobileNav`.

### Files to change

| File | Change |
|------|--------|
| `src/components/layout/MobileNav.tsx` | Remove `useSidebar()` import/call. Replace Menu button with a direct link to `/academy/home` or remove it entirely since non-academy pages don't have a sidebar to toggle. |

