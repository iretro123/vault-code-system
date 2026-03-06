

## Plan: Full user deletion (hard delete, not soft revoke)

### Problem
The current "Remove" action only sets `access_status = "revoked"` — it does **not** delete any records. The user's `profiles`, `students`, `student_access`, and `allowed_signups` rows all remain. This means:
- They still show in the Members list (profile exists)
- Re-adding them fails because `allowed_signups` is still marked `claimed: true`
- Their account is blocked but not cleaned up

### Why we need an Edge Function
The `profiles` table has **no DELETE RLS policy** — only owners and operators can UPDATE. Deleting across `profiles`, `students`, `student_access`, `allowed_signups`, `academy_user_roles`, and `lesson_progress` requires service-role access. A single edge function handles this cleanly and securely.

### Solution

**1. New Edge Function: `supabase/functions/admin-delete-user/index.ts`**
- Accepts `{ target_user_id: string }` from an authenticated operator
- Verifies the caller has the `operator` app role (via `user_roles` table check)
- Deletes rows from (in order):
  - `student_access` (via `students.auth_user_id` lookup)
  - `students`
  - `allowed_signups` (by email, resets `claimed` to false OR deletes)
  - `academy_user_roles`
  - `lesson_progress`
  - `playbook_progress`
  - `profiles`
- Returns `{ deleted: true }`

**2. Update `src/components/admin/AdminMembersTab.tsx`**
- Replace the current `handleKick` logic with a call to `supabase.functions.invoke("admin-delete-user", { body: { target_user_id: userId } })`
- On success, filter the user out of local state
- Update the confirm dialog copy to say "Permanently delete" instead of "Remove"

### Files
1. `supabase/functions/admin-delete-user/index.ts` — new edge function for hard delete
2. `src/components/admin/AdminMembersTab.tsx` — wire kick/remove to call the edge function

