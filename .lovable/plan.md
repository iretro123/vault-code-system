

## Bug: Learn Section Missing Admin/Coach Edit Controls

### Root Cause

Both `AcademyLearn.tsx` and `AcademyModule.tsx` use `useAcademyRole().isAdmin` to gate all admin controls (edit/hide/delete buttons). This has two problems:

1. **Admin Mode toggle is ignored** — The global Admin Mode system (`useAdminMode()`) is not wired into these pages. Admin controls show regardless of whether the user toggled Admin Mode on via the profile dropdown. Every other page (Live, Community, etc.) uses `useAdminMode().isAdminActive`.

2. **Coach and Operator roles are excluded** — `useAcademyRole().isAdmin` only returns `true` for CEO and Admin roles. Coaches and Operators with `manage_content` permission never see edit buttons, even though they should.

### Fix

Replace `useAcademyRole().isAdmin` with the correct pattern used elsewhere in the app:

```text
Before:  const { isAdmin } = useAcademyRole();
After:   const { isAdminActive } = useAdminMode();
         const { hasPermission } = useAcademyPermissions();
         const canManageContent = isAdminActive && hasPermission("manage_content");
```

Then replace every `isAdmin` reference in both files with `canManageContent`.

### Files to Change

| File | Change |
|------|--------|
| `src/pages/academy/AcademyLearn.tsx` | Replace `useAcademyRole` with `useAdminMode` + `useAcademyPermissions`. Replace all `isAdmin` → `canManageContent`. |
| `src/pages/academy/AcademyModule.tsx` | Same replacement. All edit/delete/add/hide controls gated behind `canManageContent`. |

### Result
- Admin/Coach/Operator with `manage_content` permission will see edit buttons (title, YouTube URL, study notes, visibility toggle) **only when Admin Mode is toggled ON**
- Members and admins with Admin Mode OFF see a clean student view
- No database changes needed — permissions already exist in the `academy_role_permissions` table

