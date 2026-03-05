

## Final Conclusion — Root Cause (100% Confidence)

The provisioning **never runs**. Here is the exact chain of failure:

1. **Signup.tsx line 128-131**: After signup, the client calls `allowed_signups.update({ claimed: true })`. The newly registered user is **not an operator** — the only UPDATE policy on `allowed_signups` requires `has_role(auth.uid(), 'operator')`. **RLS silently blocks it.** `claimed` stays `false`.

2. **provision-manual-access line 34**: The edge function checks `.eq("claimed", true)`. Since step 1 failed, no row matches. It returns `{ provisioned: false, reason: "not_whitelisted" }` and exits. **No `students` or `student_access` rows are ever created.**

3. **AcademyLayout line 31**: `showBlockModal` only triggers for `past_due` or `canceled`. The user has `status: "none"` (no records exist), so no block modal appears — but `hasAccess` is `false`, so content is gated/empty.

**Result**: The user sees the Academy shell but everything says "join" or is locked.

---

## Fix (3 files)

### 1. `supabase/functions/provision-manual-access/index.ts`
- Change line 34 from `.eq("claimed", true)` to `.eq("claimed", false)` — find the **unclaimed** whitelist entry
- After finding it, set `claimed = true` via service role (bypasses RLS)
- After creating `student_access`, also update `profiles.access_status = 'active'`

### 2. `src/pages/Signup.tsx`
- **Delete** lines 126-134 (the client-side `allowed_signups.update({ claimed: true })`) — it always fails due to RLS and is now handled server-side
- After the provision call, clear `localStorage.removeItem("va_cache_student_access")` so the hook fetches fresh state
- Check the provision response and surface errors via toast

### 3. `src/components/layout/AcademyLayout.tsx`
- Change line 31 to also block on `accessStatus2 === "none"`:
  ```
  const showBlockModal = !isAdminBypass && 
    (accessStatus2 === "past_due" || accessStatus2 === "canceled" || accessStatus2 === "none");
  ```
- This ensures users with failed provisioning see a proper "reactivate" modal instead of an empty shell

