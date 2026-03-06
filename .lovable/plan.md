

## Restore Mobile Bottom Nav (Hide Only on Community Chat)

### Problem
The `MobileNav` component (Menu / Academy / Settings bottom bar) is imported but **never rendered** in `AcademyLayout.tsx`. It was likely removed during a previous refactor.

### Fix — 1 file edit

**`src/components/layout/AcademyLayout.tsx`**
- Add `MobileNav` back inside the layout, right after `<CoachDrawer />`
- Use `useLocation()` (already imported) to detect if the current path is `/academy/community` — if so, hide the mobile nav
- The `MobileNav` component already has `md:hidden` so it only shows on mobile

```tsx
{/* After CoachDrawer, before closing div */}
{!location.pathname.startsWith("/academy/community") && <MobileNav />}
```

Also add bottom padding to `<main>` on mobile (except community) so content doesn't get hidden behind the nav bar — the existing `pb-6` needs to become `pb-20` on mobile when the nav is visible. We'll use a conditional class.

### No other changes needed
`MobileNav` is already correctly defined with Menu, Academy, and Settings buttons.

