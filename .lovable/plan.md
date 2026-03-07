

## Bug: Admin Mode Race Condition + Missing Coach Permission

### What You're Seeing
You have Admin Mode ON (stored in localStorage), but edit controls never appear. The code changes from the last fix are correct — the real bug is deeper, in `AdminModeContext.tsx`.

### Root Cause: Race Condition in AdminModeContext

**Line 41 of `AdminModeContext.tsx`:**
```ts
const [adminModeOn, setAdminModeOn] = useState(() => canToggle && readFlag(STORAGE_KEY));
```

`canToggle` depends on `useAcademyPermissions()`, which loads async (DB query). On first render, permissions haven't loaded, so `canToggle = false`. The `useState` initializer only runs **once**, so `adminModeOn` permanently initializes to `false` — even though localStorage says `"1"`.

Result: Admin Mode is always OFF after any page load/refresh, so `isAdminActive` is always `false`, so `canManageContent` is always `false`, so no edit buttons ever render.

### Secondary Issue: Coach Role Missing `manage_content`

The DB shows Coach has `coach_reply`, `manage_live_sessions`, `moderate_chat`, `view_admin_panel` — but **not** `manage_content`. Per your project rules, Coaches should be able to edit videos/notes.

### Fix Plan

| # | What | Where |
|---|------|-------|
| 1 | **Fix race condition** — add a `useEffect` that syncs `adminModeOn` from localStorage when `canToggle` transitions to `true` | `src/contexts/AdminModeContext.tsx` |
| 2 | **Grant Coach `manage_content`** permission | DB migration |
| 3 | **Add AdminActionBar** to AcademyModule page for consistency with AcademyLearn | `src/pages/academy/AcademyModule.tsx` |

### Fix Detail

**AdminModeContext.tsx** — add after state declarations:
```ts
// Sync admin mode from localStorage once permissions resolve
useEffect(() => {
  if (canToggle && readFlag(STORAGE_KEY) && !adminModeOn) {
    setAdminModeOn(true);
  }
}, [canToggle]);
```

**DB migration** — add `manage_content` to Coach role:
```sql
INSERT INTO academy_role_permissions (role_id, permission_key)
SELECT id, 'manage_content' FROM academy_roles WHERE name = 'Coach'
ON CONFLICT DO NOTHING;
```

**AcademyModule.tsx** — add `AdminActionBar` import and render it below the top bar for inline admin actions (Add Lesson, etc.) when admin mode is active.

