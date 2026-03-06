

## Confirmed Root Cause

There are **two compounding issues**:

### Issue 1: Race condition — permissions resolve AFTER access status
- `useStudentAccess` resolves quickly (especially from localStorage cache) and returns `status: "canceled"` or `"none"` — because `test@vault.dev` has no active Stripe subscription in the `student_access` table.
- `useAcademyPermissions` takes longer (3 DB queries). Until it sets `resolved: true`, the `isAdminBypass` flag is `false`.
- In `AcademyLayout.tsx` line 31, the block modal shows immediately because `!isAdminBypass` is true during this window.

### Issue 2: Bypass is too narrow
- Line 107 of `useStudentAccess.ts`: `adminBypass = permResolved && (isCEO || isOperator)`
- This only covers CEO and Operator roles. **Admin and Coach roles are NOT bypassed.**

### Issue 3: Loading state doesn't wait for permissions
- Line 114: `loading: state.loading` — only reflects the RPC fetch, not whether permissions have resolved.
- `AcademyLayout.tsx` line 31 doesn't check `loading` at all, so the modal renders before the full picture is ready.

---

## Solution (2 files)

### `src/hooks/useStudentAccess.ts`
1. Destructure `isAdmin` and `isCoach` from `useAcademyPermissions()`
2. Expand bypass: `adminBypass = permResolved && (isCEO || isAdmin || isCoach || isOperator)`
3. Return combined loading: `loading: state.loading || !permResolved`

### `src/components/layout/AcademyLayout.tsx`
1. Destructure `loading: accessLoading` from `useStudentAccess()`
2. Update modal gate: `const showBlockModal = !accessLoading && !isAdminBypass && (...)`

This ensures:
- The modal never flashes while roles are still loading
- All leadership roles (CEO, Admin, Coach, Operator) fully bypass Stripe gating
- Regular members still see the modal correctly when their subscription is canceled/past_due/none

