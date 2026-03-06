

## Diagnosis: Tab-to-tab glitch (sidebar + header flicker)

### Root Cause

**AcademyLayout remounts on every route change.** Each academy page (AcademyHome, AcademyTrade, AcademyLive, etc.) wraps itself with `<AcademyLayout>` individually. When you click a sidebar tab, React unmounts the old page's `<AcademyLayout>` and mounts a new one. This causes:

1. The sidebar, header, and PlayerIdentity all unmount and remount — visible as a brief flicker/glitch
2. `useStudentAccess` and `useAcademyPermissions` (plain hooks, not shared context) re-initialize fresh state on each mount, triggering new DB queries
3. The `loading` state briefly becomes `true` during remount, causing the header/sidebar to re-render with loading states
4. Console logs confirm: dozens of duplicate `[AccessGate] Fetching access` calls on every navigation

The "Vault OS" tab glitches more noticeably because `TraderCockpit` is a heavier component that takes longer to mount.

### Solution: Layout Route pattern

Convert `AcademyLayout` from a per-page wrapper into a **single persistent layout route** using React Router's `<Outlet>`. This means the sidebar, header, and all shared hooks mount **once** and persist across tab changes — only the inner content swaps.

### Changes

**1. `src/components/layout/AcademyLayout.tsx`**
- Replace `children` prop with React Router `<Outlet>`
- Layout stays mounted across all `/academy/*` routes

```tsx
import { Outlet } from "react-router-dom";
// Remove children prop, use <Outlet /> in place of {children}
```

**2. `src/App.tsx`**
- Restructure academy routes to use a parent layout route with nested child routes
- Each academy page becomes a child `<Route>` under the layout

```tsx
<Route path="/academy" element={<AcademyLayout />}>
  <Route index element={<Navigate to="home" replace />} />
  <Route path="home" element={<AcademyHome />} />
  <Route path="trade" element={<AcademyTrade />} />
  <Route path="community" element={<AcademyCommunity />} />
  {/* ... all other academy routes */}
</Route>
```

**3. All ~20 academy page files** (AcademyHome, AcademyTrade, AcademyLearn, etc.)
- Remove the `<AcademyLayout>` wrapper from each page's return statement
- Pages just render their own content directly

For example, `AcademyVaultOS.tsx` changes from:
```tsx
return (
  <AcademyLayout>
    <FeatureFlagGate pageKey="vault-os">
      <TraderCockpit />
    </FeatureFlagGate>
  </AcademyLayout>
);
```
To:
```tsx
return (
  <FeatureFlagGate pageKey="vault-os">
    <TraderCockpit />
  </FeatureFlagGate>
);
```

### What this fixes
- Sidebar no longer unmounts/remounts on tab change — zero flicker
- PlayerIdentity (top-right name + badge) stays mounted — no glitch
- `useStudentAccess` and `useAcademyPermissions` run once, not on every navigation
- Eliminates the dozens of duplicate `[AccessGate] Fetching` calls in console
- Faster tab transitions since only the content area swaps

### Files to modify
| File | Change |
|------|--------|
| `src/components/layout/AcademyLayout.tsx` | Replace `children` with `<Outlet>` |
| `src/App.tsx` | Nest academy routes under layout route |
| ~20 academy page files | Remove `<AcademyLayout>` wrapper |

